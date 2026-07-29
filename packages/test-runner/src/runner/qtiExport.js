// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import TestLayout from './TestLayout.svelte';
import { getTestStateStore, getTestSessionStatusStore } from './testsStateStore.js';
import { testSessionStatus } from './session/sessionStates.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import areaBrokerFactory from './areaBroker.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner.js';
import getAssetManager from './config/assetManager.js';
import testStoreFactory from 'taoTests/runner/testStore.js';
import { tick, mount, unmount } from 'svelte';
import { itemPathForPosition } from './util/testMap.js';

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

export const providerName = 'qtinuiExport';

const itemRunnerDefaultProviderName = 'qtinui';

/**
 * The QTI-Export test runner provider
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
        return {};
    },

    loadTestStore() {
        const config = this.getConfig();
        const identifier = config.serviceCallId || `test-${Date.now()}`;
        return testStoreFactory(identifier);
    },

    /**
     * This method is called before the initialization
     * to setup internal behavior
     */
    install() {
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
        this.testLayout = mount(TestLayout, {
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

        return initLayout()
            .then(() => this.getProxy().init())
            .then(results => {
                if (!results || !results.testContext || !results.testMap) {
                    throw new Error('No data received for this test');
                }
                this.setTestMap(results.testMap);
                this.setTestContext(results.testContext);
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
        this.setTestSessionStatus(testSessionStatus.loading);
        return this.getProxy().getItem(itemIdentifier);
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
                    this.itemRunner = itemRunnerFactory(config.itemRunner || itemRunnerDefaultProviderName, itemData, {
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
     * Enable item
     */
    enableItem() {
        //to support navigator plugin, which changes status and triggers disablenav, when Overview is opened
        this.setTestSessionStatus(testSessionStatus.interacting);
        this.trigger('enablenav');
    },

    /**
     * Move next in the test
     * @returns {Promise}
     */
    next() {
        const testContext = this.getTestContext();
        const testMap = this.getTestMap();

        if (testContext.itemPosition + 1 >= testMap.stats.total) {
            return this.finish();
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
        return new Promise(resolve => {
            this.trigger('disablenav');

            // Current item must be un-disabled before moving
            const itemIdentifier = this.getCurrentItemIdentifier();
            if (this.getItemState(itemIdentifier, 'disabled')) {
                this.setItemState(itemIdentifier, 'disabled', false);
            }

            this.on('unloaditem.moving', () => {
                this.off('unloaditem.moving');
                resolve();
            });
            this.unloadItem();
        }).then(() => {
            const { testPartId, sectionId, itemId } = itemPathForPosition(this.getTestMap(), itemPosition);
            const newTestContext = {
                itemIdentifier: itemId,
                itemPosition,
                sectionId,
                testPartId
            };
            this.setTestContext(newTestContext);
            return this.loadItem(itemId);
        });
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
        return this.destroy();
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
