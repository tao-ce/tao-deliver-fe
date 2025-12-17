// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getIsNonDefaultState } from '../util.js';

describe('getIsNonDefaultState', () => {
    const settingsKey = 'pageZoom';
    const initialSettingsState = {
        pageZoom: {
            toolState: {
                nonDefault: true
            }
        }
    };
    const pluginConfig = {
        pageZoom: {
            enabled: true
        }
    };

    it('should throw an error if settings key is missing or invalid', () => {
        const invalidKey = 'invalidKey';
        expect(() => {
            getIsNonDefaultState(invalidKey, initialSettingsState, pluginConfig);
        }).toThrow(`Missing or invalid settings key "invalidKey"`);

        let missingKey;
        expect(() => {
            getIsNonDefaultState(missingKey, initialSettingsState, pluginConfig);
        }).toThrow(`Missing or invalid settings key "undefined"`);
    });

    it('should return true if group enabled and state non-default', () => {
        const result = getIsNonDefaultState(settingsKey, initialSettingsState, pluginConfig);
        expect(result).toBe(true);
    });

    it('should return false if group not enabled', () => {
        const disabledGroupPluginConfig = {
            pageZoom: {
                enabled: false
            }
        };
        const result = getIsNonDefaultState(settingsKey, initialSettingsState, disabledGroupPluginConfig);
        expect(result).toBe(false);
    });

    it('should return false if state is default', () => {
        const defaultState = {
            pageZoom: {
                toolState: {
                    nonDefault: false
                }
            }
        };
        const result = getIsNonDefaultState(settingsKey, defaultState, pluginConfig);
        expect(result).toBe(false);
    });
});
