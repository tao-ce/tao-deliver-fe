// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { cloneDeep, isEqual } from 'lodash';
import { __ } from '@oat-sa-private/ui-core';
import { checkNavigationFeedback, getNavigationFeedbackConfig, TestLayout } from 'testRunnerDynamicModulesIndex';
import { getTestSessionStatusStore, getTestStateStore } from './testsStateStore.js';
import { itemSessionStates, testSessionStates, testSessionStatus } from './session/sessionStates.js';
import {
    createSkipSubmissionItemState,
    excludeMediaInteractions,
    isResponseChanged,
    reduceStateToResponses,
    updateItemAttempt
} from './session/attempt.js';
import { buildStats, updateAttempt, updateItemProperty, updateStats, itemHasCategory } from './util/testMap.js';
import { isNavigationDisabledByTimers } from './timers/navigation.js';
import { getAllowLateSubmission, isItemModalFeedbackState } from './util/testContext.js';
import { isPausedByProctorExecution, isPausedByProctorUiFlow, isProctoredSession } from './util/proctoring';
import proxyFactory from 'taoTests/runner/proxy';
import areaBrokerFactory from './areaBroker.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner';
import { getNavigationFeedbacksStore, showNavigationFeedback } from './feedback';
import timer from 'core/timer';
import getAssetManager from './config/assetManager.js';
import { getConfigStore } from './config/configStore.js';
import testStoreFactory from 'taoTests/runner/testStore';
import { getTestSessionUserDataService } from './session/testSessionUserDataService.js';
import { timersServiceFactory } from './timers/timersService.js';
import { getTimerLabelForLevel } from './timers/timerLabel.js';
import timerModes from './timers/timerModes.js';
import { createGuidedNavFallback } from './timers/guidedNavFallback.js';
import {
    hasTimeRemainingItems,
    hasTimeRemainingItemsAhead,
    isLastPartOfTest,
    isLastItemOfPart
} from './util/testPart.js';
import { setAdditionalErrorInfo } from './util/error.js';
import { socketProxyFactory } from './timers/socketProxy.js';
import { disableNavReasons } from './plugins/navigation/navigator/constants.js';
import { mount, unmount } from 'svelte';

/**
 * Get the serviceCallId (the test session unique identifier)
 * @param {Object} config - the test runner config
 * @returns {String} the identifier
 * @throws {Error} if not configured
 */
function getServiceCallId(config = {}) {
    if (!config || !config.serviceCallId) {
        throw new Error('The test session is launched without a unique identifier "serviceCallId"');
    }
    return config.serviceCallId;
}

/**
 * Get the configured container
 * @param {Object} config - the test runner config
 * @returns {HTMLElement} the container
 */
function getContainer(config = {}) {
    let container = config.renderTo;
    if (container && container.get) {
        container = container.get(0);
    }

    if (!container || !(container instanceof HTMLElement)) {
        throw new TypeError('The QTI testrunner config must have a renderTo option that is a container');
    }
    return container;
}

export const providerName = 'qtinui';

/**
 * The QTINUI test runner provider
 */
