// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable, get } from 'svelte/store';

/**
 * The pendingOperationsStore is used to detect if this item has any operations in progress -
 *   these operations may have side-effects for the test-runner.
 * For example, while images are uploading in RichTextEditor, navigation should be disabled.
 */

//we keep the stores per item
const pendingOperationsStores = new Map();

/**
 * Get the pending operations store
 * @param {string} itemIdentifier
 * @returns {Observable<Object>} pendingOperationsStore
 */
export function getItemPendingOperationsStore(itemIdentifier) {
    if (!itemIdentifier) {
        throw new TypeError('An "itemIdentifier" is required for getItemPendingOperationsStore');
    }

    if (pendingOperationsStores.has(itemIdentifier)) {
        return pendingOperationsStores.get(itemIdentifier);
    }

    const { subscribe, set, update } = writable({ operationKeys: [], lastAddedKey: null, lastDeletedKey: null });

    const pendingOperationsStore = {
        subscribe,
        set,
        update,

        /**
         * Get the store data
         * @returns {Object}
         */
        get() {
            return get(this);
        },

        /**
         * Add pending operation
         * @param {string} operationKey - globally unique key (generated id)
         */
        add(operationKey) {
            if (operationKey) {
                update(stored => {
                    stored.operationKeys.push(operationKey);
                    stored.lastAddedKey = operationKey;
                    stored.lastDeletedKey = null;
                    return stored;
                });
            }
        },

        /**
         * Delete pending operation
         * @param {string} operationKey
         */
        delete(operationKey) {
            if (operationKey) {
                update(stored => {
                    const idx = stored.operationKeys.indexOf(operationKey);
                    if (idx >= 0) {
                        stored.operationKeys.splice(stored.operationKeys.indexOf(operationKey), 1);
                        stored.lastDeletedKey = operationKey;
                        stored.lastAddedKey = null;
                    }
                    return stored;
                });
            }
        },

        /**
         * Check if there are no pending operations for this item
         * @returns {boolean}
         */
        isEmpty() {
            return get(this).operationKeys.length === 0;
        },

        /**
         * Clears the store
         */
        clear() {
            set({ operationKeys: [], lastAddedKey: null, lastDeletedKey: null });
        }
    };

    pendingOperationsStores.set(itemIdentifier, pendingOperationsStore);
    return pendingOperationsStore;
}

/**
 * Release the store for this item so next time you'll get a new one.
 * @param {string} itemIdentifier
 */
export function releaseItemPendingOperationsStore(itemIdentifier) {
    if (itemIdentifier && pendingOperationsStores.has(itemIdentifier)) {
        pendingOperationsStores.delete(itemIdentifier);
    }
}
