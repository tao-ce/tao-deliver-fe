// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable, derived, get } from 'svelte/store';
import itemSessionStatus from './itemSessionStatus.js';

/**
 * Format of __all items__ session state store:
 * itemsSessionStatusStore = {
 *   [itemIdentifier]: sessionStatusStore {
 *     sessionStatus: 'interacting'
 *   }
 * }
 */
const { subscribe, update, set } = writable({});

/**
 * Writable svelte store of sessionStatus of all items
 */
const itemsSessionStatusStore = {
    subscribe,
    set,
    update,

    /**
     * Clears sessionStatus of all items
     */
    clear() {
        set({});
    }
};
export default itemsSessionStatusStore;

/**
 * Returns the svelte store of the session state of an item
 * @param {string} itemIdentifier - item identifier
 * @returns {object} Writable svelte store
 */
export const getItemSessionStatusStore = itemIdentifier => {
    if (!itemIdentifier) {
        throw new TypeError('An "itemIdentifier" is required to get the session state store of the item');
    }

    const sessionStatusStore = derived(itemsSessionStatusStore, store => {
        store[itemIdentifier] = store[itemIdentifier] || itemSessionStatus.initial;
        return store[itemIdentifier];
    });

    return {
        /**
         * Set the itemSessionStatus
         * @param {String} newSessionStatus
         * @throws {TypeError} with an invalid status
         */
        set(newSessionStatus = itemSessionStatus.initial) {
            if (!Object.values(itemSessionStatus).includes(newSessionStatus)) {
                throw new TypeError(`Invalid itemSessionStatus: '${newSessionStatus}'`);
            }
            update(store => {
                store[itemIdentifier] = newSessionStatus;
                return store;
            });
        },

        /**
         * Get the current itemSessionStatus
         * @returns {String} the itemSessionStatus
         */
        get() {
            return get(itemsSessionStatusStore)[itemIdentifier] || itemSessionStatus.initial;
        },

        /**
         * Clears itemSessionStatus
         */
        clear() {
            update(store => {
                delete store[itemIdentifier];
                return store;
            });
        },

        /**
         * Register an observer for itemSessionStatus changes
         * @param {(itemSessionStatus) => void} observer - Observer function
         * @returns {function} unsubscribe function
         */
        subscribe(observer) {
            return sessionStatusStore.subscribe(observer);
        },

        /**
         * Is the status 'interacting'?
         * @returns {Boolean}
         */
        get isInteracting() {
            return this.get() === itemSessionStatus.interacting;
        },

        /**
         * Is the status 'suspended'?
         * @returns {Boolean}
         */
        get isSuspended() {
            return this.get() === itemSessionStatus.suspended;
        },

        /**
         * Is the status 'closed'?
         * @returns {Boolean}
         */
        get isClosed() {
            return this.get() === itemSessionStatus.closed;
        },

        /**
         * Is the status 'modalFeedback'?
         * @returns {Boolean}
         */
        get isModalFeedback() {
            return this.get() === itemSessionStatus.modalFeedback;
        }
    };
};
