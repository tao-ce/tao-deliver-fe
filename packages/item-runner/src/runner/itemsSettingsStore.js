// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable, get } from 'svelte/store';

/**
 * The settings store is used to store, per item, the item settings.
 * Data will comes from item runner's options and can change will the item is running.
 * Each element and interaction can subscribe to his settings store to read settings and react to changes.
 */

//keep settings stores by item
const settingsStores = new Map();

/**
 * Get the settings store for a given item
 * @param {string} itemIdentifier
 * @returns {Observable<Object>} the settings store
 */
export function getItemSettingsStore(itemIdentifier) {
    if (!itemIdentifier) {
        throw new TypeError(`An "itemIdentifier" is required to get the items' setttings store`);
    }

    if (settingsStores.has(itemIdentifier)) {
        return settingsStores.get(itemIdentifier);
    }

    const { subscribe, update, set } = writable({});

    const settingsStore = {
        subscribe,
        set,
        update,

        /**
         * Check key is enabled or disabled
         * if the key is missing from settings it's considered disabled
         * @param {string} key - settings key
         * @returns {boolean} - true for enabled / false for disabled
         */
        isEnabled(key) {
            const settings = get(this);

            if (!Object.keys(settings).includes(key)) {
                return false;
            }

            const _disabledKeys = settings['_disabledKeys'] || [];

            return !_disabledKeys.includes(key);
        }
    };

    settingsStores.set(itemIdentifier, settingsStore);

    return settingsStore;
}

/**
 * Release the store for this item so next time you'll get a new one.
 * @param {string} itemIdentifier
 */
export function releaseItemSettingsStore(itemIdentifier) {
    if (itemIdentifier && settingsStores.has(itemIdentifier)) {
        settingsStores.delete(itemIdentifier);
    }
}
