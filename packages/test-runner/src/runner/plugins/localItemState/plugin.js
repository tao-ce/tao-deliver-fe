// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { get } from 'svelte/store';
import { mount, unmount } from 'svelte';
import pluginFactory from 'taoTests/runner/plugin';
import { waitForResponsePromises } from '../../util/response.js';
import { getAllowLateSubmission } from '../../util/testContext.js';
import { excludeMediaInteractions, isResponseChanged, reduceStateToResponses } from '../../session/attempt.js';
import { LiveSaveIndicator, getLiveSaveStore, liveSaveStatuses } from '@oat-sa-private/ui-components';
import { getTimersStore } from '../../timers/timersStore.js';
import { cloneDeep, debounce, defaultsDeep } from 'lodash';
import {
    isStateChanged as getIsStateChanged,
    isItemPartiallyAnswered,
    isItemWithoutInteractions
} from '@oat-sa-private/tao-item-runner-qtinui/src/runner/util/item.js';

/**
 * The plugin's default configuration
 */
const defaultConfig = {
    triggerUpdate: {
        // implemented for PCIs, where state should be pulled from interaction
        interval: 0, // interval of triggering stateupdate event in milliseconds. Undefined/false value disables trigger.
        state: true, // should state be updated and saved
        response: true // should response be updated
    },
    saveState: {
        enabled: false, // send itemState to server shortly after user modified it
        minWait: 2000, // min milliseconds between requests sent
        maxWait: 5000, // max milliseconds between requests sent
        liveSaveIndicator: {
            enabled: false // display LSI component
        },
        requestRetries: 3,
        excludeQtiClasses: [],
        excludePciTypeIdentifiers: []
    }
};

/**
 * Plugin allows the test runner to restore the state of
 * the item which was not unloaded properly (reloading, navigating away from the page, exception, browser crash)
 * It stores the item state in plugin local browser store (setup of local store is done in src/runner/qti.js).
 * Plugin store is scoped to serviceCallId, so item states from different test executions do not intersect.
 * An optional feature also syncs the current item state to the server periodically.
 */
