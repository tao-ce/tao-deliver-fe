// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable, derived, get } from 'svelte/store';
import { testSessionStatus } from './session/sessionStates.js';

const { subscribe, update, set } = writable({});

/**
 * This store contains the state of multiple test sessions.
 */
const testsStateStore = {
    subscribe,
    set,
    update,

    /**
     * Clears state of all tests
     */
    clear() {
        set({});
    }
};
export default testsStateStore;

/**
 * Get the state store of a given state
 * @param {String} serviceCallId - the unique identifier of the test session
 * @returns {Object} the derived store for the given test session
 * @throws {TypeError} without a serviceCallId
 */
export const getTestStateStore = serviceCallId => {
    if (!serviceCallId) {
        throw new TypeError('A "serviceCallId" is required to get the state store of the test session');
    }

    const testStateStore = derived(testsStateStore, store => store[serviceCallId]);

    return {
        /**
         * Set the value to the store for the given property
         * @param {String} key - the property to set
         * @param {*} value - the value to set
         */
        set(key, value) {
            update(store => {
                store[serviceCallId] = store[serviceCallId] || {};
                store[serviceCallId][key] = value;
                return store;
            });
        },

        /**
         * Get the current store value
         * OR
         * get the value of a key
         * (this polymorphism is used to ensure compatibility
         * with the Map from the taoTests/runner/dataHolder)
         * @param {String} [key] - the property to get
         * @returns {Object|*} the store value or a property value
         */
        get(key) {
            const state = get(testsStateStore)[serviceCallId] || {};
            if (key) {
                return state[key];
            }
            return state;
        },

        /**
         * clear the store values
         */
        clear() {
            update(store => {
                store[serviceCallId] = {};
                return store;
            });
        },

        /**
         * Register an observer for state changes
         * @param {(state) => void} observer - Observer function
         * @returns {Function} unsubscribe function
         */
        subscribe(observer) {
            return testStateStore.subscribe(observer);
        },

        /**
         * Get the current testMap from the store
         * @returns {Object} the testMap
         */
        getTestMap() {
            const state = this.get();
            return state.testMap || {};
        },

        /**
         * Set the current testMap
         * @param {Object} testMap
         */
        setTestMap(testMap = {}) {
            this.set('testMap', testMap);
        },

        /**
         * Get the current testContext from the store
         * @returns {Object} the testContext
         */
        getTestContext() {
            const state = this.get();
            return state.testContext || {};
        },

        /**
         * Set the current testContext
         * @param {Object} testContext
         */
        setTestContext(testContext) {
            this.set('testContext', testContext);
        },

        /**
         * Get the test part that match the given identifier
         * @param {string} testPartId - the identifier of the test part
         * @returns {Object?} the test part or falsy
         */
        getTestPart(testPartId) {
            const testMap = this.getTestMap();
            return testMap && testMap.parts && testMap.parts[testPartId];
        },

        /**
         * Get the current test part
         * @returns {Object?} the test part or falsy
         */
        getCurrentTestPart() {
            const state = this.get();
            const testContext = state.testContext;
            const testPartId = testContext && testContext.testPartId;
            const testMap = state.testMap;
            return testPartId && testMap && testMap.parts && testMap.parts[testPartId];
        },

        /**
         * Get the section that match the given identifier
         * @param {string} sectionId - the identifier of the section
         * @param {string} testPartId - the identifier of the test part
         * @returns {Object?} the section or falsy
         */
        getSection(sectionId, testPartId) {
            const testMap = this.getTestMap();
            return (
                testMap &&
                testMap.parts &&
                testMap.parts[testPartId] &&
                testMap.parts[testPartId].sections &&
                testMap.parts[testPartId].sections[sectionId]
            );
        },

        /**
         * Get the current section
         * @returns {Object?} the section or falsy
         */
        getCurrentSection() {
            const state = this.get();
            const testContext = state.testContext;
            const testPartId = testContext && testContext.testPartId;
            const sectionId = testContext && testContext.sectionId;
            const testMap = state.testMap;
            return (
                testPartId &&
                sectionId &&
                testMap &&
                testMap.parts &&
                testMap.parts[testPartId] &&
                testMap.parts[testPartId].sections &&
                testMap.parts[testPartId].sections[sectionId]
            );
        },

        /**
         * Get the item that match the given identifier
         * @param {string} itemId - the identifier of the item
         * @param {string} sectionId - the identifier of the section
         * @param {string} testPartId - the identifier of the test part
         * @returns {Object?} the item or falsy
         */
        getItem(itemId, sectionId, testPartId) {
            const testMap = this.getTestMap();
            return (
                testMap &&
                testMap.parts &&
                testMap.parts[testPartId] &&
                testMap.parts[testPartId].sections &&
                testMap.parts[testPartId].sections[sectionId] &&
                testMap.parts[testPartId].sections[sectionId].items &&
                testMap.parts[testPartId].sections[sectionId].items[itemId]
            );
        },

        /**
         * Get the current item
         * @returns {Object?} the item or falsy
         */
        getCurrentItem() {
            const state = this.get();
            const testContext = state.testContext;
            const testPartId = testContext && testContext.testPartId;
            const sectionId = testContext && testContext.sectionId;
            const itemId = testContext && testContext.itemIdentifier;
            const testMap = state.testMap;
            return (
                testPartId &&
                sectionId &&
                itemId &&
                testMap &&
                testMap.parts &&
                testMap.parts[testPartId] &&
                testMap.parts[testPartId].sections &&
                testMap.parts[testPartId].sections[sectionId] &&
                testMap.parts[testPartId].sections[sectionId].items &&
                testMap.parts[testPartId].sections[sectionId].items[itemId]
            );
        }
    };
};

