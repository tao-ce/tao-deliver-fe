// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import presets from './presets';
import {
    submitItem_modalFeedback_assets,
    submitItem_modalFeedback_two,
    submitItem_modalFeedback_nomatching,
    submitItem_modalFeedback_nodeclared
} from './presets/responses';
import { testSessionStates } from '../src/runner/session/sessionStates.js';
import { cloneDeep } from 'lodash';
import { wait } from '../src/runner/util/common.js';

/**
 * Finds ids of testPart, section and item in testMap for a given item position
 * @param {Object} testMap
 * @param {Number} position item position
 * @returns {Object} object containing testPartId, sectionId, itemIdentifier
 */
function findIds(testMap, position) {
    for (let testPartId in testMap.parts) {
        for (let sectionId in testMap.parts[testPartId].sections) {
            for (let itemIdentifier in testMap.parts[testPartId].sections[sectionId].items) {
                if (testMap.parts[testPartId].sections[sectionId].items[itemIdentifier].position === position) {
                    return { testPartId, sectionId, itemIdentifier };
                }
            }
        }
    }
    return {};
}

/**
 * Proxy used by the sandbox
 * It loads data from the presets and
 * providers a very minimal navigation.
 */
export default {
    name: 'preset',

    /**
     * Install proxy behavior
     * @param {Object} config
     */
    install(config) {
        //get the current preset through the config
        this.getPreset = () => config.preset;

        this.config = config;

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

        this.saveScoringInlineComments = async (itemId, model) => {
            //eslint-disable-next-line no-console
            console.log('presetProxy saveScoringInlineComments', itemId, cloneDeep(model));
            await wait(200);
        };
    },

    /**
     * Initialize from the config
     * @param {Object} config - contains already the testMap and testContext
     * @returns {Promise<Object>} resolves with the data from the config
     */
    init(config) {
        this.itemStore = {};
        const { testMap, testContext, timer } = config;
        return Promise.resolve({ testMap, testContext, timer });
    },

    /**
     * Uninstalls the proxy
     * @returns {Promise} - Returns a promise. The proxy will be fully uninstalled on resolve.
     */
    destroy() {
        if (this.itemStore) {
            this.itemStore = null;
        }
        return Promise.resolve();
    },

    /**
     * Get item data
     * @param {string} itemIdentifier - the id of the item to load
     * @returns {Promise} resolves with the item data: { baseUrl, itemData, itemState, itemIdentifier, ... }
     */
    getItem(itemIdentifier) {
        if (itemIdentifier in this.itemStore) {
            // Load item from store
            const item = cloneDeep(this.itemStore[itemIdentifier]);
            return Promise.resolve(item);
            // return new Promise(r => {
            //     setTimeout(() => r(item), 5000);
            // });
        } else {
            // Load from preset; Store in store
            const presetItemData = presets[this.getPreset()].items[itemIdentifier];
            presetItemData.itemIdentifier = itemIdentifier;
            this.itemStore[itemIdentifier] = presetItemData;
            return Promise.resolve(presetItemData);
            // return new Promise(r => {
            //     setTimeout(() => r(presetItemData), 5000);
            // });
        }
    },

    /**
     * Submits the state and the response of a particular item
     * @param {String} itemIdentifier - The identifier of the item to update
     * @param {Object} itemState - The state to submit
     * @param {Object} itemResponse - The response object to submit
     * @returns {Promise<Object>} - Returns a promise. The result of the request will be provided on resolve.
     *                              Any error will be provided if rejected.
     */
    submitItem(itemIdentifier, itemState, itemResponse) {
        const storedItem = this.itemStore[itemIdentifier] || {};
        this.itemStore[itemIdentifier] = Object.assign(
            {},
            storedItem, // original itemData
            { itemState }, // full state, from itemStateStore
            { itemResponse } // responses, from itemStateStore
        );

        const categories = this.getDataHolder().getCurrentItem().categories;
        let response = submitItem_modalFeedback_nodeclared;
        if (categories.includes('sandboxPresetProxy-submitItem_modalFeedback_assets')) {
            response = submitItem_modalFeedback_assets;
        } else if (categories.includes('sandboxPresetProxy-submitItem_modalFeedback_two')) {
            response = submitItem_modalFeedback_two;
        } else if (categories.includes('sandboxPresetProxy-submitItem_modalFeedback_nomatching')) {
            response = submitItem_modalFeedback_nomatching;
        }
        return Promise.resolve(response);
    },

    /**
     * Call action on the item
     * @param {string} itemIdentifier - the current item
     * @param {string} action - the action id
     * @param {Object} params
     * @returns {Promise|void} resolves with the response
     */
    callItemAction(itemIdentifier, action, params = {}) {
        const testContext = this.getDataHolder().getTestContext();
        const testMap = this.getDataHolder().getTestMap();
        const actions = {
            //simulate backend move action
            move: () => {
                let newPosition;
                if (params.direction === 'next') {
                    if (params.scope === 'testPart') {
                        newPosition =
                            testMap.parts[testContext.testPartId].position +
                            testMap.parts[testContext.testPartId].stats.total;
                    } else if (params.scope === 'section') {
                        newPosition =
                            testMap.parts[testContext.testPartId].sections[testContext.sectionId].position +
                            testMap.parts[testContext.testPartId].sections[testContext.sectionId].stats.total;
                    } else {
                        newPosition = testContext.itemPosition + 1;
                    }
                }
                if (params.direction === 'previous') {
                    if (params.scope === 'testPart') {
                        newPosition = testMap.parts[testContext.testPartId].position - 1;
                    }
                    if (params.scope === 'section') {
                        newPosition =
                            testMap.parts[testContext.testPartId].sections[testContext.sectionId].position - 1;
                    } else {
                        newPosition = testContext.itemPosition - 1;
                    }
                }
                if (params.direction === 'jump' && params.ref >= 0) {
                    newPosition = params.ref;
                }

                const ids = findIds(testMap, newPosition);
                if (ids.itemIdentifier) {
                    testContext.itemPosition = newPosition;
                    testContext.testPartId = ids.testPartId;
                    testContext.sectionId = ids.sectionId;
                    testContext.itemIdentifier = ids.itemIdentifier;

                    const newCurrentItem = this.getDataHolder().getItem(
                        ids.itemIdentifier,
                        ids.sectionId,
                        ids.testPartId
                    );
                    testContext.remainingAttempts = newCurrentItem.remainingAttempts;
                    testContext.validateResponses = newCurrentItem.validateResponses;
                    testContext.allowSkipping = newCurrentItem.allowSkipping;
                } else {
                    testContext.state = testSessionStates.closed;
                }

                return { testContext, testMap };
            },

            flagItem: () => Promise.resolve(),

            saveItemState: () => Promise.resolve()
        };
        // Alias move as skip, for Sandbox purposes
        actions.skip = actions.move;

        const storedItem = this.itemStore[itemIdentifier] || {};
        this.itemStore[itemIdentifier] = Object.assign(
            {},
            storedItem, // original itemData
            params.itemState ? { itemState: params.itemState } : {}, // full state, from itemStateStore
            params.itemResponse && action !== 'skip' ? { itemResponse: params.itemResponse } : {} // responses, from itemStateStore
        );

        if (typeof actions[action] === 'function') {
            return actions[action]();
            // return new Promise(r => {
            //     setTimeout(() => r(actions[action]()), 5000);
            // });
        }
    },

    /**
     * Call action on the test
     * @param {string} action - the action id
     * @param {Object} params
     * @returns {Promise|void} resolves with the response
     */
    callTestAction(action, params) {
        const actions = {
            'ui-log': () =>
                new Promise(resolve => {
                    console.log('ui-log', params); // eslint-disable-line no-console
                    resolve();
                })
        };
        if (typeof actions[action] === 'function') {
            return actions[action]();
        }
    },

    /**
     * Send test variables
     * @returns {Promise} resolves with the response
     */
    sendVariables() {
        return Promise.resolve();
    }
};
