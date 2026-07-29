// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable, get } from 'svelte/store';

/**
 * The "test session user data service" provides stores for user data linked to the test session.
 * It also allows you to synchronize the stored data with a long term storage (server, localstorage, indexeddb, etc.)
 * @typedef {Object} TestSessionUserDataService
 * @property {Function} getSettingsStore
 * @property {Function} getToolsStore
 * @property {Function} startSyncWithStorage
 * @property {Function} stopSyncWithStorage
 */

//keep the stores for multiple test sessions
const stores = new Map();

//keep the synchronization subscriptions
const syncSubscriptions = new Map();

/**
 * Get the testSessionUserDataService for a test session
 * @param {string} serviceCallId - the identifier of the test session
 * @returns {TestSessionUserDataService} the service instance for that session
 */
export function getTestSessionUserDataService(serviceCallId) {
    if (!serviceCallId) {
        throw new TypeError('A "serviceCallId" is required to get the TestSessionUserDataService');
    }

    /**
     * Create a new settings store (writable custom store)
     * @returns {Observable<Settings>} the store
     */
    function createSettingsStore() {
        /**
         * An object that contains the settings
         * @typedef {Object.<string, *>} Settings
         */
        const DISABLED_KEYS = '_disabledKeys';
        const { subscribe, set, update } = writable({
            [DISABLED_KEYS]: []
        });

        return {
            subscribe,
            update,
            set,

            /**
             * Get the store value
             * @returns {Settings} the settings
             */
            get() {
                return get(this);
            },

            /**
             * Get a setting by his key
             * @param {string} key
             * @returns {*} the setting value
             */
            getSetting(key) {
                if (key) {
                    return get(this)[key];
                }
            },

            /**
             * Set a setting value
             * @param {string} key
             * @param {*} value
             */
            setSetting(key, value) {
                if (key) {
                    update(stored => {
                        stored[key] = value;
                        return stored;
                    });
                }
            },

            /**
             * Check if key is enabled or disabled
             * @param {string} key - settings key
             * @returns {boolean} - true for enabled / false for disabled
             */
            isEnabled(key) {
                let disabledKeys = this.getDisabledSettings() || [];

                return disabledKeys.indexOf(key) === -1;
            },

            /**
             * Enable settings
             * @param {string} key - settings key to enable
             */
            enableSetting(key) {
                if (this.isEnabled(key)) {
                    return;
                }

                update(stored => {
                    stored[DISABLED_KEYS].splice(stored[DISABLED_KEYS].indexOf(key), 1);

                    return stored;
                });
            },

            /**
             * Disable settings
             * @param {string} key - settings key to disable
             */
            disableSetting(key) {
                if (!this.isEnabled(key)) {
                    return;
                }

                update(stored => {
                    stored[DISABLED_KEYS].push(key);

                    return stored;
                });
            },

            /**
             * Get all disabled settings
             * @returns {Array} - all disabled settings
             */
            getDisabledSettings() {
                return get(this)[DISABLED_KEYS] || [];
            }
        };
    }

    /**
     * Create a new tools store (writable custom store)
     * @returns {Observable<ToolsState>} the store
     */
    function createToolsStore() {
        /**
         * An object that contains the state of the tools
         * @typedef {Object} ToolsState
         * @property {Object} testTools - the tools where the data lifecycle is linked to the test
         * @property {Object} itemTools - the tools where the data lifecycle is linked to the item
         */
        const { subscribe, set, update } = writable({
            testTools: {},
            itemTools: {}
        });

        return {
            subscribe,
            update,

            /**
             * Get the store value
             * @returns {ToolsState} the toolsState
             */
            get() {
                return get(this);
            },

            /**
             * Store setter, with type check
             * @param {Object} value
             * @returns {*}
             */
            set(value = { testTools: {}, itemTools: {} }) {
                if (
                    !value ||
                    typeof value !== 'object' ||
                    typeof value.testTools !== 'object' ||
                    typeof value.itemTools !== 'object'
                ) {
                    throw new TypeError(
                        'Incorrect value, the toolsStore accepts only object with the following structure: { testTools: {}, itemTools: {}}'
                    );
                }
                return set(value);
            },

            /**
             * Get the state of the test tools
             * @returns {Object} the state
             */
            getTestToolsState() {
                return get(this).testTools;
            },

            /**
             * Set the state of the test tools
             * @param {Object} testTools
             */
            setTestToolsState(testTools = {}) {
                if (typeof testTools === 'object') {
                    update(stored => {
                        stored.testTools = testTools;
                        return stored;
                    });
                }
            },

            /**
             * Get the state of a given test tool
             * @param {string} toolKey
             * @returns {*} the state
             */
            getTestToolState(toolKey) {
                if (toolKey) {
                    return get(this).testTools[toolKey];
                }
            },

            /**
             * Set the state of a given test tool
             * @param {string} toolKey
             * @param {*} value
             */
            setTestToolState(toolKey, value) {
                if (toolKey) {
                    update(stored => {
                        stored.testTools[toolKey] = value;
                        return stored;
                    });
                }
            },

            /**
             * Get the state of all tools and all items
             * @returns {?Object} the states
             */
            getItemsToolsState() {
                return get(this).itemTools;
            },

            /**
             * Set the state of all tools and all items
             * @param {Object} toolsState - all tools state
             */
            setItemsToolsState(toolsState = {}) {
                if (typeof toolsState === 'object') {
                    update(stored => {
                        stored.itemTools = toolsState;
                        return stored;
                    });
                }
            },
            /**
             * Get the state of all tools for a given item
             * @param {string} itemIdentifier
             * @returns {Object|void} the states
             */
            getItemToolsState(itemIdentifier) {
                if (itemIdentifier) {
                    const itemsToolsState = get(this).itemTools;
                    if (itemsToolsState) {
                        return itemsToolsState[itemIdentifier];
                    }
                }
            },

            /**
             * Set the state of all tools for a given item
             * @param {string} itemIdentifier
             * @param {Object} toolsState - all tools state
             */
            setItemToolsState(itemIdentifier, toolsState = {}) {
                if (itemIdentifier) {
                    update(stored => {
                        stored.itemTools[itemIdentifier] = toolsState;
                        return stored;
                    });
                }
            },

            /**
             * Get the state of a tool for an item
             * @param {string} itemIdentifier
             * @param {string} toolKey
             * @returns {*} the state
             */
            getItemToolState(itemIdentifier, toolKey) {
                if (itemIdentifier && toolKey) {
                    const itemsToolsState = get(this).itemTools;
                    if (itemsToolsState && itemsToolsState[itemIdentifier]) {
                        return itemsToolsState[itemIdentifier][toolKey];
                    }
                }
            },

            /**
             * Set the state of a tool for an item
             * @param {string} itemIdentifier
             * @param {string} toolKey
             * @param {*} value
             */
            setItemToolState(itemIdentifier, toolKey, value) {
                if (itemIdentifier && toolKey) {
                    update(stored => {
                        stored.itemTools[itemIdentifier] = stored.itemTools[itemIdentifier] || {};
                        stored.itemTools[itemIdentifier][toolKey] = value;
                        return stored;
                    });
                }
            },

            /**
             * Get the list of itemIdentifier that have stored the state of a tool
             * @returns {String[]}
             */
            getItems() {
                return Object.keys(get(this).itemTools);
            }
        };
    }

    const createStores = !stores.has(serviceCallId);
    let settingsStore;
    let toolsStore;
    if (stores.has(serviceCallId)) {
        ({ settingsStore, toolsStore } = stores.get(serviceCallId));
    } else {
        settingsStore = createSettingsStore();
        toolsStore = createToolsStore();
    }

    if (createStores) {
        stores.set(serviceCallId, { settingsStore, toolsStore });
        syncSubscriptions.set(serviceCallId, []);
    }

    return {
        /**
         * Get the settings store
         * @returns {Observable<Settings>}
         */
        getSettingsStore() {
            return settingsStore;
        },

        /**
         * Get the tools store
         * @returns {Observable<ToolsState>}
         */
        getToolsStore() {
            return toolsStore;
        },

        /**
         * Start syncing the stores with a storage.
         * Once called it looks for data in the storage to feed the store
         * and listen for changes in the stores to update the storage.
         * @param {Storage} storage - any storage that complies with the Storage API
         * @returns {Promise}
         */
        startSyncWithStorage(storage) {
            if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
                return Promise.reject(new TypeError('A storage is required'));
            }
            this.stopSyncWithStorage();

            return Promise.all([storage.getItem('settings'), storage.getItem('tools')])
                .then(results => {
                    if (results[0]) {
                        settingsStore.set(results[0]);
                    }
                    if (results[1]) {
                        toolsStore.set(results[1]);
                    }
                })
                .then(() => {
                    syncSubscriptions.set(serviceCallId, [
                        this.getSettingsStore().subscribe(value => {
                            storage.setItem('settings', value);
                        }),
                        this.getToolsStore().subscribe(value => {
                            storage.setItem('tools', value);
                        })
                    ]);
                });
        },

        /**
         * Stop the current store/storage synchronization, if any.
         */
        stopSyncWithStorage() {
            const currentSubscriptions = syncSubscriptions.get(serviceCallId);
            if (Array.isArray(currentSubscriptions)) {
                for (let unsubscribe of currentSubscriptions) {
                    if (typeof unsubscribe === 'function') {
                        unsubscribe();
                    }
                }
            }
            syncSubscriptions.set(serviceCallId, []);
        }
    };
}

/**
 * Clear all stores and stop all subscriptions for all test sessions
 */
export function clearAllTestSessionsUserData() {
    for (let subscriptions of syncSubscriptions) {
        if (Array.isArray(subscriptions)) {
            for (let unsubscribe of subscriptions) {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            }
        }
    }
    syncSubscriptions.clear();

    stores.clear();
}
