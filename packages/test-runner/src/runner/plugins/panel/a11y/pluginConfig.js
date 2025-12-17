// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import settingsKeys from '../../settings/settingsKeys.js';

/**
 * Keys for groups of settings.
 */
export const settingsGroupKeys = {
    zoom: 'group-zoom',
    contrast: 'group-contrast',
    pointer: 'group-pointer',
    text: 'group-text'
};

/**
 * The config's structure is flat to match the shape of the settingsStore
 * the settings state of these tools will go into.
 * In the UI however it appears nested.
 */
export default {
    // should the plugin's panel auto-open when it loads
    openOnStart: false,

    //ui-log settings
    eventLog: {
        enabled: true
    },

    /**
     * @typedef {Object} ConvertPxToRemOptions
     * @property {Boolean?} enabled - convert or not
     * @property {String[]?} cssProperties - `[font-size]`, for example. If undefined, all css properties will be converted
     */
    /**
     * To support page-zoom, convert 'px' values to 'rem' in authored item content.
     * Currently, only custom stylesheets for item and for passages are converted, and `itemRunnerConfig.itemStyles`.
     * Inline styles in `itemData.body` are not converted.
     * @type {ConvertPxToRemOptions}
     */
    convertPxToRem: {
        enabled: false,
        cssProperties: null
    },

    // defines the enabled settings groups and their order
    groups: [settingsGroupKeys.zoom, settingsGroupKeys.contrast, settingsGroupKeys.pointer, settingsGroupKeys.text],

    /**
     * Groups of controls:
     * - collapsible: can the group expand and collapse on click?
     * - collapsed: the group's initial state
     *
     * Config defines initial value.
     * Actual changed value will be stored in the settingsStore under `a11yMenuPanel` key.
     */
    [settingsGroupKeys.zoom]: {
        collapsible: false,
        collapsed: false
    },
    [settingsGroupKeys.contrast]: {
        collapsible: true,
        collapsed: false
    },
    [settingsGroupKeys.pointer]: {
        collapsible: true,
        collapsed: false
    },
    [settingsGroupKeys.text]: {
        collapsible: true,
        collapsed: false
    },

    /**
     * Individual controls within groups
     * - enabled: shows the control
     * - other properties: configuration of the control
     */
    [settingsKeys.pageZoom]: {
        enabled: true,
        zoomLevels: [100, 110, 125, 150, 175, 200]
    },
    [settingsKeys.contrastTheme]: {
        enabled: true,
        themes: [
            'default',
            'whiteOnBlack',
            'blackOnCream',
            'blackOnMagenta',
            'blackOnBlue',
            'yellowOnBlue',
            'greyOnGreen'
            // other existing themes disabled by default:
            // 'whiteOnBlue',
            // 'yellowOnBlack',
            // 'blueOnYellow',
        ]
    },
    [settingsKeys.mousePointer]: {
        enabled: true
    },
    [settingsKeys.fontFamily]: {
        enabled: true,
        families: ['default', 'courier', 'arial', 'verdana', 'cmuserif', 'luciole']
    },
    [settingsKeys.fontSize]: {
        enabled: true
    },
    [settingsKeys.lineHeight]: {
        enabled: true
    },
    // if separate:
    [settingsKeys.letterSpacing]: {
        enabled: false
    },
    [settingsKeys.wordSpacing]: {
        enabled: false
    },
    // if combined:
    [settingsKeys.letterAndWordSpacing]: {
        enabled: true
    }
};