export default pluginFactory({
    name: 'localItemState',

    install() {
        // merge pluginConfig from test runner with local defaults
        const testRunner = this.getTestRunner();
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = defaultsDeep({}, providedConfig, defaultConfig);
        this.setConfig(pluginConfig);

        /**
         * We keep in memory the identifiers of items already loaded
         */
        this.loaded = new Set();

        /**
         * Can we use save-to-server feature on current item?
         * Recalculated on each item's load
         */
        this.saveEnabledForItem = false;

        /**
         * Unique key, replaced by each request started
         */
        this.saveInProgressKey = null;

        /**
         * Failed request retry counter. Increments until config.saveState.requestRetries before resetting to 0
         */
        this.requestRetriesUsed = 0;
    },

    init() {
        const testRunner = this.getTestRunner();
        const serviceCallId = testRunner.getConfig().serviceCallId;
        const { saveState = {}, triggerUpdate = {} } = this.getConfig();
        const {
            enabled: saveStateEnabled,
            minWait,
            maxWait,
            liveSaveIndicator,
            requestRetries,
            excludeQtiClasses,
            excludePciTypeIdentifiers
        } = saveState;
        const timersStore = getTimersStore(serviceCallId);

        // Initialise Live Save Indicator store, if configured
        if (liveSaveIndicator && liveSaveIndicator.enabled) {
            this.liveSaveStoreKey = this.getName();
            this.liveSaveStoreApi = getLiveSaveStore(this.liveSaveStoreKey);
            this.setLiveIndicatorStatus = status => this.liveSaveStoreApi.reset(status);
        } else {
            this.setLiveIndicatorStatus = () => {};
        }

        function getQtiClasses(itemState) {
            return Object.values(itemState)
                .map(elementState => elementState.qtiClass)
                .filter(Boolean);
        }
        function getPciTypeIdentifiers(itemState) {
            return Object.values(itemState)
                .map(elementState => elementState.typeIdentifier)
                .filter(Boolean);
        }

        const getIsAnswerChanged = (stateOne, stateTwo) =>
            isResponseChanged(excludeMediaInteractions(stateOne), excludeMediaInteractions(stateTwo));

        /**
         * Calculates the item state should be saved or not
         * @param {object} oldState
         * @param {object} newState
         * @returns {boolean}
         */
        const getShouldSaveState = (oldState, newState) => {
            if (getQtiClasses(newState).some(qtiClass => excludeQtiClasses.includes(qtiClass))) {
                return false;
            }
            if (
                getPciTypeIdentifiers(newState).some(typeIdentifier =>
                    excludePciTypeIdentifiers.includes(typeIdentifier)
                )
            ) {
                return false;
            }
            const isAnswerChanged = getIsAnswerChanged(oldState, newState);
            const isStateChanged = getIsStateChanged(oldState, newState);

            return isAnswerChanged || (triggerUpdate.interval && triggerUpdate.state && isStateChanged);
        };

        /**
         * 1) saveState doesn't work well with 'skip' action (we don't know item's original state from previous submit),
         *   so disable it if 'skip' is possible.
         * 2) timedOut condition can get from true to false while on the same item (extra-time), so perform this check every time
         * @param {Object} testContext
         * @returns {Boolean}
         */
        const getIsSaveStateEnabledForItem = testContext => {
            if (!saveStateEnabled) {
                return false;
            }
            if (testContext.remainingAttempts >= 0) {
                return false;
            }
            const timerDatas = timersStore.getTimersForContext(testContext, false);
            if (timerDatas.length) {
                if (timerDatas.some(timerData => !getAllowLateSubmission(testContext, timerData))) {
                    return false;
                }
                if (timersStore.isContextTimedOut(testContext)) {
                    return false;
                }
            }
            return true;
        };

        /**
         * Send the `latestUnsavedItemState` to the server.
         * This will not count as an item submission, even though the responses are included.
         */
        this.saveItemState = function () {
            if (
                !this.lastSavedData ||
                !this.lastUnsavedData ||
                this.lastUnsavedData.itemIdentifier !== this.lastSavedData.itemIdentifier ||
                this.lastUnsavedData.itemIdentifier !== testRunner.getTestContext().itemIdentifier
            ) {
                return;
            }

            const itemIdBeingSaved = this.lastUnsavedData.itemIdentifier;
            const stateBeingSaved = cloneDeep(this.lastUnsavedData.itemState);

            // don't send a pointless update
            const shouldSaveState = getShouldSaveState(this.lastSavedData.itemState, stateBeingSaved);
            if (!shouldSaveState) {
                this.setLiveIndicatorStatus(liveSaveStatuses.saved);
                this.requestRetriesUsed = 0;
                return;
            }

            this.setLiveIndicatorStatus(liveSaveStatuses.waiting);

            const action = 'saveItemState';
            const params = {
                itemIdentifier: itemIdBeingSaved,
                itemState: stateBeingSaved
            };

            // Unique Symbol is used to validate at time of response if this request is the latest one
            this.saveInProgressKey = Symbol();
            const saveInProgressKey = this.saveInProgressKey;
            testRunner
                .getProxy()
                .callItemAction(itemIdBeingSaved, action, params)
                .then(() => {
                    // cancelling debounced function doesn't cancel proxy request. At least do not apply request results.
                    if (this.saveInProgressKey === saveInProgressKey) {
                        this.setLiveIndicatorStatus(liveSaveStatuses.saved);
                        this.requestRetriesUsed = 0;
                        // store this for comparison with next state
                        this.lastSavedData = { itemState: stateBeingSaved, itemIdentifier: itemIdBeingSaved };
                    }
                })
                .catch(e => {
                    // catch error 409 and display error page
                    if (e?.errorCode === 409) {
                        testRunner.trigger('error', e);
                    }
                    // retry save with latest unsaved itemState - as long as no newer request has begun
                    if (this.saveInProgressKey === saveInProgressKey) {
                        if (this.requestRetriesUsed < requestRetries) {
                            this.requestRetriesUsed++;
                            this.saveItemStateDebounced();
                        } else {
                            this.requestRetriesUsed = 0;
                            this.setLiveIndicatorStatus(liveSaveStatuses.none);
                        }
                    }
                });
        };

        this.saveItemStateDebounced = debounce(this.saveItemState, minWait, { maxWait });

        this.cancelStateChangeListener = () => {
            //unsubscribe from state update listening
            //but do not cancel current stateupdate handler yet
            if (testRunner.itemRunner) {
                testRunner.itemRunner.off('statechange.localItemState');
            }
            this.cancelSaveInProgress();
        };

        this.cancelSaveInProgress = () => {
            this.saveItemStateDebounced.cancel();
            this.saveInProgressKey = null;
        };

        //check if there is item state in store
        return testRunner.getPluginStore(this.getName()).then(localStore => {
            //inject in the flow of item loading
            testRunner.on('loaditem.localItemState', (itemRef, itemData) => {
                delete this.statechangeInProgressKey;

                return localStore.getItem(itemRef).then(localItemState => {
                    this.lastSavedData = { itemState: cloneDeep(itemData.itemState), itemIdentifier: itemRef }; //state we got from the server
                    // decide if server state or local state should be applied
                    // - local state will be applied, as long as it is safe (a null response is not safe)
                    const localItemResponses = reduceStateToResponses(localItemState);
                    const isLocalWithoutInteractions = isItemWithoutInteractions(localItemResponses);
                    const isLocalNotUnanswered = isItemPartiallyAnswered(localItemResponses);
                    const shouldApplyLocalState = isLocalWithoutInteractions || isLocalNotUnanswered;

                    if (!this.loaded.has(itemRef) && localItemState && shouldApplyLocalState) {
                        Object.assign(itemData, {
                            itemState: localItemState
                        });
                    }
                    this.loaded.add(itemRef);

                    //clear all other items
                    return localStore.getItems().then(entries =>
                        Promise.all(
                            Object.keys(entries)
                                .filter(entry => entry !== itemRef)
                                .map(itemKey => localStore.removeItem(itemKey))
                        )
                    );
                });
            });

            testRunner.after('renderitem.localItemState', itemRef => {
                const onStateChange = newState => {
                    this.statechangeInProgressKey = Symbol();
                    const statechangeInProgressKey = this.statechangeInProgressKey;

                    return waitForResponsePromises(newState).then(resolvedNewState =>
                        localStore.getItem(itemRef).then(localStoreItemState => {
                            //if another statechange happened, don't continue promise for older state
                            if (statechangeInProgressKey === this.statechangeInProgressKey) {
                                //if there's no `this.lastSavedData`, it means we are between 'unloaditem' and 'loaditem', so don't save anything
                                if (saveStateEnabled && this.saveEnabledForItem && this.lastSavedData) {
                                    // if user changed response, immediately show 'waiting' indicator
                                    // follow-up indicator state will be set later by saveItemState
                                    const shouldSaveState = getShouldSaveState(localStoreItemState, resolvedNewState);
                                    if (shouldSaveState) {
                                        this.lastUnsavedData = { itemState: resolvedNewState, itemIdentifier: itemRef };
                                        this.setLiveIndicatorStatus(liveSaveStatuses.waiting);
                                        this.saveItemStateDebounced();
                                    }
                                }
                                //'waitForResponsePromises' happens in proxy 'move', after 'unloaditem',
                                //   so give 'localStore' part of this promise a chance to run after 'unloaditem', to have up-to-date data in 'localStore'
                                return localStore.setItem(itemRef, resolvedNewState || '');
                            }
                        })
                    );
                };

                this.show();
                if (saveStateEnabled) {
                    this.saveEnabledForItem = getIsSaveStateEnabledForItem(testRunner.getTestContext());
                    if (!this.saveEnabledForItem) {
                        this.setLiveIndicatorStatus(liveSaveStatuses.none);
                    } else {
                        //if we moved to another item, it means test state was saved;
                        //if we refreshed page on the same item, keep empty initial state, because
                        //   initial state is applied from local storage and may not have been auto-saved.
                        if (
                            this.liveSaveStoreApi &&
                            get(this.liveSaveStoreApi.liveSaveStore).status !== liveSaveStatuses.none
                        ) {
                            this.setLiveIndicatorStatus(liveSaveStatuses.saved);
                        }
                    }
                }

                // Update state after item render
                // (for cases when state was updated before we subscribed, e.g. choices shuffling)
                onStateChange(testRunner.itemRunner.getState());

                // subscribe to state changes of the new itemRunner
                // note: this event fires multiple times for most user inputs
                testRunner.itemRunner.on('statechange.localItemState', onStateChange);

                if (triggerUpdate.interval) {
                    this.triggerUpdateInterval = setInterval(() => {
                        if (testRunner && testRunner.itemRunner && testRunner.itemRunner.item) {
                            testRunner.itemRunner.item.trigger('stateupdate', {
                                response: triggerUpdate.response,
                                state: triggerUpdate.state
                            });
                        }
                    }, triggerUpdate.interval);
                }
            });

            const onUnloadItem = () => {
                clearInterval(this.triggerUpdateInterval);
                this.cancelStateChangeListener();
                delete this.lastSavedData;
                delete this.lastUnsavedData;
            };
            testRunner.on('unloaditem.localItemState', () => {
                onUnloadItem();
                this.hide();
            });
            testRunner.on('itemModalFeedback.localItemState', () => {
                onUnloadItem();
                this.setLiveIndicatorStatus(liveSaveStatuses.saved);
            });
            testRunner.on('timeout.localItemState pause.localItemState', () => {
                if (this.liveSaveStoreApi) {
                    this.liveSaveStoreApi.reset(liveSaveStatuses.none);
                }
                this.cancelSaveInProgress();
            });
        });
    },

    render() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();

        // render Live Save Indicator, if configured
        if (this.liveSaveStoreApi) {
            this.liveSaveIndicator = mount(LiveSaveIndicator, {
                target: areaBroker.getHeaderArea(),
                props: {
                    namespace: this.liveSaveStoreKey,
                    withTime: true
                }
            });
            this.liveSaveElement = areaBroker.getHeaderArea().querySelector('.livesave');
        }
    },

    show() {
        if (this.liveSaveElement) {
            this.liveSaveElement.style.display = 'block';
        }
    },

    hide() {
        if (this.liveSaveElement) {
            this.liveSaveElement.style.display = 'none';
        }
    },

    destroy() {
        const testRunner = this.getTestRunner();
        //unsubscribe from runner events
        testRunner.off('.localItemState');
        this.loaded.clear();

        if (this.cancelStateChangeListener) {
            this.cancelStateChangeListener();
        }
        delete this.statechangeInProgressKey;
        delete this.lastSavedData;
        delete this.lastUnsavedData;

        if (this.liveSaveIndicator) {
            unmount(this.liveSaveIndicator);
        }
    }
});
