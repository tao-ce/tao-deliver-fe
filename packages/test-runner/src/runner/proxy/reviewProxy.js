// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// https://github.com/oat-sa/taohub-articles/blob/master/technical-documentation/tao-test/test-runner.md#proxy

import { doRequest, getData } from './shared.js';
import request from 'core/fetchRequest';

const proxy = {
    name: 'review-proxy',

    /**
     * Installs the proxy behavior
     */
    install() {
        /**
         * Base options for endpoint request
         * @returns {Object}
         */
        this.getBaseRequestOptions = () => {
            const requestOptions = {
                jwtTokenHandler: this.config.jwtTokenHandler,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            if (typeof this.config.requestTimeout === 'number') {
                requestOptions.timeout = this.config.requestTimeout;
            }
            return requestOptions;
        };

        /**
         * Process multiples actions
         * @param {Object[]} actions
         * @returns {Promise<Object[]>} resolves with the processed actions responses
         */
        this.processActions = async (actions = []) => {
            const processedActions = actions.map(action => {
                const timestamp = Date.now();
                return {
                    name: action.name,
                    id: `${action.name}_${timestamp}`,
                    timestamp,
                    parameters: action.parameters
                };
            });

            const requestOptions = Object.assign(this.getBaseRequestOptions(), {
                method: 'POST',
                body: JSON.stringify([
                    {
                        channel: 'actions',
                        message: { actions: processedActions }
                    }
                ])
            });
            return doRequest(this.config.serviceUrl, requestOptions);
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
         * Get an item from the proxy's local store
         * @param {string} itemIdentifier
         * @returns {Promise<Object>} resolves with item
         */
        this.getStoredItem = itemIdentifier => {
            const ttl = this.config.itemStoreTTL || 0;

            // return item from store (only if TTL not expired)
            if (this.itemStore[itemIdentifier] && Date.now() < this.itemStore[itemIdentifier].timestamp + ttl) {
                return Promise.resolve(this.itemStore[itemIdentifier].definition);
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
         * @returns {Promise<Object>} - Promise<{uploadServiceType: 'sandbox'}>
         */
        this.getAttachmentsUploadData = (itemIdentifier, responseIdentifier) => {
            if (!responseIdentifier || !itemIdentifier) {
                throw new Error('Get attachments upload data: missing parameters');
            }
            return Promise.resolve({
                uploadServiceType: 'sandbox'
            });
        };

        /**
         * Generic data fetcher using proxy & application config
         * Public method and is intended to be called from outside, even though it doesn't belong to proxy interface
         * @public
         * @param {string} url
         * @param {object} [requestOptions]
         * @param {object} [handlingOptions]
         * @returns {Promise<*>}
         */
        this.getData = (url, requestOptions, handlingOptions) =>
            getData(this.config, url, requestOptions, handlingOptions);

        /**
         * For Scorer using manual-scoring, save inline comment
         * Public method and is intended to be called from outside, even though it doesn't belong to proxy interface
         * @public
         * @param {String} itemIdentifier
         * @param {Object} model
         * @returns {Promise<Object>}
         */
        this.saveScoringInlineComments = async (itemIdentifier, model) => {
            if (!this.config.saveScoringInlineCommentsUrl) {
                throw new Error('saveScoringInlineComments url is not configured');
            }
            const requestOptions = Object.assign(this.getBaseRequestOptions(), {
                method: 'PUT',
                body: JSON.stringify({
                    itemId: itemIdentifier,
                    comment: model
                })
            });
            return request(this.config.saveScoringInlineCommentsUrl, requestOptions);
        };

        /**
         * For Scorer using manual-scoring, save annotation comments (marking symbols)
         * @public
         * @param {String} itemIdentifier
         * @param {Object} annotations
         * @returns {Promise<Object>}
         */
        this.saveScoringAnnotationComment = async (itemIdentifier, annotations) => {
            if (!this.config.saveScoringAnnotationCommentUrl) {
                throw new Error('saveScoringAnnotationComment url is not configured');
            }
            let responseIdentifier = null;
            if (annotations?.responseIdentifier) {
                responseIdentifier = annotations.responseIdentifier;
            } else if (annotations?.responses && typeof annotations.responses === 'object') {
                const keys = Object.keys(annotations.responses);
                if (keys.length === 1) {
                    [responseIdentifier] = keys;
                }
            }
            const requestOptions = Object.assign(this.getBaseRequestOptions(), {
                method: 'PUT',
                body: JSON.stringify({
                    itemId: itemIdentifier,
                    annotations,
                    ...(responseIdentifier ? { responseIdentifier } : {})
                })
            });
            return request(this.config.saveScoringAnnotationCommentUrl, requestOptions);
        };
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
     * Calls an action related to a particular item and update state of item, if it is specified
     * @param {String} itemIdentifier - The identifier of the item for which call the action
     * @param {String} action - The name of the action to call
     * @param {Object} [params] - Some optional parameters to join to the call
     * @returns {Promise<Object>} - Returns a promise. The result of the request will be provided on resolve.
     *                      Any error will be provided if rejected.
     */
    callItemAction(itemIdentifier, action, params) {
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
                    if (item) {
                        ['itemResponse', 'correctResponse', 'itemState'].forEach(responseName => {
                            if (item[responseName] && typeof item[responseName] === 'string') {
                                try {
                                    item[responseName] = JSON.parse(item[responseName]);
                                    // eslint-disable-next-line no-unused-vars
                                } catch (e) {
                                    delete item[responseName];
                                }
                            }
                        });
                    }
                    this.itemStore[itemIdentifier] = {
                        timestamp: Date.now(),
                        definition: item
                    };
                    return item;
                }
            );
        });
    }
};

export default proxy;
