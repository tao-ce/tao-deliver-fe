// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-23 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { writable, derived, get } from 'svelte/store';
// Utils
import { isEqual, cloneDeep } from 'lodash';
import pciJsonCodec from './util/pciJsonCodec';

/**
 * Format of items state store
 * itemsStateStore = {
 *   [itemIdentifier]: itemStateStore {
 *     [responseIdentifier]: interactionStateStore {
 *       response: {},
 *       validity: true
 *     }
 *   }
 * }
 */
const { subscribe, update, set } = writable({});

/**
 * Writable svelte store of state of all items
 */
const itemsStateStore = {
    subscribe,
    set,
    update,

    /**
     * Clears state of all items
     */
    clear() {
        set({});
    }
};
export default itemsStateStore;

/**
 * Returns the svelte store of item state
 * State format should match for the following:
 * { [responseIdentifier]: { "response": {} }  }
 * @param {string} itemIdentifier - item identifier
 * @returns {object} Writable svelte store
 */
export const getItemStateStore = itemIdentifier => {
    const itemStateStore = derived(itemsStateStore, store => store[itemIdentifier]);
    return {
        /**
         * Replace item state with provided new state
         * @param {object} state - new item state
         */
        set(state) {
            update(store => {
                store[itemIdentifier] = state;
                return store;
            });
        },

        /**
         * Returns with item state or empty object
         * @returns {object} item state
         */
        get() {
            return get(itemsStateStore)[itemIdentifier] || {};
        },

        /**
         * Clears item state
         */
        clear() {
            update(store => {
                store[itemIdentifier] = {};
                return store;
            });
        },

        /**
         * Register an observer for state changes
         * @param {(state) => void} observer - Observer function
         * @returns {function} unsubscribe function
         */
        subscribe(observer) {
            return itemStateStore.subscribe(observer);
        },

        /**
         * Returns with item responses
         * @returns {object} responses {responseIdentifier: response}
         */
        getItemResponses() {
            const state = this.get();
            return Object.keys(state)
                .filter(responseIdentifier => typeof state[responseIdentifier].response !== 'undefined')
                .reduce((responses, responseIdentifier) => {
                    responses[responseIdentifier] = state[responseIdentifier].response;
                    return responses;
                }, {});
        },

        /**
         * Update/append item responses with the provided responses
         * @param {object} responses - new responses {responseIdentifier: response}
         */
        setItemResponses(responses) {
            if (typeof responses !== 'object') {
                return;
            }
            update(store => {
                const itemState = this.get();
                Object.keys(responses).forEach(responseIdentifier => {
                    itemState[responseIdentifier] = Object.assign({}, itemState[responseIdentifier], {
                        response: responses[responseIdentifier]
                    });
                });
                return Object.assign(store, { [itemIdentifier]: itemState });
            });
        },

        /**
         * Return the state of item element based on the provided identifier
         * (item element can be an interaction or a static element or something else)
         * @param {string} elementIdentifier - element identifier, for interaction - responseIdentifier
         * @returns {object} state of interaction
         */
        getItemElementState(elementIdentifier) {
            return this.get()[elementIdentifier] || {};
        },

        /**
         * Replaces item element state with the provided state
         * (item element can be an interaction or a static element or something else)
         * @param {string} elementIdentifier - element identifier, for interaction - responseIdentifier
         * @param {object} state - new state of the interaction
         */
        setItemElementState(elementIdentifier, state) {
            update(store => {
                const itemState = this.get();
                itemState[elementIdentifier] = state;
                return Object.assign(store, { [itemIdentifier]: itemState });
            });
        },

        /**
         * Adds the provided fields into item element state
         * (item element can be an interaction or a static element or something else)
         * @param {string} elementIdentifier - element identifier, for interaction - responseIdentifier
         * @param {object} newStateFields - new state fields of the interaction
         */
        mergeItemElementState(elementIdentifier, newStateFields) {
            update(store => {
                const itemState = store[itemIdentifier] || {};
                itemState[elementIdentifier] = {
                    ...itemState[elementIdentifier],
                    ...newStateFields
                };
                return Object.assign(store, { [itemIdentifier]: itemState });
            });
        },

        /**
         * Updates item element state with the provided state
         * (item element can be an interaction or a static element or something else)
         * @param {string} elementIdentifier - element identifier, for interaction - responseIdentifier
         * @param {object} state - new state of the interaction
         */
        updateItemElementState(elementIdentifier, state) {
            update(store => {
                const itemState = store[itemIdentifier] || {};
                if (itemState[elementIdentifier]) {
                    Object.assign(itemState[elementIdentifier], state);
                }
                return Object.assign(store, { [itemIdentifier]: itemState });
            });
        },

        /**
         * Checks the interaction has defined response
         * @param {string} responseIdentifier - response identifier
         * @returns {boolean}
         */
        hasInteractionResponse(responseIdentifier) {
            const itemState = this.get();
            const interactionState = itemState[responseIdentifier];
            if (interactionState && interactionState.response) {
                return true;
            }
            return false;
        },

        /**
         * Returns with the responses of an interaction
         * @param {string} responseIdentifier - response identifier
         * @returns {object} response of the interaction or empty object
         */
        getInteractionResponse(responseIdentifier) {
            const itemState = this.get();
            const interactionState = itemState[responseIdentifier] || {};
            return interactionState.response || {};
        },

        /**
         * Replaces the interaction response with the provided new response
         * @param {string} responseIdentifier - response identifier
         * @param {object} response - new response object
         * @param {boolean} [validity=true] - defines interaction validity
         */
        setInteractionResponse(responseIdentifier, response, validity = true) {
            this.mergeItemElementState(responseIdentifier, { response, validity });
        },

        /**
         * @param {string} responseIdentifier
         * @param {number[]} optionsOrder
         */
        setInteractionOptionsOrder(responseIdentifier, optionsOrder) {
            this.mergeItemElementState(responseIdentifier, { optionsOrder });
        },

        /**
         * @param {string} responseIdentifier
         * @returns {number[]|void}
         */
        getInteractionOptionsOrder(responseIdentifier) {
            const itemState = this.get();
            const interactionState = itemState[responseIdentifier] || {};
            return interactionState.optionsOrder;
        },

        /**
         * Request validity of interaction
         * @param {string} responseIdentifier - response identifier
         * @returns {boolean} validity of interaction
         */
        getInteractionValidity(responseIdentifier) {
            const itemState = this.get();
            const interactionState = itemState[responseIdentifier] || {};
            return typeof interactionState.validity !== 'undefined' ? interactionState.validity : true;
        },

        /**
         * Replaces validity of interaction.
         * BE CAREFUL: if validity is undefined, what is a falsy variable, will set validity to false
         * @param {string} responseIdentifier - response identifier
         * @param {boolean} validity - define interaction validity
         */
        setInteractionValidity(responseIdentifier, validity) {
            update(store => {
                const itemState = store[itemIdentifier] || {};
                itemState[responseIdentifier] = Object.assign({}, itemState[responseIdentifier], {
                    validity: Boolean(validity)
                });
                return Object.assign(store, { [itemIdentifier]: itemState });
            });
        }
    };
};

