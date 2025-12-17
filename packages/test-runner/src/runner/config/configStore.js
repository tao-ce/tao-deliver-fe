// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { writable, get } from 'svelte/store';

let configStore;

/**
 * Create a config store instance.
 * This store holds test-runner configuration.
 * Can be used to access `testRunner.getConfig()` without having to pass `testRunner` instance.
 *
 * @returns {Observable<*>} the store
 */
function createConfigStore() {
    const { subscribe, set } = writable({});
    return {
        subscribe,
        set,
        /**
         * @returns {Object}
         */
        get() {
            return get(this);
        },
        clear() {
            this.set({});
        }
    };
}

/**
 * Get or create config store instance
 * @returns {SvelteStore}
 */
export function getConfigStore() {
    if (!configStore) {
        configStore = createConfigStore();
    }
    return configStore;
}
