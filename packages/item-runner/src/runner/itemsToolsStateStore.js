// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable, get } from 'svelte/store';

/**
 * The toolsStateStore is used to store tools data linked to the item or elements of the item but
 * that isn't part of the item state (saved and managed outside the item runner).
 */

//we keep the stores per item
const toolsStateStores = new Map();

/**
 * Get the tool state store
 * @param {string} itemIdentifier
 * @returns {Observable<Object>} the toolsStateStore
 */
export function getItemToolsStateStore(itemIdentifier) {
    if (!itemIdentifier) {
        throw new TypeError('An "itemIdentifier" is required to get the state store of the item session');
    }

    if (toolsStateStores.has(itemIdentifier)) {
        return toolsStateStores.get(itemIdentifier);
    }

    const { subscribe, set, update } = writable({});

    const toolsStateStore = {
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
         * Get the state for a given tool
         * @param {string} toolKey - to identify the tool
         * @returns {*}
         */
        getToolState(toolKey) {
            return get(this)[toolKey];
        },

        /**
         * Set the state for a given tool
         * @param {string} toolKey - to identify the tool
         * @param {*} value - the state for that tool
         */
        setToolState(toolKey, value = {}) {
            if (toolKey && value) {
                update(stored => {
                    stored[toolKey] = value;
                    return stored;
                });
            }
        },

        /**
         * Get the tool state for a given tool and a given element (or interaction)
         * @param {string} toolKey - to identify the tool
         * @param {string} elementIdentifier - to identify the element
         * @returns {*}
         */
        getElementToolState(toolKey, elementIdentifier) {
            const toolState = this.getToolState(toolKey);
            if (toolState && typeof toolState === 'object') {
                return toolState[elementIdentifier];
            }
        },

        /**
         * Set the state for a given tool and a given element (or interaction)
         * @param {string} toolKey - to identify the tool
         * @param {string} elementIdentifier - to identify the element
         * @param {*} value - the state for that tool
         */
        setElementToolState(toolKey, elementIdentifier, value) {
            if (toolKey && elementIdentifier) {
                update(stored => {
                    stored[toolKey] = stored[toolKey] || {};
                    if (typeof stored[toolKey] === 'object') {
                        stored[toolKey][elementIdentifier] = value;
                    }
                    return stored;
                });
            }
        }
    };

    toolsStateStores.set(itemIdentifier, toolsStateStore);
    return toolsStateStore;
}

/**
 * Release the store for this item so next time you'll get a new one.
 * @param {string} itemIdentifier
 */
export function releaseItemToolsStateStore(itemIdentifier) {
    if (itemIdentifier && toolsStateStores.has(itemIdentifier)) {
        toolsStateStores.delete(itemIdentifier);
    }
}