/**
 * Derived store for the test session status
 * @param {String} serviceCallId - the unique identifier of the test session
 * @returns {Object} the derived store for the given test session
 * @throws {TypeError} without a serviceCallId
 */
export const getTestSessionStatusStore = serviceCallId => {
    const statusKey = 'testSessionStatus';
    if (!serviceCallId) {
        throw new TypeError('A "serviceCallId" is required to get the state store of the test session');
    }

    const statusStore = derived(testsStateStore, store => {
        store[serviceCallId] = store[serviceCallId] || {};
        store[serviceCallId][statusKey] = store[serviceCallId][statusKey] || testSessionStatus.initial;
        return store[serviceCallId][statusKey];
    });

    return {
        /**
         * Set the status
         * @param {String} status - the current status
         * @throws {TypeError} with an invalid status
         */
        set(status = testSessionStatus.initial) {
            if (!Object.values(testSessionStatus).includes(status)) {
                throw new TypeError('Invalid session status');
            }
            update(store => {
                store[serviceCallId] = store[serviceCallId] || {};
                store[serviceCallId][statusKey] = status;
                return store;
            });
        },

        /**
         * Get the current status
         * @returns {String} the status
         */
        get() {
            const state = get(testsStateStore)[serviceCallId] || {};
            return state[statusKey] || testSessionStatus.initial;
        },

        /**
         * clear the store values
         */
        clear() {
            update(store => {
                delete store[serviceCallId][statusKey];
                return store;
            });
        },

        /**
         * Register an observer for state changes
         * @param {(state) => void} observer - Observer function
         * @returns {Function} unsubscribe function
         */
        subscribe(observer) {
            return statusStore.subscribe(observer);
        },

        /**
         * Is the status 'initial'?
         * @returns {Boolean}
         */
        get isInitial() {
            return this.get() === testSessionStatus.initial;
        },

        /**
         * Is the status 'loading'?
         * @returns {Boolean}
         */
        get isLoading() {
            return this.get() === testSessionStatus.loading;
        },

        /**
         * Is the status 'interacting'?
         * @returns {Boolean}
         */
        get isInteracting() {
            return this.get() === testSessionStatus.interacting;
        },

        /**
         * Is the status 'overlay'?
         * @returns {Boolean}
         */
        get isOverlay() {
            return this.get() === testSessionStatus.overlay;
        },

        /**
         * Is the status 'proctorwait'?
         * @returns {Boolean}
         */
        get isProctorWait() {
            return this.get() === testSessionStatus.proctorwait;
        }
    };
};
