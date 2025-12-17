// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { writable } from 'svelte/store';
import { breakpoints } from '@oat-sa-private/ui-identity';

/**
 * Value of screenSize store. Contains 'main' size properties and 'detailed' size properties:
 * Only one of 'main' properties can be set at the same time,
 * And it will be accompanied by corresponding 'detailed' property, which includes orientation.
 * @typedef {Object} ScreenSize
 * @property {Boolean} [unknown] - 'main', default
 * @property {Boolean} [mobile] - 'main', 1px -768px
 * @property {Boolean} [mobilePortrait] - 'detailed', 1px - 576px
 * @property {Boolean} [mobileLandscape] - 'detailed', 577px - 768px
 * @property {Boolean} [tablet] - 'main', 769px - 1200px
 * @property {Boolean} [tabletPortrait] - 'detailed', 769px - 992px
 * @property {Boolean} [tabletLandscape] - 'detailed', 993px - 1200px
 * @property {Boolean} [desktop] - 'main', 1201px and more
 * To check if screenSize fits some condition, check against the property you need:
 * @example
 * if(screenSize.mobile) {}
 * @example
 * if(screenSize.mobileLandscape) {}
 */
/**
 * This store allows to check window width against standard breakpoints
 * Contains {ScreenSize} object.
 */
export const screenSize = writable({ unknown: true });

/**
 * Sets value of the screenSize store based on screen width in pixels
 * @param {Number} windowWidth - window.innerWidth in pixels
 */
export const setScreenSize = windowWidth => {
    const size = {};
    if (!windowWidth) {
        size.unknown = true;
    } else if (windowWidth <= breakpoints.width.small) {
        size.mobile = true;
        size.mobilePortrait = true;
    } else if (windowWidth <= breakpoints.width.medium) {
        size.mobile = true;
        size.mobileLandscape = true;
    } else if (windowWidth <= breakpoints.width.large) {
        size.tablet = true;
        size.tabletPortrait = true;
    } else if (windowWidth <= breakpoints.width.huge) {
        size.tablet = true;
        size.tabletLandscape = true;
    } else {
        size.desktop = true;
    }
    screenSize.set(size);
};
