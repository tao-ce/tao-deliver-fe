// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getBrowserDetails } from '../../../util/environment.js';
import { preventedShortcuts } from './shortcuts.js';

const platforms = Object.freeze({
    win: 'win',
    mac: 'mac'
});

/**
 * Get the list of unique shortcuts applicable to the current platform (OS)
 * @param {object[]} whitelist the array of whitelisted shortcuts
 * @returns {object[]} shortcuts
 */
export function getPlatformShortcuts(whitelist = []) {
    const { os } = getBrowserDetails(window.navigator.userAgent);

    let osPlatform;
    if (os?.name?.includes('win')) {
        osPlatform = platforms.win;
    } else if (os?.name?.includes('mac')) {
        osPlatform = platforms.mac;
    }

    const isInWhitelist = (shortcutItem, platform) =>
        whitelist.some(
            whitelistItem =>
                whitelistItem.shortcut === shortcutItem.shortcut &&
                (typeof whitelistItem.platform === 'undefined' ||
                    typeof platform === 'undefined' ||
                    whitelistItem.platform === platform)
        );

    const shortcuts = preventedShortcuts.filter(item => {
        if (isInWhitelist(item, osPlatform)) {
            return false;
        }
        return osPlatform ? item.platform === osPlatform : true;
    });

    // Build a collection of `shortcut` objects with distinct shortcut values
    return [...new Map(shortcuts.map(item => [item['shortcut'], item])).values()];
}
