// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import PreviewerTestLayout from './layout/PreviewerTestLayout.svelte';
import {
    getTestStateStore,
    getTestSessionStatusStore
} from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';
import { testSessionStatus } from '@oat-sa-private/tao-test-runner-qtinui/src/runner/session/sessionStates.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import areaBrokerFactory from '@oat-sa-private/tao-test-runner-qtinui/src/runner/areaBroker.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner.js';
import getAssetManager from '@oat-sa-private/tao-test-runner-qtinui/src/runner/config/assetManager.js';
import testStoreFactory from 'taoTests/runner/testStore.js';
import { tick } from 'svelte';

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

export const providerName = 'qtiPreviewer';

/**
 * The QTI-Previewer test runner provider
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
        return proxyFactory(config.provider.proxy, config);
    },

    loadProbeOverseer() {
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
        //keeps store's subscriptions to close them when destroying
        this.storeSubscriptions = [];

        const testSessionStatusStore = getTestSessionStatusStore(getServiceCallId(this.getConfig()));

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
         * Move :
         *  - end the current item session
         *  - load and set the new context
         *  - compute the next action
         * @param {string} [direction=next]  - next, previous, jump
         * @param {string} [scope=item] - item, section or testPart
         * @param {number} [ref] - the position where to move (for jumps)
         * @returns {Promise?}
         */
        this.move = (direction = 'next', scope = 'item', ref) =>
            new Promise(resolve => {
                this.trigger('disablenav');
                this.on('unloaditem.moving', () => {
                    this.off('unloaditem.moving');
                    resolve();
                });
                this.unloadItem(this.getCurrentItemIdentifier());
            })
                .then(() =>
                    this.getProxy().callItemAction(this.getCurrentItemIdentifier(), 'move', {
                        direction,
                        scope,
                        ref
                    })
                )
                .then(results => {
                    if (!results || !results.testContext) {
                        throw new Error('No testContext received');
                    }
                    this.setTestContext(results.testContext);
                    if (results.testMap) {
                        this.setTestMap(results.testMap);
                    }
                    this.trigger('previewer-move', this.getTestContext().itemPosition);
                    return this.loadItem(this.getCurrentItemIdentifier());
                })
                .catch(err => {
                    this.handleError(err);
                });

        /**
         * Handles error and redirect to exit page
         * @param {Error} err - an error or a type of error message
         */
        this.handleError = err => {
            this.trigger('error', err);
        };
    },

    /**
     * Initialize the test runner
     * @returns {Promise} when the test runner is initialized
     */
    init() {
        const config = this.getConfig();

        this.setTestSessionStatus(testSessionStatus.initial);

        //we prepare the layout early
        this.testLayout = new PreviewerTestLayout({
            target: getContainer(config),
            props: {
                serviceCallId: getServiceCallId(config)
            }
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

        const setCustomUiId = results => {
            if (!results || !results.metadata || !Array.isArray(results.metadata['ui-engine'])) {
                return;
            }

            const setting = results.metadata['ui-engine'].find(uiSetting =>
                uiSetting.startsWith('testRunnerConfiguration_ui-engine')
            );
            if (setting) {
                config.options.customUiId = setting.split(':')[1];
            }
        };

        return initLayout()
            .then(() => this.getProxy().init())
            .then(results => {
                if (!results || !results.testContext || !results.testMap) {
                    throw new Error('No data received for this test');
                }
                this.setTestMap(results.testMap);
                this.setTestContext(results.testContext);
                setCustomUiId(results);
            });
    },

    /**
     * The rendering stage
     */
    render() {
        //first action, the TR is initialized ready to be rendered
        this.loadItem(this.getCurrentItemIdentifier());
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

        const testContext = this.getTestContext();
        return this.getProxy().getItem(itemIdentifier, testContext.locale);
    },

    /**
     * Render the given item
     * @param {String} itemIdentifier - the item identifier
     * @param {Object} itemData - the loaded item data
     * @returns {Promise}
     */
    renderItem(itemIdentifier, itemData) {
        const config = this.getConfig();
        const itemRunnerConfig = Object.assign({}, config && config.options && config.options.itemRunnerConfig);
        const assetManager = getAssetManager(config.serviceCallId, { staticUrl: config.staticUrl });

        //set up the item runner
        return tick().then(
            () =>
                new Promise((resolve, reject) => {
                    this.itemRunner = itemRunnerFactory(config.provider.itemRunner, itemData, {
                        itemRunnerConfig,
                        assetManager,
                        itemContainerHeight: 'var(--testrunner-item-container-height)',
                        itemContainerOffsetTop: 'var(--testrunner-header-height)',
                        itemContainerWidth: 'var(--testrunner-item-container-width)',
                        itemContainerOffsetRight: 'var(--testrunner-item-container-offset-right)',
                        getAttachmentsUploadData: () =>
                            Promise.resolve({
                                uploadServiceType: 'sandbox'
                            })
                    })
                        .on('error', reject)
                        .on('render', () => {
                            this.setTestSessionStatus(testSessionStatus.interacting);
                            this.trigger('enablenav');
                            resolve();
                        })
                        .init()
                        .render(this.getAreaBroker().getContentArea());
                })
        );
    },

    /**
     * Unload the current item
     * @returns {Promise}
     */
    unloadItem() {
        return new Promise(resolve => {
            this.setTestSessionStatus(testSessionStatus.loading);
            if (this.itemRunner) {
                this.itemRunner.on('clear', resolve);
                this.itemRunner.clear();
            } else {
                resolve();
            }
        });
    },

    /**
     * Move next in the test
     * @param {String} scope - item, section, testPart
     * @returns {Promise}
     */
    next(scope) {
        return this.move('next', scope);
    },

    /**
     * Move backward in the test
     * @param {String} scope - item, section, testPart
     * @returns {Promise}
     */
    previous(scope) {
        return this.move('previous', scope);
    },

    /**
     * Jump to a given item
     * @param {number} position - the target position of the jump (index in the whole test)
     * @returns {Promise}
     */
    jump(position) {
        return this.move('jump', 'item', position);
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
            this.testLayout.$destroy();
        }

        if (Array.isArray(this.storeSubscriptions) && this.storeSubscriptions.length) {
            this.storeSubscriptions.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            this.storeSubscriptions = [];
        }
    }
};
