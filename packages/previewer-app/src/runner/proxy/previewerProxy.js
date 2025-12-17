// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Test runner proxy for the QTI test previewer
 */
import request from 'core/fetchRequest';
import mapHelper from '@oat-sa/tao-test-runner-qti/src/helpers/map';
import ApiError from 'core/error/ApiError';

/**
 * The possible states of the test session,
 * coming from the test context
 * (this state comes from the backend)
 */
const testSessionStates = Object.freeze({
    initial: 0,
    interacting: 1,
    modalFeedback: 2,
    suspended: 3,
    closed: 4
});

/**
 * QTI proxy definition
 * Related to remote services calls
 * @type {Object}
 */
const proxy = {
    name: 'qtiPreviewerProxy',

    /**
     * Installs the proxy
     */
    install() {
        this.makeRequest = ({ url, params }) => {
            const requestUrl = new URL(url);
            if (params) {
                for (const paramKey of Object.keys(params)) {
                    if (params[paramKey]) {
                        requestUrl.searchParams.set(paramKey, params[paramKey]);
                    }
                }
            }
            const requestOptions = {};
            if (typeof this.requestTimeout === 'number') {
                requestOptions.timeout = this.requestTimeout;
            }
            return request(requestUrl.toString(), requestOptions);
        };

        /**
         * Send request, and retry this request on failure
         * @param {Function} requestCallback - `() => Promise<*>` - function to send request
         * @param {Function} shouldRetryCallback - `(err: Error?) => boolean` - on request failure, check if retry is needed for this error
         * @param {Number} retryIntervalMs - interval between subsequent retries; in ms
         * @param {Number} retryTimeoutMs - if this much time passed since first request was sent, stop retrying; in ms. Set to `0` to disable retry.
         * @throws {Error} if can't retry, rethrows error which happened on request
         * @returns {Promise<*>} - resolves with request response
         */
        this.retryUntilFound = async (requestCallback, shouldRetryCallback, retryIntervalMs, retryTimeoutMs) => {
            const timestampStart = Date.now();
            let waiting = true;
            while (waiting) {
                waiting = false;
                try {
                    const response = await requestCallback();
                    return response;
                } catch (err) {
                    const timestampError = Date.now();
                    if (
                        timestampError + retryIntervalMs - timestampStart < retryTimeoutMs &&
                        shouldRetryCallback(err)
                    ) {
                        await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
                        waiting = true;
                    } else {
                        throw err;
                    }
                }
            }
        };
    },

    /**
     * Initializes the proxy
     * @param {Object} configs - configuration from test runner
     * @param {String} configs.proxy.urls
     * @param {String} configs.params.unitId - the identifier of the test to preview
     * @param {String} [configs.params.requestId] - request id which lets backend fetch data from alternative storage
     * @param {String} [configs.params.locale] - the locale of the test to preview. If omitted, API should assume default
     * @param {String} [configs.params.jwt] - jwt token of the test to preview. If omitted, API should expect Authorization header
     * @param {String} [configs.params.itemId] - the identifier of the item to preview. If omitted, first item will be rendered
     * @param {String} [configs.params.uiEngine] - the representation of uiEngine metadata used with technical requestId units
     * @returns {Promise} - Returns a promise. The proxy will be fully initialized on resolve.
     *                      Any error will be provided if rejected.
     */
    init(configs) {
        this.itemStore = {};

        // install proxy config
        this.urls = configs.proxy.urls;
        this.params = configs.params;
        this.requestTimeout = configs.requestTimeout;

        const enableRetry = (this.params.requestId?.length > 0);
        const retryIntervalMs =
            typeof configs.options?.proxy?.retryInterval === 'number' ? configs.options.proxy.retryInterval : 5 * 1000;
        const retryTimeoutMs =
            enableRetry
                ? typeof configs.options?.proxy?.retryTimeout === 'number'
                    ? configs.options.proxy.retryTimeout
                    : 2 * 60 * 1000
                : 0;

        return this.retryUntilFound(
            () =>
                this.makeRequest({
                    url: this.urls.init,
                    params: {
                        unitId: this.params.unitId,
                        requestId: this.params.requestId,
                        locale: this.params.locale,
                        uiEngine: this.params.uiEngine,
                        jwt: this.params.jwt
                    }
                }),
            err => err && err.errorCode === 404,
            retryIntervalMs,
            retryTimeoutMs
        ).then(response => {
            const responseData = response.data;
            //the received map is not complete and should be "built"
            this.builtTestMap = mapHelper.reindex(responseData.testMap);
            this.builtTestMap.stats = {
                total: this.builtTestMap.jumps.length
            };

            let currentItem = mapHelper.getItemAt(this.builtTestMap, this.params.item ? this.params.item - 1 : 0);
            currentItem = currentItem || mapHelper.getItemAt(this.builtTestMap, 0);
            const currentJump = mapHelper.getJump(this.builtTestMap, currentItem.position);

            const result = {};

            result.testContext = {
                itemIdentifier: currentJump.identifier,
                itemPosition: currentItem.position,
                itemSessionState: 0,
                testPartId: currentJump.part,
                sectionId: currentJump.section,
                canMoveBackward: true,
                state: testSessionStates.interacting,
                attempt: 1,
                options: {},
                allowSkipping: currentItem.allowSkipping,
                locale: responseData.locales.current
            };

            result.testMap = responseData.testMap;
            result.testMap.locales = (responseData.locales.linked || []).filter(
                (locale, idx) =>
                    locale !== result.testContext.locale &&
                    responseData.locales.linked &&
                    responseData.locales.linked.indexOf(locale) === idx //ensure unique and not current
            );
            result.metadata = responseData['delivery-metadata'];

            return result;
        });
    },

    /**
     * Uninstalls the proxy
     * @returns {Promise} - Returns a promise. The proxy will be fully uninstalled on resolve.
     *                      Any error will be provided if rejected.
     */
    destroy() {
        if (this.itemStore) {
            this.itemStore = null;
        }

        // the method must return a promise
        return Promise.resolve();
    },

    /**
     * Gets an item definition by its identifier
     * @param {String} itemIdentifier - The identifier of the item to get
     * @returns {Promise} - Returns a promise. The item data will be provided on resolve.
     *                      Any error will be provided if rejected.
     */
    getItem(itemIdentifier) {
        if (itemIdentifier in this.itemStore) {
            // Load item from store
            return Promise.resolve(this.itemStore[itemIdentifier]);
        } else {
            // Load from server; Store in store
            const { id } = mapHelper.getItem(this.builtTestMap, itemIdentifier) || {};
            if (!id) {
                throw new ApiError(`There is no item "${itemIdentifier}" in the testMap!`);
            }

            return this.makeRequest({
                url: this.urls.getItem,
                params: {
                    unitId: this.params.unitId,
                    requestId: this.params.requestId,
                    locale: this.params.locale,
                    itemId: itemIdentifier,
                    uiEngine: this.params.uiEngine,
                    jwt: this.params.jwt
                }
            }).then(data => {
                data.itemData = data.content;
                data.itemIdentifier = data.content.data.identifier;
                data.itemState = {};
                this.itemStore[itemIdentifier] = data;
                return data;
            });
        }
    },

    /**
     * Call action on the test
     * @param {string} itemIdentifier - the current item
     * @param {string} action - the action id
     * @param {Object} params
     * @returns {Promise|void} resolves with the response
     */
    callItemAction(itemIdentifier, action, params = {}) {
        const dataHolder = this.getDataHolder();
        const testContext = dataHolder.get('testContext');
        const testMap = dataHolder.get('testMap');
        const actions = {
            //simulate backend move action
            move: () => {
                if (params.direction === 'next') {
                    testContext.itemPosition = Math.min(testMap.stats.total - 1, testContext.itemPosition + 1);
                }
                if (params.direction === 'previous') {
                    testContext.itemPosition = Math.max(0, testContext.itemPosition - 1);
                }
                if (params.direction === 'jump' && Number.isInteger(params.ref)) {
                    testContext.itemPosition = Math.max(0, Math.min(testMap.stats.total - 1, params.ref));
                }
                const moveJump = mapHelper.getJump(this.builtTestMap, testContext.itemPosition);
                testContext.itemIdentifier = moveJump.identifier;
                testContext.sectionId = moveJump.section;
                testContext.testPartId = moveJump.part;

                return { testContext, testMap };
            },

            flagItem: () => Promise.resolve()
        };
        actions.skip = actions.move;

        if (typeof actions[action] === 'function') {
            return actions[action]();
        }
    },

    /**
     * Calls an action related to the test
     * @returns {Promise} - Returns a promise. The result of the request will be provided on resolve.
     *                      Any error will be provided if rejected.
     */
    callTestAction() {
        return Promise.resolve();
    }
};

export default proxy;
