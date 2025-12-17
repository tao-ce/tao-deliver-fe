// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable, get } from 'svelte/store';
import { cloneDeep } from 'lodash';

/**
 * @typedef {Object} ItemDefinition - item format for store
 * @property {String} baseUrl
 * @property {String} itemIdentifier
 * @property {Object} itemData - static part
 * @property {Object} [itemState] - dynamic part
 * @property {Object} [itemResponse] - dynamic part
 * @property {Object} [flags]
 */
/**
 * @typedef {Object} StoredItem
 * @property {Number} timestamp milliseconds
 * @property {ItemDefinition} definition
 * @property {Number[]} [expiries]
 */

/**
 * Keeps the stores for multiple test sessions
 * Each store contains timestamped item definitions of multiple items
 */
const itemsStoresMap = new Map();

const defaultConfig = {
    ttl: 30 * 60 * 1000,
    capacity: Infinity
};

/**
 * Get the item store for a test session,
 * the store TTL is used to invalidate an item (through the 'getItem' method)
 * @param {String} serviceCallId
 * @returns {Store} Svelte store
 */
export const getItemsStore = serviceCallId => {
    if (!serviceCallId) {
        throw new TypeError('A "serviceCallId" is required to get the itemStore');
    }

    if (itemsStoresMap.has(serviceCallId)) {
        return itemsStoresMap.get(serviceCallId);
    }

    // config isn't saved inside the store but in the closure
    let config = { ...defaultConfig };

    /**
     * @type {SvelteStore}
     */
    const { subscribe, set, update } = writable({});
    const itemsStore = {
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
         * Set store config
         * Missing config properties take default values
         * @param {Object} newConfig
         * @param {Number} [newConfig.ttl]
         * @param {Number} [newConfig.capacity]
         */
        setConfig(newConfig = {}) {
            config = Object.assign({}, defaultConfig, newConfig);
        },

        /**
         * Get current store config
         * @returns {Object}
         */
        getConfig() {
            return config;
        },

        /**
         * Clear the store values
         */
        clear() {
            this.set({});
        },

        /**
         * Get keys of entries
         * @returns {String[]}
         */
        keys() {
            const itemList = this.get() || {};
            return Object.keys(itemList);
        },

        /**
         * Get the number of items currently stored
         * @returns {Number}
         */
        size() {
            return this.keys().length;
        },

        /**
         * Is an item present in store?
         * @param {String} identifier
         * @returns {Boolean}
         */
        has(identifier) {
            return this.keys().includes(identifier);
        },

        /**
         * Is an item present in store AND has an itemState?
         * @param {String} identifier
         * @returns {Boolean}
         */
        hasItemState(identifier) {
            const item = this.getItem(identifier);
            return !!item?.itemState;
        },

        /**
         * Get an item by its identifier
         * Due to cloneDeep() the stored value remains safe from external mutation
         * Consumers must use setItem() to update the entry, if modifying the item outside
         * @param {String} identifier
         * @returns {ItemDefinition|null} - the item
         */
        getItem(identifier) {
            const itemList = this.get() || {};
            const item = itemList[identifier];
            const ttl = this.getConfig().ttl; // ttl for item definitions

            // return clone of item from store (only if not expired)
            if (item && item.definition && item.timestamp) {
                const now = Date.now();
                const definitionValid = item.timestamp + ttl > now;
                const assetsValid = getAssetsExpiries(item).every(expiryTs => expiryTs > now);

                if (definitionValid && assetsValid) {
                    return cloneDeep(item.definition);
                } else {
                    this.removeItem(identifier);
                }
            }
            return null;
        },

        /**
         * Set an item into the store.
         * An older item may be removed first, if the store is at its capacity
         * @param {String} identifier
         * @param {ItemDefinition} definition - the item
         */
        setItem(identifier, definition) {
            const capacity = this.getConfig().capacity;

            // To add a *new* item, free space may be needed
            if (!this.keys().includes(identifier) && this.size() >= capacity) {
                this.removeItem(this.getOldest());
            }

            update(stored => {
                stored[identifier] = {
                    timestamp: Date.now(),
                    definition
                };
                return stored;
            });
        },

        /**
         * Update a stored item.
         * @param {String} identifier
         * @param {ItemDefinition} newDefinition - new parts of the item
         */
        updateItem(identifier, newDefinition) {
            update(stored => {
                if (!stored[identifier]) {
                    return stored;
                }
                stored[identifier] = {
                    ...stored[identifier],
                    definition: {
                        ...stored[identifier].definition,
                        ...newDefinition
                    }
                };
                return stored;
            });
        },

        /**
         * Remove one item by its identifier, to keep store size down
         * @param {String} identifier
         */
        removeItem(identifier) {
            if (identifier) {
                update(stored => {
                    delete stored[identifier];
                    return stored;
                });
            }
        },

        /**
         * Get the identifier of the stored item with the oldest timestamp
         * @returns {String|null} identifier
         */
        getOldest() {
            /* eslint-disable no-unused-vars */
            const itemList = this.get() || {};
            const timestampedEntries = Object.entries(itemList).filter(([key, val]) => val.timestamp);
            if (timestampedEntries.length) {
                const sorted = timestampedEntries.sort(([keyA, valA], [keyB, valB]) => valA.timestamp - valB.timestamp);
                return sorted[0][0];
            }
            return null;
        },

        /**
         * Check all item timestamps and remove expired items, to free up space
         */
        removeExpired() {
            this.keys().forEach(key => this.getItem(key));
        }
    };

    // The first time, set this new store in the map of stores
    itemsStoresMap.set(serviceCallId, itemsStore);
    return itemsStore;
};

/**
 * Extract expiries from URLs of all assets linked in the item
 * @param {StoredItem} item
 * @returns {Number[]} expiry timestamps (in ms) of signed URLs of all item assets
 */
function getAssetsExpiries(item) {
    if (item.expiries) {
        return item.expiries;
    }

    const expiries = [];

    ['img', 'audio', 'video'].forEach(key => {
        if (item?.definition?.itemData?.assets?.[key]) {
            Object.values(item.definition.itemData.assets[key]).forEach(url => {
                // relative URLs must be parsed with a base, to avoid error
                const hasProtocol = /^https?:\/\//i.test(url);
                const base = hasProtocol ? void 0 : window.location.href;
                // protect against Safari 13 URL constructor with undefined base bug: https://bugs.webkit.org/show_bug.cgi?id=216841
                const parsedUrl = base ? new URL(url, base) : new URL(url);

                const expiresParam = parsedUrl.searchParams.get('Expires'); // CDN signed assets
                const timestampParam = parsedUrl.searchParams.get('timestamp'); // deliver-be assets

                if (expiresParam || timestampParam) {
                    const seconds = parseInt(expiresParam || timestampParam, 10);
                    if (!Number.isNaN(seconds)) {
                        expiries.push(seconds * 1000); // param expected in seconds; comparison will be done in ms
                    }
                }
            });
        }
    });

    item.expiries = expiries;
    return expiries;
}
