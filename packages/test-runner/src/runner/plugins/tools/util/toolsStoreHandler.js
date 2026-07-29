// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getTestSessionUserDataService } from '../../../session/testSessionUserDataService.js';

/**
 * Allow works with store for exact tool, by wrapping logic into simple methods
 * @param {String} serviceCallId
 * @param {String} toolName
 * @returns {Object} API
 */
export default function toolsStoreHandler(serviceCallId, toolName) {
    const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();

    return {
        /**
         * Get any *test-scoped* tool property in testToolsStore
         * @param {String} key - visible, enabled, open...
         * @returns {Boolean}
         */
        get(key) {
            const state = toolsStore.getTestToolState(toolName);
            return state && state[key];
        },

        /**
         * Set any *test-scoped* tool property in testToolsStore
         * @param {String} key - visible, enabled, open...
         * @param {Boolean} value
         */
        set(key, value) {
            const state = toolsStore.getTestToolState(toolName) || {};
            state[key] = value;
            toolsStore.setTestToolState(toolName, state);
        },

        /**
         * Get any *item-scoped* tool property in testToolsStore
         * @param {String} itemId
         * @param {String} toolKey
         * @returns {Boolean}
         */
        getForItem(itemId, toolKey) {
            return toolsStore.getItemToolState(itemId, toolKey) || {};
        },

        /**
         * Set any *item-scoped* tool property in testToolsStore
         * @param {String} itemId
         * @param {String} toolKey
         * @param {Boolean} toolValue
         */
        setForItem(itemId, toolKey, toolValue) {
            toolsStore.setItemToolState(itemId, toolKey, toolValue);
        }
    };
}
