// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import settingsKeys from '../../settings/settingsKeys.js';

/**
 * Check if a settings group is in non-default state
 * @param {string} settingsKey
 * @param {object} [initialSettingsState={}]
 * @param {object} [pluginConfig={}]
 * @returns {Boolean} true if group enabled and state non-default
 */
export function getIsNonDefaultState(settingsKey, initialSettingsState = {}, pluginConfig = {}) {
    if (!(settingsKey in settingsKeys)) {
        throw new Error(`Missing or invalid settings key "${settingsKey}"`);
    }
    return initialSettingsState[settingsKey]?.toolState?.nonDefault
        && pluginConfig[settingsKey]?.enabled;
}
