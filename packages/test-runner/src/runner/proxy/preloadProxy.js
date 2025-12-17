// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// https://hub.taotesting.com/techdocs/tao-test/test-runner#proxy
import { cloneDeep, defaults } from 'lodash';
import { itemPathForPosition } from '../util/testMap.js';
import { getSectionItems, limitSectionItems } from '../util/section.js';
import { getNewPosition } from '../util/movement.js';
import { getItemsStore } from '../itemsStore.js';
import { waitForResponsePromises } from '../util/response.js';
import { getAttachmentsUploadData, doRequest } from './shared.js';
import ExpiryError from 'taoDeliverAppsCommon/core/error/ExpiryError.js';

const preloadStrategies = {
    none: 'none', // load only the requested item (no preload)
    nextItem: 'nextItem', // load one item and the next one after it
    sectionItems: 'sectionItems' // load all the items in a test section together
};

/**
 * The proxy's default configuration
 */
const defaultConfig = {
    preloadStrategy: preloadStrategies.none,
    preloadSectionItemsAmount: 10,
    preloadItemStoreCapacity: 20
};

/**
 * This is a COPY of the action proxy but it uses:
 *  - an external item store
 *  - preloading strategies:
 *    - the next item
 *    - all items of the current section
 */
const proxy = {
    name: 'preload-actions-proxy',

    /**
     * Installs the proxy behavior
     * @param {Object} initConfig - config from test runner via proxy API
     */
    install(initConfig) {
        // proxy config comes either from test runner config, or local default
        this.proxyConfig = defaults({}, initConfig.options && initConfig.options.proxy, defaultConfig);

        if (!(this.proxyConfig.preloadStrategy in preloadStrategies)) {
            throw new Error(
                `Invalid preloadStrategy "${
                    this.proxyConfig.preloadStrategy
                }" defined for preloadProxy. Valid strategies are: ${Object.values(preloadStrategies)}.`
            );
        }

        /**
         * Prepare parameters for all actions
         * @param {Object[]} actions
         * @param {number} timestamp
         * @returns {Promise} when all actions have been prepared, with parameters
         */
        this.prepareActions = (actions, timestamp) =>
            Promise.all(
                actions.map(({ name, parameters: actionParams }) =>
                    this.prepareParams(actionParams).then(parameters => ({
                        name,
                        id: `${name}_${timestamp}`,
                        timestamp,
                        parameters
                    }))
                )
            );

        /**
         * Some parameters needs special handling...
         * @param {Object} actionParams - the input parameters
         * @returns {Object} output parameters
         */
        this.prepareParams = actionParams => {
            if (!actionParams || typeof actionParams !== 'object') {
                return actionParams;
            }

            return waitForResponsePromises(actionParams).then(resolvedActionParams => {
                //some parameters need to be JSON.stringified
                const stringifyParams = ['itemState', 'itemResponse', 'toolStates'];

                return Object.keys(resolvedActionParams).reduce(
                    (memo, key) =>
                        Object.assign(memo, {
                            [key]: stringifyParams.includes(key)
                                ? JSON.stringify(resolvedActionParams[key])
                                : actionParams[key]
                        }),
                    {}
                );
            });
        };

        /**
         * Process multiples actions
         * @param {Object[]} actions
         * @returns {Promise<Object[]>} resolves with the processed actions responses
         */
        this.processActions = (actions = []) => {
            let actionsRequestInfo;
            return this.prepareActions(actions, Date.now())
                .then(actionsRequest => {
                    const requestOptions = {
                        jwtTokenHandler: this.config.jwtTokenHandler,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify([
                            {
                                channel: 'actions',
                                message: { actions: actionsRequest }
                            }
                        ])
                    };
                    if (typeof this.config.requestTimeout === 'number') {
                        requestOptions.timeout = this.config.requestTimeout;
                    }
                    actionsRequestInfo = actionsRequest;
                    return requestOptions;
                })
                .then(async requestOptions => doRequest(this.config.serviceUrl, requestOptions))
                .catch(err => {
                    if (err) {
                        //add more info about actions; may be useful in investigations
                        const actionNames = (actionsRequestInfo || []).map(actionParams => actionParams?.name);
                        const actionsInfoStr = actionNames
                            .filter((actionName, idx) => idx === actionNames.indexOf(actionName))
                            .join(',');
                        err.message = `${err.message} (actions: ${actionsInfoStr})`;
                    }
                    throw err;
                });
        };

        /**
         * Process an action
         * @param {string} name - Name of the action
         * @param {object} [parameters] - Optional additional parameters
         * @returns {Promise<Object>} - resolves with the processed action responses
         */
        this.processAction = (name, parameters = {}) =>
            this.processActions([
                {
                    name,
                    parameters
                }
            ]).then(results => {
                if (results && results.length) {
                    return results[0];
                }
            });

        /**
         * @typedef {Object} ItemDefinition - item format for store
         * @property {String} baseUrl
         * @property {String} itemIdentifier
         * @property {Object} itemData
         * @property {Object} [itemState]
         * @property {Object} [itemResponse]
         * @property {Object} [flags]
         */

        /**
         * Change parts of an item definition
         * @param {String} itemIdentifier
         * @param {ItemDefinition} item
         * @returns {ItemDefinition} normalized item
         */
        this.normalizeItemDefinition = (itemIdentifier, item) => {
            const definition = cloneDeep(item);
            if (definition && definition.itemState && typeof definition.itemState === 'string') {
                try {
                    definition.itemState = JSON.parse(definition.itemState);
                } catch (err) {
                    throw new Error(
                        `Unable to restore the state of ${itemIdentifier} (invalid format) : ${err.message}`
                    );
                }
            }
            return definition;
        };

        /**
         * Set a new itemsStore entry
         * @param {String} itemIdentifier
         * @param {ItemDefinition} item
         */
        this.setStoredItem = (itemIdentifier, item) => {
            const definition = this.normalizeItemDefinition(itemIdentifier, item);
            this.itemsStore.setItem(itemIdentifier, definition);
        };

        /**
         * Update an itemsStore entry with a new value
         * @param {String} itemIdentifier
         * @param {ItemDefinition} item
         */
        this.updateStoredItem = (itemIdentifier, item) => {
            const definition = this.normalizeItemDefinition(itemIdentifier, item);
            this.itemsStore.updateItem(itemIdentifier, definition);
        };

        /**
         * Set flag on fetched items containing assets. Used by preloadNextItemAssets plugin.
         * @param {ItemDefinition} item
         */
        this.flagItemAssets = item => {
            const { assets } = item.itemData;
            if (assets && Object.keys(assets).length) {
                item.flags = Object.assign({}, item.flags, { containsNonPreloadedAssets: true });
            }
            this.updateStoredItem(item.itemIdentifier, item);
        };

        /**
         * Fetch static items data from the init-items endpoint
         * This call is more performant on BE than fetchItemsDynamic, since no user data needs to be appended.
         * @param {String[]} unfetchedItemIds - all item ids to be fetched
         * @param {String} mainItemIdentifier - the id of the main item with which request params should be sent
         * @returns {Promise<ItemDefinition[]>} - resolves with the data of all the fetched items
         */
        this.fetchItemsStatic = async (unfetchedItemIds, mainItemIdentifier) => {
            // prepare GET fetch request
            const initItemsUrl = new URL(this.config.initItemsUrl); // query params are added below

            const requestOptions = {
                jwtTokenHandler: this.config.jwtTokenHandler,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            if (typeof this.config.requestTimeout === 'number') {
                requestOptions.timeout = this.config.requestTimeout;
            }

            //for multi-language deliveries request with specified locale
            const selectedLocale = this.config.options.localization && this.config.options.localization.locale;
            const mainLocale = this.config.options.localization && this.config.options.localization.mainLocale;
            if (selectedLocale && selectedLocale !== mainLocale) {
                initItemsUrl.searchParams.append('locale', selectedLocale);
            }

            let results;
            try {
                unfetchedItemIds.forEach(itemId => {
                    initItemsUrl.searchParams.append('itemId[]', itemId);
                });
                results = await doRequest(initItemsUrl.href, requestOptions);
            } catch (err) {
                //retry once, because it's not clear if this error is recoverable or not
                if (err && err.isResponseToJsonError) {
                    initItemsUrl.searchParams.delete('itemId[]');
                    initItemsUrl.searchParams.append('itemId[]', mainItemIdentifier);
                    results = await doRequest(initItemsUrl.href, requestOptions); // uncaught
                } else {
                    throw err;
                }
            }
            return results;
        };

        /**
         * Fetch one item state from the actions endpoint
         * @param {String} itemIdentifier - the id of the item with which request params should be sent
         * @param {Object} params - any request params
         * @returns {Promise<ItemDefinition>} - resolves with the data of the fetched item
         */
        this.fetchItemDynamic = async (itemIdentifier, params) => {
            let results;
            try {
                results = await this.processAction('getItemDynamic', Object.assign({}, params, { itemIdentifier }));
            } catch (err) {
                //retry once, because it's not clear if this error is recoverable or not
                if (err && err.isResponseToJsonError) {
                    results = await this.processAction('getItemDynamic', Object.assign({}, params, { itemIdentifier }));
                } else {
                    throw err;
                }
            }
            return results;
        };

        /**
         * Get the item data for multiple items in one request
         * The fetch will be done in 2 parts: all static data (definitions), then all dynamic (states)
         * Items already present in local store will be skipped
         * @param {String[]} itemIds - all item ids to be fetched
         * @param {String} mainItemIdentifier - the id of the main item with which request params should be sent
         * @param {Object} params - any request params
         * @param {Boolean} includeCurrent - if true, fetch the dynamic data for the main item
         * @returns {Promise<ItemDefinition[]>} - resolves with the data of all the fetched items
         */
        this.fetchItems = async (itemIds, mainItemIdentifier, params, includeCurrent = true) => {
            const unfetchedItemIds = itemIds.filter(itemId => this.itemsStore.getItem(itemId) === null);

            if (unfetchedItemIds && unfetchedItemIds.length) {
                // first, fetch the static item data for the items we don't have
                const staticResults = await this.fetchItemsStatic(unfetchedItemIds, mainItemIdentifier);
                staticResults.forEach(itemData => this.setStoredItem(itemData.itemIdentifier, itemData));
            }

            if (includeCurrent) {
                // second, fetch the dynamic item state for the main item
                const dynamicResult = await this.fetchItemDynamic(mainItemIdentifier, params);
                if (dynamicResult) {
                    this.updateStoredItem(dynamicResult.itemIdentifier, dynamicResult);
                }
            }

            return itemIds.map(itemId => this.itemsStore.getItem(itemId)).filter(item => item !== null);
        };

        /**
         * Load currently requested item and the next
         * @param {String} itemIdentifier - currently requested item id
         * @param {Object} params - passed along for 'actions' request
         * @param {Boolean} [includeCurrent=true] include or exclude currently requested item
         * @returns {Promise<ItemDefinition[]>} - resolves with the data of all the fetched items
         */
        this.preloadNextItem = (itemIdentifier, params, includeCurrent = true) => {
            const testMap = this.getDataHolder().getTestMap();
            const testContext = this.getDataHolder().getTestContext();
            const newPosition = getNewPosition({ direction: 'next' }, testMap, testContext);
            const { itemId: nextItemIdentifier } = itemPathForPosition(testMap, newPosition);

            if (includeCurrent) {
                if (nextItemIdentifier === itemIdentifier && !this.itemsStore.has(itemIdentifier)) {
                    // fetch current item only
                    return this.fetchItems([itemIdentifier], itemIdentifier, params, includeCurrent);
                }
                // fetch current item and next
                return this.fetchItems([itemIdentifier, nextItemIdentifier], itemIdentifier, params, includeCurrent);
            } else {
                if (nextItemIdentifier === itemIdentifier || this.itemsStore.has(nextItemIdentifier)) {
                    return Promise.resolve([]);
                }
                // fetch next item only
                return this.fetchItems([nextItemIdentifier], nextItemIdentifier, params, includeCurrent);
            }
        };

        /**
         * Load a number of items belonging to current section (respecting configured limits on preloads and store)
         * @param {String} itemIdentifier - currently requested item id
         * @param {Object} params - passed along for 'actions' request
         * @param {Boolean} [includeCurrent=true] include or exclude currently requested item
         * @returns {Promise<ItemDefinition[]>} - resolves with the data of all the fetched items
         */
        this.preloadSectionItems = (itemIdentifier, params, includeCurrent = true) => {
            const { preloadSectionItemsAmount, preloadItemStoreCapacity } = this.proxyConfig;
            const testMap = this.getDataHolder().getTestMap();
            const testPart = this.getDataHolder().getCurrentTestPart();
            const section = this.getDataHolder().getCurrentSection();

            if (testMap && testPart && section) {
                this.itemsStore.removeExpired();
                const freeSpace = preloadItemStoreCapacity - this.itemsStore.size();
                const maxFetchItems = Math.min(preloadSectionItemsAmount, freeSpace);

                const sectionItems = getSectionItems(testMap, testPart.id, section.id);
                const excludeItems = this.itemsStore.keys();
                if (!includeCurrent) {
                    excludeItems.push(itemIdentifier);
                }
                const limitedSectionItems = limitSectionItems(
                    sectionItems,
                    excludeItems,
                    itemIdentifier,
                    maxFetchItems
                );
                return this.fetchItems(limitedSectionItems, itemIdentifier, params, includeCurrent);
            }
            return Promise.resolve([]);
        };

        /**
         * Preload items according to the configured strategy
         * @param {String} itemIdentifier - The identifier of the main item
         * @param {Object} [params] - additional parameters
         * @param {Boolean} includeCurrent - include the main item, or not
         * @returns {Promise<ItemDefinition[]>}
         */
        this.startPreload = async (itemIdentifier, params, includeCurrent = true) => {
            const { preloadStrategy } = this.proxyConfig;

            if (preloadStrategy === preloadStrategies.none) {
                if (includeCurrent) {
                    return this.fetchItems([itemIdentifier], itemIdentifier, params, includeCurrent);
                }
            } else if (preloadStrategy === preloadStrategies.nextItem) {
                return this.preloadNextItem(itemIdentifier, params, includeCurrent);
            } else if (preloadStrategy === preloadStrategies.sectionItems) {
                return this.preloadSectionItems(itemIdentifier, params, includeCurrent);
            }
            return Promise.resolve([]);
        };

        /**
         * Get info needed to upload a file that will be included somewhere in item response.
         * Used to add images in ExtendedText interaction.
         * Public method and is intended to be called from outside, even though it doesn't belong to proxy interface
         * @public
         * @param {String} itemIdentifier
         * @param {String} responseIdentifier
         * @param {Object} options
         * @returns {Promise<Object>}
         */
        this.getAttachmentsUploadData = (itemIdentifier, responseIdentifier, options) =>
            getAttachmentsUploadData(this.config, itemIdentifier, responseIdentifier, options);
    },

    /**
     * Initializes the proxy
     * @param {Object} config - The config provided to the proxy factory
     * @param {Object} [params] - Some optional parameters to join to the call
     * @returns {Promise<Object>} - Returns a promise. The proxy will be fully initialized on resolve.
     *                      Any error will be provided if rejected.
     */
    init(config, params) {
        this.config = config;
        this.itemsStore = getItemsStore(this.config.serviceCallId);
        this.itemsStore.setConfig({
            ttl: this.config.itemStoreTTL,
            capacity: this.proxyConfig.preloadItemStoreCapacity
        });

        return this.processAction('init', params);
    },

    /**
     * Uninstalls the proxy
     * @returns {Promise<Object>} - Returns a promise. The proxy will be fully uninstalled on resolve.
     *                      Any error will be provided if rejected.
     */
    destroy() {
        if (this.itemsStore) {
            this.itemsStore.clear();
            this.itemsStore = null;
        }
        return Promise.resolve();
    },

    /**
     * Sends the test variables
     * @param {Object} variables
     * @returns {Promise<Object>} - Returns a promise. The result of the request will be provided on resolve.
     *                      Any error will be provided if rejected.
     * @fires sendVariables
     */
    sendVariables(variables) {
        return this.processAction('storeTraceData', variables);
    },

    /**
     * Calls an action related to the test
     * @param {String} action - The name of the action to call
     * @param {Object} [params] - Some optional parameters to join to the call
     * @returns {Promise<Object>} - Returns a promise. The result of the request will be provided on resolve.
     *                      Any error will be provided if rejected.
     */
    callTestAction(action, params) {
        return this.processAction(action, params);
    },

    /**
     * Calls an action related to a particular item and update state of item, if it is specified
     * @param {String} itemIdentifier - The identifier of the item for which call the action
     * @param {String} action - The name of the action to call
     * @param {Object} [params] - Some optional parameters to join to the call
     * @returns {Promise<Object>} - Returns a promise. The result of the request will be provided on resolve.
     *                      Any error will be provided if rejected.
     */
    callItemAction(itemIdentifier, action, params) {
        // update the item state
        if (params.itemState) {
            const item = this.itemsStore.getItem(itemIdentifier);
            if (item) {
                item.itemState = params.itemState;
                this.updateStoredItem(itemIdentifier, item);
            }
        }

        return this.processAction(
            action,
            Object.assign({}, params, {
                itemIdentifier
            })
        );
    },

    /**
     * Gets an item definition by its identifier, also gets its current state
     * @param {String} itemIdentifier - The identifier of the item to get
     * @param {Object} [params] - additional parameters
     * @returns {Promise<ItemDefinition>} - Returns a promise. The item data will be provided on resolve.
     *                                      Any error will be provided if rejected.
     */
    getItem(itemIdentifier, params) {
        const storedItem = this.itemsStore.getItem(itemIdentifier);

        // If the item definition is in the store and valid, just fetch its dynamic state (this is mandatory every time) and return the merged item.
        // Also start a preload of some other static items, to complete asynchronously.
        if (storedItem) {
            return this.fetchItemDynamic(itemIdentifier, params).then(dynamicResult => {
                if (dynamicResult) {
                    this.updateStoredItem(dynamicResult.itemIdentifier, dynamicResult);
                }
                const itemData = this.itemsStore.getItem(itemIdentifier);
                // itemData can be falsy if fetchItemDynamic took more seconds than the stored item had left to live
                if (!itemData) {
                    throw new ExpiryError(
                        `preloadProxy: getItem did not return value (probable expiry), itemId=${itemIdentifier}`
                    );
                }
                this.startPreload(itemIdentifier, params, false).then(loadedItems => {
                    loadedItems?.forEach(item => this.flagItemAssets(item));
                });
                return itemData;
            });
        }
        // Otherwise, start a full preload, including the requested item, and return the full item when preload completes.
        return this.startPreload(itemIdentifier, params, true).then(loadedItems => {
            loadedItems.forEach(item => this.flagItemAssets(item));
            // Bypass the itemsStore lookup and assets expiry check.
            // Doing this should avoid a 2nd null itemData, and the following Error,
            // but may render the item with expired assets...
            const itemData = loadedItems.find(item => item.itemIdentifier === itemIdentifier);
            if (!itemData) {
                throw new Error(`preloadProxy: getItem did not return value, itemId=${itemIdentifier}`);
            }
            return itemData;
        });
    },

    /**
     * Submits the state and the response of a particular item
     * @param {String} itemIdentifier - The identifier of the item to update
     * @param {Object} itemState - The state to submit
     * @param {Object} itemResponse - The response object to submit
     * @param {Object} [params] - Some optional parameters to join to the call
     * @returns {Promise<Object>} - Returns a promise. The result of the request will be provided on resolve.
     *                      Any error will be provided if rejected.
     */
    submitItem(itemIdentifier, itemState, itemResponse, params) {
        return this.callItemAction(
            itemIdentifier,
            'submitItem',
            Object.assign({}, params, {
                itemState,
                itemResponse
            })
        );
    },

    /**
     * Sends a telemetry signal
     * @param {String} itemIdentifier - The identifier of the item for which sends the telemetry signal
     * @param {String} signal - The name of the signal to send
     * @param {Object} [params] - Some optional parameters to join to the signal
     * @returns {Promise} - Returns a promise. The result of the request will be provided on resolve.
     *                      Any error will be provided if rejected.
     * @fires telemetry
     */
    telemetry(itemIdentifier, signal, params) {
        return this.processAction('up', params);
    }
};

export default proxy;
