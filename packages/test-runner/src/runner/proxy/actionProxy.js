// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// https://hub.taotesting.com/techdocs/tao-test/test-runner#proxy
import { cloneDeep } from 'lodash';
import request from 'core/fetchRequest';
import { waitForResponsePromises } from '../util/response.js';
import { getAttachmentsUploadData } from './shared.js';

const proxy = {
    name: 'actions-proxy',

    /**
     * Installs the proxy behavior
     */
    install() {
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
        this.processActions = (actions = []) =>
            this.prepareActions(actions, Date.now())
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
                    return requestOptions;
                })
                .then(options => request(this.config.serviceUrl, options))
                .then(requestResponse => {
                    const responses = requestResponse.responses;
                    if (responses) {
                        const response = responses[0];
                        const unsuccessful = response.filter(result => result.success === false);
                        if (unsuccessful.length > 0) {
                            // For all other errors, handle as before
                            const errorMessages = unsuccessful.map(r => `${r.errorCode || 0}: ${r.errorMessage || ''}`);
                            const error = new Error(`Action error: ${errorMessages.join('; ')}`);
                            error.response = requestResponse;
                            if (unsuccessful.some(r => r.errorCode === 409)) {
                                error.errorCode = 409;
                            }
                            throw error;
                        }
                        return response.map(result => result.values);
                    }
                });

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
         * Get an item from the proxy's local store
         * @param {string} itemIdentifier
         * @returns {Promise<Object>} resolves with item
         */
        this.getStoredItem = itemIdentifier => {
            const ttl = this.config.itemStoreTTL || 0;

            // return item from store (only if TTL not expired)
            if (this.itemStore[itemIdentifier] && Date.now() < this.itemStore[itemIdentifier].timestamp + ttl) {
                //even if somebody mutates this object later, it shouldn't affect this store
                const item = cloneDeep(this.itemStore[itemIdentifier].definition);
                return Promise.resolve(item);
            }
            return Promise.resolve(null);
        };

        /**
         * Get info needed to upload a file that will be included somewhere in item response.
         * Used to add images in ExtendedText interaction.
         * Public method and is intended to be called from outside, even though it doesn't belong to proxy interface
         * @public
         * @param {String} itemIdentifier
         * @param {String} responseIdentifier
         * @returns {Promise<Object>}
         */
        this.getAttachmentsUploadData = (itemIdentifier, responseIdentifier) =>
            getAttachmentsUploadData(this.config, itemIdentifier, responseIdentifier);
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
        this.itemStore = {};
        return this.processAction('init', params);
    },

    /**
     * Uninstalls the proxy
     * @returns {Promise<Object>} - Returns a promise. The proxy will be fully uninstalled on resolve.
     *                      Any error will be provided if rejected.
     */
    destroy() {
        if (this.itemStore) {
            this.itemStore = null;
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
        if (params.itemState && this.itemStore[itemIdentifier]) {
            const item = this.itemStore[itemIdentifier].definition;
            if (item) {
                item.itemState = params.itemState;
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
     * @returns {Promise<Object>} - Returns a promise. The item data will be provided on resolve.
     *                      Any error will be provided if rejected.
     */
    getItem(itemIdentifier, params) {
        return this.getStoredItem(itemIdentifier).then(storedItem => {
            if (storedItem) {
                return storedItem;
            }

            return this.callItemAction(itemIdentifier, 'getItem', Object.assign({}, params, { itemIdentifier })).then(
                item => {
                    if (item && item.itemState && typeof item.itemState === 'string') {
                        try {
                            item.itemState = JSON.parse(item.itemState);
                        } catch (err) {
                            throw new Error(
                                `Unable to restore the state of ${itemIdentifier} (invalid format) : ${err.message}`
                            );
                        }
                    }
                    this.itemStore[itemIdentifier] = {
                        timestamp: Date.now(),
                        definition: cloneDeep(item)
                    };
                    return item;
                }
            );
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
