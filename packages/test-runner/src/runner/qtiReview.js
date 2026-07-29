// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import TestReviewLayout from './TestReviewLayout.svelte';
import ItemHeader from './layout/review/ItemHeader.svelte';
import AllItemsFooter from './layout/review/AllItemsFooter.svelte';
import { getTestStateStore, getTestSessionStatusStore } from './testsStateStore.js';
import { testSessionStatus } from './session/sessionStates.js';
import { itemPathForPosition, buildStats, getItemByIdentifier, isItemWaitingForExternalScore } from './util/testMap.js';
import proxyFactory from 'taoTests/runner/proxy';
import areaBrokerFactory from './areaBroker.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner';
import getAssetManager from './config/assetManager.js';
import { reviewResponseDisplays } from './session/reviewResponseDisplays.js';
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
        //TODO load the test store to save data in the browser
        return {};
    },

    /**
     * This method is called before the initialization
     * to setup internal behavior
     */
    install() {
        //preserve current scroll position & item state when enabling/disabling item
        this.mainElementScrollTop = null;

        const testSessionStatusStore = getTestSessionStatusStore(getServiceCallId(this.getConfig()));

        // track itemRunners by itemIdentifier
        this.itemRunnersMap = {};

        // track any non-itemRunner components rendered by self
        this.renderedComponents = [];

        /**
         * Get the current session status
         * @returns {string} the status
         */
        this.getTestSessionStatus = () => testSessionStatusStore.get();

        /**
         * Set the current session status
         * @param {string} status
         */
        this.setTestSessionStatus = status => {
            testSessionStatusStore.set(status);
        };

        /**
         * Get the current item identifier
         * @returns {string?} the identifier
         */
        this.getCurrentItemIdentifier = () => {
            const testContext = this.getTestContext();
            return testContext && testContext.itemIdentifier;
        };

        /**
         * Retrieve the test runner theming informations from the config
         * @returns {Object} the theme
         */
        this.getTheme = () => {
            const config = this.getConfig();
            return (config && config.themes && config.themes.testRunner) || {};
        };

        /**
         * Ends the item session
         * @returns {Promise<Object>} - resolves with full { itemResults } if session endable, or false if not
         */
        this.endItemSession = () =>
            new Promise(resolve => {
                this.trigger('disablenav');

                // Data needed by session helper
                const itemIdentifier = this.getCurrentItemIdentifier();

                // Current item must be un-disabled before moving
                if (this.getItemState(itemIdentifier, 'disabled')) {
                    this.setItemState(itemIdentifier, 'disabled', false);
                }

                this.on('unloaditem.moving', () => {
                    this.off('unloaditem.moving');
                    resolve();
                });
                this.unloadItem();
            });

        /**
         * Disable choice shuffle for all choice interactions
         * @param {object} itemRunnerConfig
         * @returns {object} itemRunnerConfig with disabled choice shuffle
         */
        this.disableChoiceShuffle = itemRunnerConfig => ({
            ...itemRunnerConfig,
            elements: {
                ...itemRunnerConfig?.elements,
                ...[
                    'ChoiceInteraction',
                    'InlineChoiceInteraction',
                    'OrderInteraction',
                    'AssociateInteraction',
                    'GapMatchInteraction',
                    'MatchInteraction'
                ].reduce(
                    (elements, interactionType) => ({
                        ...elements,
                        [interactionType]: {
                            ...itemRunnerConfig?.elements?.[interactionType],
                            propertyOverride: {
                                ...itemRunnerConfig?.elements?.[interactionType]?.propertyOverride,
                                shuffle: false
                            }
                        }
                    }),
                    {}
                )
            }
        });

        /**
         * Renders the item with a particular response display (question/answer/correct)
         * @param {String} itemIdentifier
         * @param {Object} itemData
         * @param {String} reviewResponseDisplay
         * @returns {Promise<void>}
         */
        this.renderItemWithResponse = (itemIdentifier, itemData, reviewResponseDisplay) => {
            const config = this.getConfig();
            let itemRunnerConfig = config?.options?.itemRunnerConfig;
            const showUnShuffled = this.getOptions()?.review?.showUnShuffled;
            // access asset manager by serviceCallId and itemIdentifier to ensure unique asset managers when rendering all items together
            const assetManagerKey = `${config.serviceCallId}_${itemIdentifier}`;
            const assetManager = getAssetManager(assetManagerKey);

            let itemState = {};

            if (reviewResponseDisplay === reviewResponseDisplays.answer) {
                itemState = itemData.itemState || {};
            } else if (reviewResponseDisplay === reviewResponseDisplays.correct && itemData.correctResponse) {
                itemState = Object.keys(itemData.correctResponse).reduce((memo, responseIdentifier) => {
                    memo[responseIdentifier] = {
                        response: itemData.correctResponse[responseIdentifier]
                    };

                    return memo;
                }, {});
            }

            // restores options order from itemState to keep the same order for shuffle choices
            for (let responseIdentifier in itemData.itemState) {
                itemState[responseIdentifier] = {
                    ...itemState[responseIdentifier],
                    optionsOrder: itemData.itemState[responseIdentifier].optionsOrder
                };
            }

            // force disable shuffle choices
            if (
                showUnShuffled &&
                [reviewResponseDisplays.answer, reviewResponseDisplays.correct].includes(reviewResponseDisplay)
            ) {
                itemRunnerConfig = this.disableChoiceShuffle(itemRunnerConfig);
            }

            //set up the item runner
            return new Promise((resolve, reject) => {
                if (this.allItemsMode) {
                    const stateStore = getTestStateStore(getServiceCallId(config));
                    const item = stateStore.getCurrentItem();

                    this.renderedComponents.push(
                        mount(ItemHeader, {
                            target: this.getAreaBroker().getContentArea(),
                            props: {
                                title: item.label || item.identifier
                            }
                        })
                    );
                }

                this.itemRunner = itemRunnerFactory(
                    config.itemRunner || providerName,
                    Object.assign({}, itemData, { itemState }),
                    {
                        itemRunnerConfig,
                        assetManager,
                        reviewSessionSubstate: reviewResponseDisplay,
                        renderer: reviewResponseDisplay === reviewResponseDisplays.question ? 'common' : 'review',
                        itemContainerHeight: 'var(--testrunner-item-container-height)',
                        itemContainerWidth: 'var(--testrunner-item-container-width)',
                        itemContainerOffsetRight: 'var(--testrunner-item-container-offset-right)',
                        getAttachmentsUploadData: (...args) => this.getProxy().getAttachmentsUploadData(...args),
                        getData: (...args) => this.getProxy().getData(...args)
                    }
                )
                    .on('error', reject)
                    .on('render', () => {
                        this.setTestSessionStatus(testSessionStatus.interacting);

                        this.trigger('enablenav');

                        resolve();
                    });

                this.itemRunnersMap[itemIdentifier] = this.itemRunner;

                this.itemRunner.init();
                this.itemRunner.render(this.getAreaBroker().getContentArea());
            });
        };

        /**
         * Destroy all tracked components
         */
        this.destroyRenderedComponents = () => {
            this.renderedComponents.forEach(component => {
                if (component) {
                    unmount(component);
                }
            });
            this.renderedComponents = [];
        };

        /**
         * Get which of review mode tabs is active
         * Public method and is intended to be called from outside, even though it doesn't belong to proxy interface
         * @public
         * @returns {String?}
         */
        this.getResponseDisplay = () => this.testLayout?.getResponseDisplay();

        /**
         * Destroy (clear) item-runner
         * @returns {Promise}
         */
        this.destroyItemRunner = () =>
            new Promise(resolve => {
                if (this.itemRunner) {
                    this.itemRunner.on('clear', () => {
                        this.itemRunner = null;
                        delete this.itemRunnersMap[this.getCurrentItemIdentifier()];
                        resolve();
                    });
                    this.itemRunner.clear();
                } else {
                    resolve();
                }
            });

        /**
         * Destroy (clear) all active item-runners
         * @returns {Promise}
         */
        this.destroyAllItemRunners = () =>
            Promise.all(
                Object.entries(this.itemRunnersMap).map(
                    ([itemIdentifier, itemRunner]) =>
                        new Promise(resolve => {
                            if (itemRunner) {
                                itemRunner.on('clear', () => {
                                    delete this.itemRunnersMap[itemIdentifier];
                                    resolve();
                                });
                                itemRunner.clear();
                            } else {
                                resolve();
                            }
                        })
                )
            );
    },

    /**
     * Initialize the test runner
     * @returns {Promise} when the test runner is initialized
     */
    init() {
        const config = this.getConfig();
        const theme = this.getTheme();

        this.setTestSessionStatus(testSessionStatus.initial);

        this.allItemsMode = !!config?.options?.review?.allInOne;

        //we prepare the layout early
        this.testLayout = mount(TestReviewLayout, {
            target: getContainer(config),
            props: {
                serviceCallId: getServiceCallId(config),
                theme,
                plugins: this.getPlugins() || {},
                options: config.options,
                allItemsMode: this.allItemsMode
            }
        });
        this.testLayout.$on('toolbaraction', event => {
            this.trigger('toolbaraction', event.detail.key);
        });

        this.testLayout.$on('changeResponseDisplay', () => {
            if (this.allItemsMode) {
                this.destroyRenderedComponents();
                this.destroyAllItemRunners().then(() => {
                    this.jump(0);
                });
            } else {
                const itemIdentifier = this.getCurrentItemIdentifier();
                this.unloadItem();
                this.getProxy()
                    .getItem(itemIdentifier)
                    .then(itemData => {
                        this.renderItem(itemIdentifier, itemData);
                    });
            }
        });

        return (
            new Promise((resolve, reject) => {
                this.testLayout.$on('mount', e => {
                    //setup the areas for the broker
                    const areaBroker = this.getAreaBroker();
                    areaBroker.setAreas(e.detail.areas);
                    resolve();
                });
                this.testLayout.$on('error', reject);

                this.setTestSessionStatus(testSessionStatus.loading);
            })

                //load initial data
                .then(() => this.getProxy().init())

                .then(results => {
                    if (!results || !results.testMap) {
                        throw new Error('No data received for this test');
                    }

                    this.setTestMap(buildStats(results.testMap));

                    if (results.testContext && results.testContext.itemIdentifier) {
                        const { testPartId, sectionId, itemIdentifier, itemPosition } = results.testContext;
                        this.setTestContext({
                            itemIdentifier,
                            itemPosition,
                            sectionId,
                            testPartId
                        });
                    } else {
                        const { testPartId, sectionId, itemId } = itemPathForPosition(this.getTestMap(), 0);
                        this.setTestContext({
                            itemIdentifier: itemId,
                            itemPosition: 0,
                            sectionId,
                            testPartId
                        });
                    }
                })
        );
    },

    /**
     * The rendering stage
     */
    render() {
        //first action, the TR is initialized ready to be rendered
        this.loadItem(this.getCurrentItemIdentifier());

        //  render all items via this loop
        if (this.allItemsMode) {
            this.on('renderitem', () => {
                this.next();
            });
        }
    },

    /**
     * Load the given item
     * @param {String} itemIdentifier - the item identifier
     * @returns {Promise<Object>} resolves with item data
     */
    loadItem(itemIdentifier) {
        this.setTestSessionStatus(testSessionStatus.loading);

        const item = getItemByIdentifier(this.getTestMap(), itemIdentifier);

        //load item data
        return this.getProxy()
            .getItem(itemIdentifier)
            .then(itemData => {
                const options = this.getOptions();
                const showCorrect = options && options.review && options.review.showCorrect;
                const showResponse = typeof itemData.itemState !== 'undefined';
                const showQuestion =
                    (showCorrect || showResponse) &&
                    options &&
                    options.review &&
                    typeof options.review.showQuestion !== 'undefined'
                        ? options.review.showQuestion
                        : true;
                const showScore = options && options.review && options.review.showScore;

                this.testLayout.$set({
                    showResponse,
                    showCorrect,
                    showQuestion,
                    showScore,
                    score: item.score,
                    maxScore: item.maxScore,
                    waitingForExternalScore: isItemWaitingForExternalScore(item),
                    scoringData: itemData.extraData?.scoring
                });
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
        return this.renderItemWithResponse(itemIdentifier, itemData, this.getResponseDisplay());
    },

    /**
     * Unload the current item
     * @param {String} itemIdentifier
     * @returns {Promise}
     */
    // eslint-disable-next-line no-unused-vars
    unloadItem(itemIdentifier) {
        this.setTestSessionStatus(testSessionStatus.loading);
        return this.destroyItemRunner();
    },

    /**
     * Disable the current item
     * Caller is responsible for setting correct testSessionStatus
     * @param {String} itemIdentifier
     * @returns {Promise}
     */
    // eslint-disable-next-line no-unused-vars
    disableItem(itemIdentifier) {
        const mainElement = this.getAreaBroker().getContainer().querySelector('#test-main');
        this.mainElementScrollTop = mainElement.scrollTop;
        mainElement.scrollTop = 0;

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
            // refresh proxy's stored item definition if needed
            return this.getProxy()
                .getItem(this.getCurrentItemIdentifier())
                .then(itemData => this.itemRunner.setData(itemData))
                .then(() => this.itemRunner.resume())
                .then(() => {
                    this.setTestSessionStatus(testSessionStatus.interacting);
                    this.trigger('enablenav');

                    if (this.mainElementScrollTop !== null) {
                        const mainElement = this.getAreaBroker().getContainer().querySelector('#test-main');
                        mainElement.scrollTop = this.mainElementScrollTop;
                        this.mainElementScrollTop = null;
                    }
                });
        }
        return Promise.resolve();
    },

    /**
     * Move next in the test
     * @returns {Promise}
     */
    next() {
        const testContext = this.getTestContext();
        const testMap = this.getTestMap();

        if (testContext.itemPosition + 1 >= testMap.stats.total) {
            if (this.allItemsMode) {
                this.renderedComponents.push(
                    mount(AllItemsFooter, {
                        target: this.getAreaBroker().getContentArea(),
                        props: {}
                    })
                );
                return Promise.resolve();
            } else {
                return this.finish();
            }
        }
        return this.jump(testContext.itemPosition + 1);
    },

    /**
     * Move backward in the test
     * @returns {Promise}
     */
    previous() {
        const testContext = this.getTestContext();
        return this.jump(testContext.itemPosition - 1);
    },

    /**
     * Jump to a given item
     * @param {number} itemPosition - the target position of the jump (index in the whole test)
     * @returns {Promise|void}
     */
    jump(itemPosition) {
        const status = this.getTestSessionStatus();
        if (status === testSessionStatus.interacting || status === testSessionStatus.overlay) {
            const endItemPromise = this.allItemsMode ? Promise.resolve() : this.endItemSession();
            return endItemPromise.then(() => {
                const { testPartId, sectionId, itemId } = itemPathForPosition(this.getTestMap(), itemPosition);
                const newTestContext = {
                    itemIdentifier: itemId,
                    itemPosition,
                    sectionId,
                    testPartId
                };
                this.setTestContext(newTestContext);
                this.loadItem(itemId);
            });
        }
    },

    /**
     * Move in the test (bypassing current item checks & submission)
     * @param {String} scope - item, section, testPart
     * @param {String} direction - next, prev, jump
     * @param {Number} position - the position where to move (for jumps)
     * @returns {Promise}
     */
    skip(scope, direction, position) {
        if (direction === 'next') {
            return this.next();
        }

        if (direction === 'previous') {
            return this.previous();
        }

        return this.jump(position);
    },

    /**
     * Finish the test
     * @returns {Promise}
     */
    finish() {
        this.destroyRenderedComponents();
        return this.destroyAllItemRunners().then(() => {
            const config = this.getConfig();
            if (config.batteryContext) {
                this.trigger('testfinished', config.batteryContext);
            }
            return this.destroy();
        });
    },

    /**
     * Destroy the test runner
     */
    destroy() {
        if (this.testLayout) {
            unmount(this.testLayout);
        }
    }
};
