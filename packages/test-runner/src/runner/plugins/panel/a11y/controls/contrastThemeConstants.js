// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { __ } from '@oat-sa-private/ui-core';

export const defaultThemeKey = 'default';
export const themeLabels = {
    get [defaultThemeKey]() {
        return __('Default');
    },
    get whiteOnBlack() {
        return __('White On Black');
    },
    get whiteOnBlue() {
        return __('White On Blue');
    },
    get yellowOnBlack() {
        return __('Yellow On Black');
    },
    get yellowOnBlue() {
        return __('Yellow On Blue');
    },
    get blueOnYellow() {
        return __('Blue On Yellow');
    },
    get blackOnCream() {
        return __('Black On Cream');
    },
    get blackOnBlue() {
        return __('Black On Blue');
    },
    get blackOnMagenta() {
        return __('Black On Magenta');
    },
    get greyOnGreen() {
        return __('Grey On Green');
    }
};

export const themeColours = {
    whiteOnBlack: '--theme-white-on-black',
    whiteOnBlue: '--theme-white-on-blue',
    yellowOnBlack: '--theme-yellow-on-black',
    yellowOnBlue: '--theme-yellow-on-blue',
    blueOnYellow: '--theme-blue-on-yellow',
    blackOnCream: '--theme-black-on-cream',
    blackOnBlue: '--theme-black-on-blue',
    blackOnMagenta: '--theme-black-on-magenta',
    greyOnGreen: '--theme-grey-on-green'
};