/**
 * Returns the svelte store of interaction state
 * State format should match for the following:
 * @param {string} itemIdentifier - item identifier
 * @param {string} responseIdentifier - response identifier
 * @returns {object} Writable svelte store
 */
export const getInteractionStateStore = (itemIdentifier, responseIdentifier) => {
    const itemStateStore = getItemStateStore(itemIdentifier);
    const interactionStateStore = derived(itemStateStore, store => store && store[responseIdentifier]);

    return {
        /**
         * Replace interaction state with provided new state
         * @param {object} state - new interaction state
         */
        set(state) {
            itemStateStore.setItemElementState(responseIdentifier, state);
        },

        /**
         * Merge new state with existing one
         * @param {object} state
         */
        merge(state) {
            itemStateStore.mergeItemElementState(responseIdentifier, state);
        },

        /**
         * Returns with interaction state or empty object
         * @returns {object} interaction state
         */
        get() {
            return itemStateStore.getItemElementState(responseIdentifier);
        },

        /**
         * Update interaction state with provided new state
         * @param {object} state - new interaction state
         */
        update(state) {
            itemStateStore.updateItemElementState(responseIdentifier, state);
        },

        /**
         * Register an observer for state changes
         * @param {(state) => void} observer - Observer function
         * @returns {function} unsubscribe function
         */
        subscribe: interactionStateStore.subscribe,

        /**
         * Checks the interaction has defined response
         * @returns {boolean}
         */
        hasResponse() {
            return itemStateStore.hasInteractionResponse(responseIdentifier);
        },

        /**
         * Returns with the responses of an interaction
         * @returns {object} response of the interaction or empty object
         */
        getResponse() {
            return itemStateStore.getInteractionResponse(responseIdentifier);
        },

        /**
         * Returns with the decoded response value of an interaction
         * @returns {any} decoded response value of an interaction
         */
        getResponseValue() {
            const response = this.getResponse();
            if (response && typeof response === 'object' && !Object.keys(response).length) {
                return null;
            }
            return pciJsonCodec.decode(response).value;
        },

        /**
         * Replaces the interaction response with the provided new response
         * @param {object} response - new response object
         * @param {boolean} [validity=true] - defines interaction validity
         */
        setResponse(response, validity = true) {
            itemStateStore.setInteractionResponse(responseIdentifier, response, validity);
        },

        /**
         * Replaces the interaction response value with the provided new response value
         * @param {object} response - new response object
         * @param {string} response.cardinality - cardinality of the response value
         * @param {string} response.baseType - base type of the response value
         * @param {any} response.value - response value
         * @param {boolean} [validity=true] - defines interaction validity
         */
        setResponseValue(response, validity = true) {
            const encodedResponse = pciJsonCodec.encode(response);
            this.setResponse(encodedResponse, validity);
        },

        /**
         * Creates a snapshot of the current response
         * It is necessary because response is a reference and it can change
         *
         * @returns {Object} - snapshot of the current response
         */
        snapshotResponse() {
            const response = this.getResponseValue();
            const resultResponse = response != null ? response : [];
            // clone object
            return cloneDeep(resultResponse);
        },

        /**
         * Gets a response snapshot, if it was actually changed
         *
         * @param {Array} previousResponse - previous response
         * @returns {Array|void} - new response if changed
         */
        getResponseIfChanged(previousResponse) {
            const response = this.getResponseValue();
            // deep compare arrays
            if (!isEqual(previousResponse, response)) {
                return response;
            }
        },

        /**
         * Request validity of interaction
         * @returns {boolean} validity of interaction
         */
        getValidity() {
            return itemStateStore.getInteractionValidity(responseIdentifier);
        },

        /**
         * Request validity of interaction
         * @param {boolean} validity - define interaction validity
         */
        setValidity(validity) {
            itemStateStore.setInteractionValidity(responseIdentifier, validity);
        },

        /**
         * Returns shuffled items order
         * @returns {number[]|number[][]|void}
         */
        getOptionsOrder() {
            return itemStateStore.getInteractionOptionsOrder(responseIdentifier);
        },

        /**
         * Saves shuffled items order into store
         * @param {number[]} order
         */
        setOptionsOrder(order) {
            itemStateStore.setInteractionOptionsOrder(responseIdentifier, order);
        }
    };
};