export default {
    name: providerName,

    /**
     * Loads the areaBroker
     * @returns {Object} the area broker
     */
    loadAreaBroker() {
        return areaBrokerFactory(getContainer(this.getConfig()));
    },

    /**
     * Loads the data holder, the test state store (svelte store)
     * @returns {Object} the test state store
     */
    loadDataHolder() {
        return getTestStateStore(getServiceCallId(this.getConfig()));
    },

    /**
     * Loads the data proxy
     * @returns {Object} the proxy
     */
    loadProxy() {
        const config = this.getConfig();
        const proxy = (config.provider && config.provider.proxy) || config.proxy;
        return proxyFactory(proxy, config);
    },

    loadProbeOverseer() {
        //TODO load the probe overseer
        return {};
    },

    loadTestStore() {
        const config = this.getConfig();

        //the test run needs to be identified uniquely
        const identifier = config.serviceCallId || `test-${Date.now()}`;
        return testStoreFactory(identifier);
    },

    /**
     * This method is called before the initialization
     * to setup internal behavior
     */
    install() {
        //preserve current scroll position & item state when enabling/disabling item
        this.mainElementScrollTop = null;

        //preserve item responses on session start to check on session end if it was changed by user
        this.sessionStartItemState = null;

        //keeps store's subscriptions to close them when destroying
        this.storeSubscriptions = [];

        //get the instance of the test session user data service
        this.testSessionUserDataService = getTestSessionUserDataService(getServiceCallId(this.getConfig()));

        const testSessionStatusStore = getTestSessionStatusStore(getServiceCallId(this.getConfig()));

        this.navigationFeedbacksStore = getNavigationFeedbacksStore(getServiceCallId(this.getConfig()));

        this.settingsStore = this.testSessionUserDataService.getSettingsStore();

        this.guidedNavFallback = null;

        /**
         * Create proxy for socket connection
         * @param {Boolean} isSocketProxyBlocking - if false, ignore socketProxy errors - session can continue even if disconnected
         * @returns {Object|null} socketProxy
         */
        this.createSocketProxy = async isSocketProxyBlocking => {
            const { jwtTokenHandler, options, deliveryExecutionId } = this.getConfig();
            if (
                !(
                    options &&
                    options.realTimeService &&
                    options.realTimeService.enabled &&
                    options.realTimeService.socketConnectionUrl
                )
            ) {
                return null;
            }
            const handleSocketProxyError = err => {
                if (isSocketProxyBlocking) {
                    this.handleError(err);
                } else {
                    console.error(err);
                }
            };
            const handleSocketProxyForceLogoutError = err => {
                this.handleError(err);
            };
            let socketProxy;
            try {
                socketProxy = await socketProxyFactory({
                    jwtTokenHandler: jwtTokenHandler,
                    socketUrl: options.realTimeService.socketConnectionUrl,
                    deliveryExecutionId
                });
            } catch (err) {
                handleSocketProxyError(err);
            }
            socketProxy.onProxyEvent('error', handleSocketProxyError);
            socketProxy.onProxyEvent('force_logout', handleSocketProxyForceLogoutError);

            return socketProxy;
        };

        /**
         * Create the timers controller
         * Set the initial timers data
         * @param {Object?} timerDefinition - provided by backend IF test contains any timer
         * @param {Object?} socketProxy
         * @returns {Object|null} timers API
         */
        this.createTimersService = (timerDefinition, socketProxy) => {
            const { options } = this.getConfig();
            if (!timerDefinition) {
                return null;
            }
            if (!socketProxy) {
                throw new TypeError('socket connection must be configured for timers');
            }

            const timersService = timersServiceFactory(this.socketProxy, {
                mode: options.realTimeService.timersClientManaged === false ? timerModes.server : timerModes.client,
                serviceCallId: getServiceCallId(this.getConfig()),
                onError: err => {
                    if (this.guidedNavFallback?.isStartErrorHandled(err)) {
                        return;
                    }
                    timersService.stop();
                    this.handleError(err);
                },
                onTimerTimeout: () => {
                    this.checkTimers('timerTimeout');
                },
                onExtraAdded: () => {
                    this.checkItemOpen('extraAdded');
                },
                throttleConfig: options.timersService?.throttleConfig,
                warningConfig: options.timersService?.warningConfig
            });
            timersService.setInitialData(timerDefinition);

            this.on('timersservice-stop', () => {
                this.guidedNavFallback?.stop();
                if (this.timersService) {
                    this.timersService.stop();
                }
            });

            return timersService;
        };
        this.guidedNavFallback = createGuidedNavFallback({
            getServiceCallId: () => getServiceCallId(this.getConfig()),
            getCurrentTestPart: () => this.getDataHolder()?.getCurrentTestPart(),
            getCurrentItemIdentifier: () => this.getCurrentItemIdentifier(),
            getTimersService: () => this.timersService,
            isTimersInitDone: () => this.timersInitDone,
            isPaused: () => isPausedByProctorUiFlow(this),
            getRealtimeOptions: () => this.getConfig()?.options?.realTimeService,
            stopTimers: () => this.timersService?.stop(),
            onTimeout: timerData => this.trigger('timeout', timerData)
        });

        /**
         * Check for timed out timer in current testContext
         * @param {String} [reason]
         * @fires timeout
         */
        this.checkTimers = reason => {
            if (!this.timersService || !this.timersInitDone) {
                return;
            }
            // Check if one of the timed out timers matches current context
            const testContext = this.getTestContext();
            if (!this.timersService.getStore().isContextTimedOut(testContext)) {
                return;
            }

            // We are timed out on something, but we may or may not need to show a dialog
            if (reason === 'timerTimeout' || (reason === 'startItemSession' && !this.initialTimeoutChecked)) {
                // Stop timers immediately, to prevent another timer's timeout from happening while
                // the modal dialog is being dealt with.
                this.timersService.stop();

                const contextTimers = this.timersService.getStore().getTimersForContext(testContext, false);
                for (const contextTimer of contextTimers) {
                    if (contextTimer.timerValue && contextTimer.timerValue.timeLeft <= 0) {
                        // This will be the highest level timer, if multiple nested timers are expired
                        this.trigger('timeout', contextTimer);
                        return;
                    }
                }
            }
        };

        /**
         * Wait for pendingOperations (uploads) to finish, so any response data is not lost.
         * @returns {Promise<void>} - resolves when nothing more is pending
         */
        this.awaitPendingOperations = () =>
            new Promise(resolve => {
                if (!this.itemRunner?.pendingOperationsStore || this.itemRunner.pendingOperationsStore.isEmpty()) {
                    resolve();
                } else {
                    this.showItemHangerMessage([
                        {
                            content: __('Please wait while the answer is saved...'),
                            colored: false,
                            isTimer: false
                        }
                    ]);
                    // wait for all pending operations to finish
                    this.itemRunner.on('pendingoperationschange.timeout', ({ size }) => {
                        if (size === 0) {
                            this.itemRunner.off('pendingoperationschange.timeout');
                            resolve();
                        }
                    });
                }
            });

        /**
         * Handle the 'timeout' event:
         * - stop the item playing media
         * - (optional) block navigation and show a dialog, which can result in a navigation or an overview
         * - wait for pendingOperations to finish
         * - send a 'timeout' action
         * @param {Object} highestTimedOutTimer
         * @param {String} highestTimedOutTimer.level
         * @param {String} highestTimedOutTimer.id
         * @param {Object} highestTimedOutTimer.timerValue
         * @param {Number} highestTimedOutTimer.timerValue.timeLeft
         */
        this.on('timeout', highestTimedOutTimer => {
            this.guidedNavFallback?.stop();

            const itemIdentifier = this.getCurrentItemIdentifier();
            const testContext = this.getTestContext();
            const testMap = this.getTestMap();
            const testPart = this.getDataHolder().getCurrentTestPart();

            const isTimersGuidedNavigation = isNavigationDisabledByTimers(
                getServiceCallId(this.getConfig()),
                testPart,
                itemIdentifier
            );
            const hasNoAlertTimeoutCategory = itemHasCategory(testMap, itemIdentifier, 'x-tao-option-noAlertTimeout');
            const shouldAutoNavigate = isTimersGuidedNavigation || hasNoAlertTimeoutCategory;

            /**
             * Call the 'timeout' action, submitting the item state and response
             * @returns {Promise<void>}
             */
            const callTimeoutAction = () => {
                const action = 'timeout';
                const { itemState, itemResponse, itemDuration } = this.getItemResults();
                const params = {
                    scope: highestTimedOutTimer.level,
                    itemState,
                    itemResponse,
                    itemDuration
                };

                return this.getProxy()
                    .callItemAction(itemIdentifier, action, params)
                    .then(() => {
                        if (getAllowLateSubmission(testContext, highestTimedOutTimer) || isTimersGuidedNavigation) {
                            //'timeout' action will submit response if allowLateSubmission or isTimersGuidedNavigation,
                            //so 'skip' action that follows 'timeout' should submit related itemState
                            this.sessionStartItemState = itemState || {};
                        }
                    });
            };

            const feedbackTypeArgs = { isTimerTimeout: true };

            const timersStore = this.timersService.getStore();

            // calculate additional context for this timeout
            const partHasTimeRemainingItems = hasTimeRemainingItems(testPart, timersStore);

            this.settingsStore.setSetting('doNotPlayMedia', true);

            const doNextMove = level => {
                // when continue/submit/finish option chosen from dialog
                if (level === 'test') {
                    this.next('test'); //to properly finish session on backend
                    // will only move ahead by 1 item/section/part; not a "timers-aware" jump ahead
                } else if (level === 'testPart' || !partHasTimeRemainingItems) {
                    this.next('testPart');
                } else {
                    this.next(level);
                }
            };

            //case 1: auto navigation: no feedback, wait for requests, then move or open overview
            if (shouldAutoNavigate) {
                this.clearItemHangerMessages();

                return this.itemRunner
                    .close() // prevents interacting
                    .then(this.awaitPendingOperations) // ensures recordings & file uploads ended
                    .then(callTimeoutAction) // sends response
                    .then(() => {
                        if (isPausedByProctorUiFlow(this)) {
                            return;
                        }
                        doNextMove(highestTimedOutTimer.level);
                    })
                    .catch(err => {
                        this.handleError(err);
                    });
            }

            // case 2: show disabled feedback, wait for requests, enable dialog buttons,
            // after that send timeout action and wait for dialog accept,
            // then move or open overview
            const feedbackConfig = getNavigationFeedbackConfig(feedbackTypeArgs, {
                timedOutScope: highestTimedOutTimer.level,
                timeLeftInPart: partHasTimeRemainingItems,
                timeLeftAheadInPart: hasTimeRemainingItemsAhead(testContext, testPart, timersStore),
                lastPartInTest: isLastPartOfTest(testPart, testMap),
                linearPart: testPart.isLinear
            });
            feedbackConfig?.buttons?.forEach(btn => (btn.disabled = true));

            const showFeedbackPromise = showNavigationFeedback(feedbackTypeArgs, feedbackConfig).then(
                feedbackResult =>
                    new Promise(resolve => {
                        if (feedbackResult.cancelled) {
                            resolve(feedbackResult);
                            return;
                        }

                        //if user closes feedback before `timeout` action returns,
                        //show him loading status, but do not unload the item beneath,
                        //because he may stay on the same item, if overview is shown as feedback result.
                        this.clearItemHangerMessages();
                        this.setTestSessionStatus(testSessionStatus.loading);
                        resolve(feedbackResult);
                    })
            );
            this.trigger('disablenav', { reason: disableNavReasons.overlay });

            // dialog already prevents interacting and is preferable to itemRunner.close()
            this.awaitPendingOperations() // ensures recordings & file uploads ended
                .then(() => this.navigationFeedbacksStore.enableButtons(feedback => feedback.config.type === 'timeout'))
                .then(() => Promise.all([showFeedbackPromise, callTimeoutAction()]))
                .then(([feedbackResult]) => {
                    this.trigger('enablenav', { reason: disableNavReasons.overlay });

                    //if cancelled by proctor-pause or proctor-terminate or proctor-reset, do not do anything
                    if (feedbackResult.cancelled || isPausedByProctorUiFlow(this)) {
                        return;
                    }

                    if (feedbackResult.proceed) {
                        doNextMove(highestTimedOutTimer.level);
                    } else {
                        // for timeout dialogs, feedbackProceed=false is only possible
                        // when "review my answers" option chosen from dialog
                        // or dialog with 2 buttons is closed without choosing an option
                        if (this.timersService) {
                            this.timersService.start(this.getTestContext());
                        }
                        this.trigger('open-overview');
                    }
                })
                .catch(err => {
                    this.handleError(err);
                });
        });

        this.on('itemrunner-cancelAllUploads', () => {
            this.itemRunner?.cancelAllUploads?.();
        });

        this.on('proctor-reset-test', () => {
            this.resetTestState();
        });

        this.on('proctor-reset-test-confirmed', () => {
            this.trigger('testreset');
        });

        /**
         * Get the current session status
         * @returns {String} the status
         */
        this.getTestSessionStatus = () => testSessionStatusStore.get();

        /**
         * Set the current session status
         * @param {String} status
         */
        this.setTestSessionStatus = status => {
            testSessionStatusStore.set(status);
        };

        /**
         * Get the current item identifier
         * @returns {?String} the identifier
         */
        this.getCurrentItemIdentifier = () => {
            const testContext = this.getTestContext();
            return testContext && testContext.itemIdentifier;
        };

        /**
         * Retrieve the test runner theming information from the config
         * @returns {Object} the theme
         */
        this.getTheme = () => {
            const config = this.getConfig();
            return (config && config.themes && config.themes.testRunner) || {};
        };

        /**
         * Based on a given state, compute the next action
         * @param {Object} testContext
         * @returns {Promise|void}
         */
        this.computeNextAction = testContext => {
            if (testContext.state <= testSessionStates.interacting) {
                if (isPausedByProctorExecution(testContext)) {
                    this.trigger('proctor-pause');
                } else {
                    return this.startItemSession();
                }
            } else if (testContext.state === testSessionStates.suspended) {
                return this.exit();
            } else if (testContext.state === testSessionStates.closed) {
                return this.finish();
            }
        };

        /**
         * Show an 'item hanger' message
         * @param {Object[]} itemHangerMessages
         */
        this.showItemHangerMessage = itemHangerMessages => {
            if (!itemHangerMessages || !itemHangerMessages.length) {
                this.clearItemHangerMessages();
            } else if (this.testLayout) {
                this.testLayout.$set({
                    itemHangerMessages
                });
            }
        };

        /**
         * Clear 'item hanger' messages
         */
        this.clearItemHangerMessages = () => {
            if (this.testLayout) {
                this.testLayout.$set({ itemHangerMessages: [] });
            }
        };

        /**
         * Check if the current item has remaining attempts
         * and display a message or close the item.
         * @param {String} [reason] - internal string, by convention the name of the caller
         * @returns {Promise}
         */
        this.checkItemOpen = reason => {
            if (this.itemTimerUnsubscribe) {
                this.itemTimerUnsubscribe();
                this.itemTimerUnsubscribe = null;
            }
            this.showItemHangerMessage([]);

            const item = this.getDataHolder().getCurrentItem();
            const testContext = this.getTestContext();

            let doCloseItem = false;
            let itemHangerMessages = [];

            // close if attempts expired
            const remainingAttempts = item.remainingAttempts;
            if (remainingAttempts === 0) {
                if (testContext.itemSessionState === itemSessionStates.closed) {
                    doCloseItem = true;
                    itemHangerMessages.push({ content: __('All attempts have been used for this question') });
                } else {
                    itemHangerMessages.push({ content: __('You have %d attempts left for this question', 1) });
                }
            } else if (remainingAttempts > 0) {
                itemHangerMessages.push({
                    content: __('You have %d attempts left for this question', remainingAttempts)
                });
            }

            // close if timer expired
            if (this.timersService) {
                // show dialog on the first 'startItemSession' after page load only
                this.checkTimers(reason);
                this.initialTimeoutChecked = true;

                const itemTimer = this.timersService.getStore().getTimerFor('item', item.id);

                if (this.timersService.getStore().isContextTimedOut(testContext)) {
                    doCloseItem = true;

                    const isItemTimerTimedOut = itemTimer && itemTimer.timerValue && itemTimer.timerValue.timeLeft <= 0;
                    if (isItemTimerTimedOut) {
                        itemHangerMessages.push({ content: __('Time has run out for this question') });
                    } else {
                        itemHangerMessages.push({ content: __("Time has run out for this question's section") });
                    }
                } else if (itemTimer && !isItemModalFeedbackState(testContext)) {
                    //if has item has item-level timer, show notification with remaining time and update it as time updates
                    const otherMessages = itemHangerMessages;
                    itemHangerMessages = [];
                    this.itemTimerUnsubscribe = this.timersService.getStore().subscribe(() => {
                        const { label: timerLabel, ariaLabel: timerAriaLabel } = getTimerLabelForLevel(
                            'item',
                            this.getTestContext(),
                            this.timersService.getStore()
                        );
                        if (timerLabel) {
                            this.showItemHangerMessage([
                                ...otherMessages,
                                {
                                    content: timerLabel,
                                    colored: !doCloseItem,
                                    isTimer: true,
                                    timerAriaLabel
                                }
                            ]);
                        }
                    });
                }
            }

            if (isItemModalFeedbackState(testContext)) {
                itemHangerMessages = [];
            }

            if (itemHangerMessages.length) {
                this.showItemHangerMessage(itemHangerMessages);
            }

            if (this.itemRunner) {
                if (doCloseItem && !this.itemRunner.isSuspended()) {
                    return this.itemRunner.close();
                }
                if (!doCloseItem && this.itemRunner.isClosed()) {
                    return this.itemRunner.resume();
                }
            }
            return Promise.resolve();
        };

        /**
         * Starts the item session
         * @returns {Promise}
         */
        this.startItemSession = () => {
            const item = this.getDataHolder().getCurrentItem();
            const itemIdentifier = this.getCurrentItemIdentifier();

            let testMap = this.getTestMap();
            const testPart = this.getDataHolder().getCurrentTestPart();
            const section = this.getDataHolder().getCurrentSection();

            // set the current item as viewed (first time only) and update testMap stats
            if (!item.viewed) {
                testMap = updateItemProperty(testMap, testPart.id, section.id, itemIdentifier, 'viewed', true);
                testMap = updateStats(testMap, testPart.id, section.id, 'viewed', true);
                testMap = updateStats(testMap, testPart.id, section.id, 'questionsViewed', true);
                this.setTestMap(testMap);
            }

            //update remainingAttempts from context
            testMap = updateItemProperty(
                testMap,
                testPart.id,
                section.id,
                itemIdentifier,
                'remainingAttempts',
                this.getContextRemainingAttempts(this.getTestContext())
            );

            this.itemTimer = timer({
                autoStart: false
            });

            // TODO: can guidedNav be moved into its own plugin?
            const disableNav = isNavigationDisabledByTimers(
                getServiceCallId(this.getConfig()),
                this.getDataHolder()?.getCurrentTestPart(),
                this.getDataHolder()?.getCurrentItem()?.id
            );
            if (disableNav) {
                this.trigger('disablenav', { reason: disableNavReasons.guidedNav });
            } else {
                this.trigger('enablenav', { reason: disableNavReasons.guidedNav });
            }

            this.sessionStartItemState = null;
            this.on('renderitem.startsession', () => {
                this.off('renderitem.startsession');

                return this.checkItemOpen('startItemSession');
            });

            return this.loadItem(itemIdentifier);
        };

        /**
         * @typedef {Object} itemResults - the data format which will be sent via the proxy to the server
         * @property {Object} itemState - the full entry read from (or written to) item state store
         * @property {Object} itemResponse - the item state store entry filtered to only its responses
         * @property {Number} itemDuration
         */
        /**
         * Get the results (state & response) of the current item
         * Objects must be cloned at this point to prevent mutating forward references
         * @returns {itemResults} with state, response and duration
         */
        this.getItemResults = () => {
            const itemState = this.itemRunner ? cloneDeep(this.itemRunner.getState()) : {}; // full itemsStateStore entry
            const itemResponse = this.itemRunner ? cloneDeep(this.itemRunner.getResponses()) : {}; // itemsStateStore entry filtered to responses
            const itemDuration = this.itemTimer ? this.itemTimer.getDuration() / 1000 : 0;

            const itemIdentifier = this.getCurrentItemIdentifier();
            itemState.touched =
                this.getItemState(itemIdentifier, 'touched') || this.sessionStartItemState.touched || false;

            return {
                itemState,
                itemResponse,
                itemDuration
            };
        };

        /**
         * On endItemSession, if async validation
         *  for some interaction is still running, wait until it finishes
         * @returns {Promise<Boolean>} `false` if validation was cancelled, `true` if it finished
         */
        this.asyncValidationOnEndItemSession = async () => {
            const { itemState } = this.getItemResults();

            const asyncResponses = [];
            const extractValidationPromises = targetObject => {
                if (targetObject && typeof targetObject === 'object') {
                    for (let key of Object.keys(targetObject)) {
                        if (key === 'validity' && targetObject.validity instanceof Promise) {
                            asyncResponses.push(targetObject.validity);
                            //tells the promise has a consumer, and the consumer will handle the rejection
                            targetObject.validity.handled = true;
                        } else {
                            extractValidationPromises(targetObject[key]);
                        }
                    }
                }
            };
            extractValidationPromises(itemState);
            if (asyncResponses.length && this.itemRunner && !this.itemRunner.isSuspended()) {
                this.itemRunner.close(); //disable interacting with item
            }
            await Promise.all(asyncResponses);

            //if pause arrived while we were waiting for async validation
            if (isPausedByProctorUiFlow(this)) {
                return false;
            }

            if (this.itemRunner && this.itemRunner.isClosed()) {
                this.itemRunner.resume(); //enable interacting with item
            }
            return true;
        };

        /**
         * On endItemSession, show navigation feedback if needed,
         *  and wait for user's decision to leave or stay
         * @param {Object} args
         * @param {Boolean} args.submitResponse
         * @param {Object} args.moveParams
         * @param {Boolean} args.isTimeout
         * @param {Object} args.itemState
         * @param {Object} args.itemResponses
         * @param {Boolean} args.isAnswerChanged
         * @returns {Promise<Boolean>} `false` if user should stay on item, `true` if he decided to leave
         */
        this.navigationFeedbackOnEndItemSession = async ({
            submitResponse,
            moveParams,
            isTimeout,
            itemState,
            itemResponses,
            isAnswerChanged
        }) => {
            const testContext = this.getTestContext();
            const testMap = this.getTestMap();
            const testPart = this.getDataHolder().getCurrentTestPart();
            const currentItem = this.getDataHolder().getCurrentItem();

            const feedbackTypeArgs = checkNavigationFeedback({
                submitResponse,
                itemState,
                itemResponses,
                allowSkipping: testContext.allowSkipping,
                validateResponses: testContext.validateResponses,
                submissionMode: testContext.submissionMode,
                isLinear: testPart.isLinear,
                isAnswerChanged,
                isTimerTimeout: isTimeout,
                moveParams,
                testContext,
                testMap
            });

            if (!feedbackTypeArgs) {
                return true;
            } else {
                const feedbackConfig = getNavigationFeedbackConfig(feedbackTypeArgs, {
                    testMap,
                    testPart,
                    currentItem
                });
                if (!feedbackConfig) {
                    return true;
                }

                let feedbackResult;
                this.on('timeout.endItemSessionFeedback', () => {
                    this.navigationFeedbacksStore.cancel(i => isEqual(i.feedbackTypeArgs, feedbackTypeArgs));
                });
                try {
                    feedbackResult = await showNavigationFeedback(feedbackTypeArgs, feedbackConfig);
                } finally {
                    this.off('timeout.endItemSessionFeedback');
                }

                if (feedbackResult.cancelled) {
                    //if cancelled by proctor-pause or proctor-terminate or proctor-reset or timeout, do not do anything
                    return false;
                } else if (feedbackResult.proceed) {
                    return true;
                } else {
                    return false;
                }
            }
        };

        /**
         * On endItemSession, show modalFeedback for item
         *   which has feedbacks defined in QTI and enabled in testMap
         * @param {Object} args
         * @param {Boolean} args.submitResponse
         * @param {Object} args.itemState
         * @param {Object} args.itemResponse
         * @param {Number} args.itemDuration
         * @returns {Promise<Boolean>} `false` if `submitItem` was not called, `true` if it was
         */
        this.modalFeedbackOnEndItemSession = async ({ submitResponse, itemState, itemResponse, itemDuration }) => {
            const itemIdentifier = this.getCurrentItemIdentifier();
            const testContext = this.getTestContext();
            const currentItem = this.getDataHolder().getCurrentItem();

            if (!currentItem.hasFeedbacks || !submitResponse || this.getContextRemainingAttempts(testContext) === 0) {
                return false;
            }

            if (this.timersService) {
                this.timersService.stop();
            }
            this.setTestSessionStatus(testSessionStatus.loading);

            const submitItemResults = await this.getProxy().submitItem(itemIdentifier, itemState, itemResponse, {
                itemDuration
            });

            if (
                !submitItemResults.displayFeedbacks || //will be true even if no actual feedback! so 'onBeforeRenderFeedbacks'
                !submitItemResults.feedbacks ||
                !submitItemResults.itemSession ||
                !this.itemRunner
            ) {
                return true;
            }

            let prevItemSessionState;
            const modalFeedbackOptions = {
                modalFeedbackNavigatorArea: this.getAreaBroker().getItemModalFeedbackNavigatorArea(),
                onBeforeRenderFeedbacks: async () => {
                    //if from overview
                    if (this.getItemState(itemIdentifier, 'disabled')) {
                        await new Promise(modalEnableItemResolve => {
                            this.on('enableitem.modalfeedback', () => {
                                this.off('enableitem.modalfeedback');
                                if (this.timersService) {
                                    this.timersService.stop();
                                }
                                modalEnableItemResolve();
                            });
                            this.enableItem(itemIdentifier);
                        });
                    }

                    prevItemSessionState = testContext.itemSessionState;
                    testContext.itemSessionState = itemSessionStates.modalFeedback;
                    this.setTestContext(testContext);

                    this.clearItemHangerMessages();
                    this.setTestSessionStatus(testSessionStatus.interacting);
                    this.trigger('itemModalFeedback');
                }
            };

            await new Promise((renderFeedbacksResolve, renderFeedbacksReject) => {
                this.itemRunner
                    .on('error.modalFeedback', err => {
                        this.itemRunner.off('error.modalFeedback');
                        renderFeedbacksReject(err);
                    })
                    .renderFeedbacks(
                        submitItemResults.feedbacks,
                        Object.assign(modalFeedbackOptions, submitItemResults.itemSession),
                        () => {
                            //'done' callback, will be called after user dismisses modalFeedback in item-runner
                            this.itemRunner.off('error.modalFeedback');
                            renderFeedbacksResolve();
                        }
                    );
            });

            //note: while waiting for `renderFeedbacks` to resolve,
            //  `disableItem/enableItem` may be called: by opening settings, or by proctor pause/resume
            if (typeof prevItemSessionState !== 'undefined') {
                testContext.itemSessionState = prevItemSessionState;
                this.setTestContext(testContext);
            }
            return true;
        };

        /**
         * Ends the item session
         * @param {Object} moveParams - { direction, scope, ref } of move which caused endItemSession
         * @param {Boolean} [submitResponse=true] - submit current item response during session end
         * @param {Boolean} [isTimeout=false] - in a timeout situation, other feedback cases will not be checked
         * @returns {Promise<Object>} - resolves with full { itemResults } if session enabled, or false if not
         */
        this.endItemSession = async (moveParams = {}, submitResponse = true, isTimeout = false) => {
            this.trigger('disablenav', { reason: disableNavReasons.moving });

            let proceed = true; //cancel and do not end item session

            try {
                //wait for all responses, any error will fail the whole action
                proceed = await this.asyncValidationOnEndItemSession();
                if (!proceed) {
                    return false;
                }

                let { itemState, itemResponse, itemDuration } = this.getItemResults();

                // Exclude media from states, so we can check for intentionally changed responses, ignoring play count increment
                const isAnswerChanged = isResponseChanged(
                    excludeMediaInteractions(this.sessionStartItemState),
                    excludeMediaInteractions(itemState)
                );

                if (!submitResponse) {
                    // If not submitting item (skipping) we should only submit state (not responses)
                    itemResponse = null;
                    itemState = createSkipSubmissionItemState(this.sessionStartItemState, itemState);
                }
                const itemResponses = reduceStateToResponses(itemState || {}); //response + validity

                proceed = await this.navigationFeedbackOnEndItemSession({
                    submitResponse,
                    moveParams,
                    isTimeout,
                    itemState,
                    itemResponses,
                    isAnswerChanged
                });
                if (!proceed) {
                    this.trigger('enablenav', { reason: disableNavReasons.moving });
                    return false;
                }

                const submitItemWasCalled = await this.modalFeedbackOnEndItemSession({
                    submitResponse,
                    itemState,
                    itemResponse,
                    itemDuration
                });
                if (submitItemWasCalled) {
                    itemResponse = null; //'skip' will be called after 'submitItem'
                }

                //leave item, no more cancellations

                // update the attempt in the test map and the answered state
                const itemIdentifier = this.getCurrentItemIdentifier();
                const testMap = this.getTestMap();
                const testPart = this.getDataHolder().getCurrentTestPart();
                const section = this.getDataHolder().getCurrentSection();
                const currentItem = this.getDataHolder().getCurrentItem();
                this.setTestMap(
                    updateAttempt(
                        testMap,
                        testPart,
                        section,
                        updateItemAttempt(currentItem, itemResponses, testPart.isLinear, submitResponse)
                    )
                );
                // Current item must be un-disabled before moving
                if (this.getItemState(itemIdentifier, 'disabled')) {
                    this.setItemState(itemIdentifier, 'disabled', false);
                }

                await new Promise(unloadItemResolve => {
                    this.on('unloaditem.moving', () => {
                        this.off('unloaditem.moving');
                        unloadItemResolve();
                    });
                    this.unloadItem(itemIdentifier);
                });

                return {
                    itemResults: {
                        itemState,
                        itemResponse,
                        itemDuration
                    },
                    submitItemWasCalled
                };
            } catch (err) {
                this.handleError(err);
                throw err;
            }
        };

        /**
         * Move :
         *  - end the current item session
         *  - load and set the new context
         *  - compute the next action
         * @param {String} [direction=next]  - next, previous, jump
         * @param {String} [scope=item] - item, section, testPart or test
         * @param {number} [ref] - the position where to move (for jumps)
         * @param {boolean} [submitResponse=true] - submit current item response during session end
         * @returns {?Promise}
         */
        this.move = (direction = 'next', scope = 'item', ref, submitResponse = true) => {
            const testContext = this.getTestContext();
            const moveParams = { direction, scope, ref };
            let isTimeout = false;

            // sending another response to an item in a timed-out context would cause a server error
            if (this.timersService && this.timersService.getStore().isContextTimedOut(testContext)) {
                submitResponse = false;
                isTimeout = true;
            }

            return this.endItemSession(moveParams, submitResponse, isTimeout).then(endItemSessionResults => {
                if (endItemSessionResults === false) {
                    return;
                }

                // Move or skip action can go ahead
                const itemIdentifier = this.getCurrentItemIdentifier();
                const prevItemSessionState = testContext.itemSessionState;
                const { itemResults, submitItemWasCalled } = endItemSessionResults;
                let action = submitResponse && !submitItemWasCalled ? 'move' : 'skip';
                let params = Object.assign(
                    {
                        direction,
                        scope,
                        ref
                    },
                    itemResults
                );

                return this.getProxy()
                    .callItemAction(itemIdentifier, action, params)
                    .then(results => {
                        if (!results || !results.testContext) {
                            throw new Error('No testContext received');
                        }
                        const newTextContent = { ...results.testContext };
                        if (
                            newTextContent.itemIdentifier === itemIdentifier &&
                            newTextContent.itemSessionState === itemSessionStates.modalFeedback
                        ) {
                            //modalFeedback is supported only on endItemSession, initial rendering from modalFeedback status is not supported
                            //if moved to another item, backend will reset itemSessionState,
                            //if moved to the same item, backend won't reset it, so do it here
                            newTextContent.itemSessionState = prevItemSessionState;
                        }
                        this.setTestContext(newTextContent);

                        if (typeof results.batteryContext !== 'undefined') {
                            this.trigger('testfinished', results.batteryContext);
                        }
                        if (results.testMap) {
                            this.setTestMap(results.testMap);
                        }
                        return this.computeNextAction(results.testContext);
                    })
                    .catch(err => {
                        this.handleError(err);
                    });
            });
        };

        //we update the timer on status change
        this.storeSubscriptions.push(
            testSessionStatusStore.subscribe(status => {
                // manage item timer based on state
                if (this.itemTimer) {
                    if (status === testSessionStatus.interacting || status === testSessionStatus.overlay) {
                        this.itemTimer.resume();
                    } else if (this.itemTimer.is('running')) {
                        this.itemTimer.pause();
                    }
                }
            })
        );

        //we update the item runner options if the settings change while the item is running
        this.storeSubscriptions.push(
            this.settingsStore.subscribe(settings => {
                if (this.itemRunner) {
                    this.itemRunner.setOptions(Object.assign({}, this.itemRunner.getOptions(), { settings }));
                }
            })
        );

        /**
         * Handles error and redirect to exit page
         * @param {Error} err - an error or a type of error message
         */
        this.handleError = err => {
            try {
                if (err?.response?.responses?.length > 0) {
                    const response = err.response.responses[0];
                    const unsuccessful = response.filter(result => result.success === false);
                    if (unsuccessful.length) {
                        if (
                            unsuccessful.some(result => result.errorCode === 100) // actionErrorCodes.proctorTerminated
                        ) {
                            this.trigger('proctor-terminate');
                            return;
                        }
                        if (
                            unsuccessful.some(result => result.errorCode === 105) // actionErrorCodes.proctorReset
                        ) {
                            this.trigger('proctor-reset');
                            return;
                        }
                    }
                }
                err.itemIdentifier = this.getCurrentItemIdentifier();

                setAdditionalErrorInfo(err);
            } catch (err2) {
                err = err2 || new Error('error handler error');
            }

            this.trigger('error', err);
        };

        /**
         * window 'unhandledrejection' handler
         * @param {Event} evt
         */
        this.handleUnhandledPromiseRejection = evt => {
            let err = evt.reason;
            if (!(err instanceof Error)) {
                err = new Error(`Unhandled promise rejection in test-runner: ${err}`);
            }

            setAdditionalErrorInfo(err, { unhandledPromiseRejection: true });
            if (err.additionalInfo && err.additionalInfo.fromSvelte && err.additionalInfo.edgeReadAloud) {
                this.trigger('error', err);
            } else {
                err.logOnly = true;
                this.trigger('error', err);
            }
        };

        /**
         * Returns remaining attempts from testContext based on remainingAttempts value and item session state
         * @param {object} testContext
         * @returns {number}
         */
        this.getContextRemainingAttempts = testContext => {
            const { itemSessionState, remainingAttempts } = testContext;
            if (remainingAttempts >= 0) {
                if (itemSessionState !== itemSessionStates.closed) {
                    return remainingAttempts + 1;
                } else {
                    return 0;
                }
            } else {
                return remainingAttempts;
            }
        };

        this.getAssetManager = () => {
            const config = this.getConfig();
            return getAssetManager(config.serviceCallId, { staticUrl: config.staticUrl });
        };

        this.resetTestState = () => {
            this.guidedNavFallback?.stop();
            // Clear session status
            testSessionStatusStore.clear();

            // Clear item runner state
            if (this.itemRunner) {
                this.itemRunner.setState({});
            }
        };

        getConfigStore().set(this.getConfig());
    },

    /**
     * Initialize the test runner
     * @returns {Promise} when the test runner is initialized
     */
    init() {
        const config = this.getConfig();
        const testContainer = getContainer(config);

        // dir attribute must be set not only on <html>, but on test container
        // to propagate typographic styles correctly
        testContainer.setAttribute('dir', config.dir || 'ltr');

        this.setTestSessionStatus(testSessionStatus.initial);

        window.addEventListener('unhandledrejection', this.handleUnhandledPromiseRejection);

        //we prepare the layout early
        this.testLayout = mount(TestLayout, {
            target: testContainer,
            props: {
                serviceCallId: getServiceCallId(config),
                theme: this.getTheme(),
                testTaker: config.testTaker,
                plugins: this.getPlugins() || {},
                options: config.options
            }
        });
        this.testLayout.$on('toolbaraction', event => {
            this.trigger('toolbaraction', event.detail.key);
        });

        /**
         * Initialize the test layout
         * @returns {Promise} resolves when the layout is mounted
         */
        const initLayout = () =>
            new Promise((resolve, reject) => {
                this.testLayout.$on('mount', e => {
                    //setup the areas for the broker
                    const areaBroker = this.getAreaBroker();
                    areaBroker.setAreas(e.detail.areas);
                    resolve();
                });
                this.testLayout.$on('error', reject);

                this.setTestSessionStatus(testSessionStatus.loading);
            });

        /**
         * Initialize the storage of user data
         * @returns {Promise} resolves when the storage is initialized
         */
        const initUserDataStorage = () =>
            this.getTestStore()
                .getStore('userData')
                .then(userDataLocalStore => this.testSessionUserDataService.startSyncWithStorage(userDataLocalStore))
                .then(() => {
                    this.storeSubscriptions.push(
                        this.navigationFeedbacksStore.subscribe(() => {
                            const oldDoNotPlayMedia = this.settingsStore.getSetting('doNotPlayMedia');
                            const newDoNotPlayMedia =
                                this.navigationFeedbacksStore.isSecurityShown() ||
                                this.navigationFeedbacksStore.isTimeoutShown();
                            if (Boolean(oldDoNotPlayMedia) !== Boolean(newDoNotPlayMedia)) {
                                this.settingsStore.setSetting('doNotPlayMedia', newDoNotPlayMedia);
                            }
                        })
                    );
                });

        return (
            Promise.all([initLayout(), initUserDataStorage()])
                //load initial data
                .then(() => this.getProxy().init())

                .then(results => {
                    if (!results || !results.testContext || !results.testMap) {
                        throw new Error('No data received for this test');
                    }
                    const { testPartId, sectionId, itemIdentifier } = results.testContext;
                    const calculatedRemainingAttempts = this.getContextRemainingAttempts(results.testContext);
                    updateItemProperty(
                        results.testMap,
                        testPartId,
                        sectionId,
                        itemIdentifier,
                        'remainingAttempts',
                        calculatedRemainingAttempts
                    );
                    this.setTestMap(buildStats(results.testMap));
                    this.setTestContext(results.testContext);

                    const hasTimers = !!results.timer;
                    const proctored = isProctoredSession(results.testContext);
                    const isSocketProxyBlocking = hasTimers || proctored;

                    return this.createSocketProxy(isSocketProxyBlocking).then(socketProxy => {
                        /**
                         * plugins can access it with `testRunner.socketProxy`
                         * (TODO: add this.getSocketProxy() to provider & use moduleLoader, or add some container for shared service instances)
                         */
                        /** @public */
                        this.socketProxy = socketProxy;
                        this.timersService = this.createTimersService(results.timer, this.socketProxy);
                        if (this.socketProxy) {
                            if (isSocketProxyBlocking) {
                                return this.socketProxy.connect();
                            } else {
                                this.socketProxy.connect().catch(err => {
                                    console.error(err);
                                });
                                return Promise.resolve();
                            }
                        }
                    });
                })
                .then(() => {
                    if (this.timersService) {
                        this.timersInitDone = true;
                    }

                    this.on('move', this.move);
                })
        );
    },

    /**
     * The rendering stage
     */
    render() {
        // nav should start disabled, until first item renders
        this.trigger('disablenav', { reason: disableNavReasons.moving });

        //first action, the TR is initialized ready to be rendered
        const testContext = this.getTestContext();
        this.computeNextAction(testContext);
    },

    /**
     * Load the given item
     * @param {String} itemIdentifier - the item identifier
     * @returns {Promise<Object>} resolves with item data
     */
    loadItem(itemIdentifier) {
        if ([testSessionStatus.initial, testSessionStatus.interacting].includes(this.getTestSessionStatus())) {
            this.setTestSessionStatus(testSessionStatus.loading);
        }
        this.trigger('proctor-socket-unsubscribe');

        this.settingsStore.setSetting('doNotPlayMedia', false);

        //load item data
        return this.getProxy()
            .getItem(itemIdentifier)
            .then(itemData => {
                this.sessionStartItemState = cloneDeep(itemData.itemState || {});
                return itemData;
            });
    },

    /**
     * Render the given item
     * @param {String} itemIdentifier - the item identifier
     * @param {Object} itemData - the loaded item data
     * @returns {Promise}
     */
    renderItem(itemIdentifier, itemData) {
        const config = this.getConfig();
        const itemRunnerConfig = config && config.options && config.options.itemRunnerConfig;
        const assetManager = this.getAssetManager();
        const settings = this.settingsStore.get();
        const toolsState = this.testSessionUserDataService.getToolsStore().getItemToolsState(itemIdentifier);
        const { rubrics, validateResponses } = this.getTestContext();
        const categories = this.getDataHolder().getCurrentItem().categories;
        //set up the item runner
        return new Promise((resolve, reject) => {
            this.itemRunner = itemRunnerFactory(config.itemRunner || providerName, itemData, {
                settings,
                toolsState,
                itemRunnerConfig,
                assetManager,
                renderer: 'common',
                itemContainerHeight: 'var(--testrunner-item-container-height)',
                itemContainerOffsetTop: 'var(--testrunner-header-height)',
                itemContainerWidth: 'var(--testrunner-item-container-width)',
                itemContainerOffsetRight: 'var(--testrunner-item-container-offset-right)',
                getAttachmentsUploadData: (...args) => this.getProxy().getAttachmentsUploadData(...args),
                testContext: { rubricBlock: rubrics, validateResponses },
                categories
            })
                .on('error.renderitem', err => {
                    err.itemIdentifier = itemIdentifier;
                    reject(err);
                })
                .on('render.renderitem', () => {
                    if (this.itemRunner) {
                        if (itemData.itemState) {
                            this.itemRunner.setState(itemData.itemState);
                        }
                    }
                    this.setTestSessionStatus(testSessionStatus.interacting);

                    this.guidedNavFallback?.start();

                    if (this.timersService && !isItemModalFeedbackState(this.getTestContext())) {
                        this.timersService.start(this.getTestContext());
                    }

                    this.trigger('enablenav', { reason: disableNavReasons.moving });

                    this.after('renderitem.renderitem-proctorsocketsubscribe', () => {
                        this.off('renderitem.renderitem-proctorsocketsubscribe');
                        //will start replaying events immediately, so looks safer to completely finish renderItem flow first
                        this.trigger('proctor-socket-subscribe');
                    });

                    if (this.itemRunner) {
                        this.itemRunner.off('render.renderitem');
                        this.itemRunner.off('error.renderitem');
                    }
                    resolve();
                })
                .on('toolsstatechange', newState => {
                    //if the item runner wants to store an "item managed" tool state, we app
                    if (newState && typeof newState === 'object') {
                        const toolsStore = this.testSessionUserDataService.getToolsStore();
                        for (let key of Object.keys(newState)) {
                            toolsStore.setItemToolState(itemIdentifier, key, newState[key]);
                        }
                    }
                })
                .on('pendingoperationschange', ({ addedKey, deletedKey, cleared }) => {
                    if (addedKey) {
                        this.trigger('disablenav', { reason: disableNavReasons.pendingOps, key: addedKey });
                    } else if (deletedKey) {
                        this.trigger('enablenav', { reason: disableNavReasons.pendingOps, key: deletedKey });
                    } else if (cleared) {
                        this.trigger('enablenav', { reason: disableNavReasons.pendingOps });
                    }
                })
                .on('sequence-ended-nav-next', () => {
                    const testPart = this.getDataHolder()?.getCurrentTestPart();
                    const currentItem = this.getDataHolder()?.getCurrentItem();

                    if (!testPart.isLinear && isLastItemOfPart(currentItem, testPart)) {
                        this.trigger('open-overview'); // assumes standard navigator plugin
                    } else {
                        this.next('item');
                    }
                })
                .init()
                .render(this.getAreaBroker().getContentArea());
        });
    },

    /**
     * Unload the current item
     * @param {String} itemIdentifier
     * @returns {Promise}
     */
    // eslint-disable-next-line no-unused-vars
    unloadItem(itemIdentifier) {
        return new Promise(resolve => {
            this.guidedNavFallback?.stop();
            this.clearItemHangerMessages();

            if (this.timersService) {
                this.timersService.stop();
            }
            if (this.itemTimerUnsubscribe) {
                this.itemTimerUnsubscribe();
                this.itemTimerUnsubscribe = null;
            }

            this.trigger('proctor-socket-unsubscribe');

            this.setTestSessionStatus(testSessionStatus.loading);
            if (this.itemRunner) {
                this.itemRunner.on('clear', () => {
                    this.itemRunner = null;
                    resolve();
                });
                this.itemRunner.clear();
            } else {
                resolve();
            }
        });
    },

    /**
     * Disable the current item
     * Caller is responsible for setting correct testSessionStatus
     * @param {String} itemIdentifier
     * @returns {Promise}
     */
    // eslint-disable-next-line no-unused-vars
    disableItem(itemIdentifier) {
        const mainElement = this.getAreaBroker().getMainArea();
        this.mainElementScrollTop = mainElement.scrollTop;
        mainElement.scrollTop = 0;

        this.clearItemHangerMessages();

        if (this.itemTimerUnsubscribe) {
            this.itemTimerUnsubscribe();
            this.itemTimerUnsubscribe = null;
        }

        this.guidedNavFallback?.stop();

        if (this.itemRunner) {
            return this.itemRunner.suspend();
        }

        return Promise.resolve();
    },

    /**
     * Enable item
     * @param {String} itemIdentifier
     * @returns {Promise}
     */
    // eslint-disable-next-line no-unused-vars
    enableItem(itemIdentifier) {
        if (this.itemRunner && this.getTestSessionStatus() !== testSessionStatus.interacting) {
            this.trigger('proctor-socket-unsubscribe');
            //stop timers while proxy is refreshing item definition
            if (this.timersService) {
                this.timersService.stop();
            }

            let itemRunnerHasError;
            this.itemRunner.on('error.enableitem', err => {
                itemRunnerHasError = true;
                this.handleError(err);
            });
            // refresh proxy's stored item definition if needed
            return this.getProxy()
                .getItem(this.getCurrentItemIdentifier())
                .then(itemData => this.itemRunner.setData(itemData))
                .then(() => this.itemRunner.resume())
                .then(() => {
                    this.itemRunner.off('error.enableitem');
                    if (itemRunnerHasError) {
                        return; //error was already handled
                    }

                    this.setTestSessionStatus(testSessionStatus.interacting);

                    this.trigger('enablenav', { reason: disableNavReasons.moving });

                    this.guidedNavFallback?.start();

                    if (this.timersService) {
                        this.timersService.start(this.getTestContext());
                    }

                    if (this.mainElementScrollTop !== null) {
                        const mainElement = this.getAreaBroker().getMainArea();
                        mainElement.scrollTop = this.mainElementScrollTop;
                        this.mainElementScrollTop = null;
                    }

                    this.after('enableitem.renderitem-proctorsocketsubscribe', () => {
                        this.off('enableitem.renderitem-proctorsocketsubscribe');
                        //will start replaying events immediately, so looks safer to completely finish enableItem flow first
                        this.trigger('proctor-socket-subscribe');
                    });

                    return this.checkItemOpen('enableItem');
                })
                .catch(err => {
                    this.handleError(err);
                });
        }
        return Promise.resolve();
    },

    /**
     * Move next in the test
     * @param {String} scope - item, section, testPart, test
     */
    next(scope) {
        this.trigger('move', 'next', scope);
    },

    /**
     * Move backward in the test
     * @param {String} scope - item, section, testPart, test
     */
    previous(scope) {
        this.trigger('move', 'previous', scope);
    },

    /**
     * Jump to a given item
     * @param {number} position - the target position of the jump (index in the whole test)
     * @returns {Promise|void}
     */
    jump(position) {
        if (
            position === this.getTestContext().itemPosition &&
            !this.getItemState(this.getCurrentItemIdentifier(), 'loaded')
        ) {
            return this.startItemSession();
        }
        this.trigger('move', 'jump', 'item', position);
    },

    /**
     * Move in the test (bypassing current item checks & submission)
     * @param {String} scope - item, section, testPart
     * @param {String} direction - next, prev, jump
     * @param {Number} position - the position where to move (for jumps)
     */
    skip(scope, direction, position) {
        this.trigger('move', direction, scope, position, false); // submitResponse: false
    },

    /**
     * Pause by proctor. Corresponds to `isPausedByProctorUiFlow`, but doesn't handle it
     *  @returns {Promise}
     */
    pause() {
        //parent sets `testRunner.getState('pause', true)`;
        this.trigger('pause');
        return Promise.resolve();
    },

    /**
     * Resume by proctor. Corresponds to `isPausedByProctorUiFlow`, but doesn't handle it
     *  @returns {Promise}
     */
    resume() {
        //parent sets `testRunner.getState('pause', false)`
        this.trigger('resume');
        return Promise.resolve();
    },

    /**
     * Finish the test
     * @returns {Promise}
     */
    finish() {
        this.after('destroy', () => {
            const testStore = this.getTestStore();
            if (testStore) {
                return testStore.remove();
            }
        });
        this.destroy();
        return Promise.resolve();
    },

    /**
     * Destroy the test runner
     */
    destroy() {
        if (this.testLayout) {
            unmount(this.testLayout);
        }

        this.guidedNavFallback?.stop();

        if (this.testSessionUserDataService) {
            this.testSessionUserDataService.stopSyncWithStorage();
        }

        if (Array.isArray(this.storeSubscriptions) && this.storeSubscriptions.length) {
            this.storeSubscriptions.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            this.storeSubscriptions = [];
        }

        if (this.socketProxy) {
            this.socketProxy.disconnect();
        }
        if (this.timersService) {
            this.timersService.destroy();
        }
        if (this.navigationFeedbacksStore) {
            this.navigationFeedbacksStore.clear();
        }
        getConfigStore().clear();

        window.removeEventListener('unhandledrejection', this.handleUnhandledPromiseRejection);
    }
};
