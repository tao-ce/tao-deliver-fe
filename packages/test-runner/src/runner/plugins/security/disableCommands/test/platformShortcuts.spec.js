// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getPlatformShortcuts } from '../platformShortcuts.js';

/**
 * Test getBrowserDetails and getPlatformShortcuts combined.
 * User agents are from https://www.useragents.me/
 */

describe('getPlatformShortcuts', () => {
    const userAgentStrings = Object.freeze({
        win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.3',
        mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.1',
        unknown: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.3'
    });
    it('should return an array of shortcuts for windows UA', () => {
        vi.spyOn(global.navigator, 'userAgent', 'get').mockReturnValue(userAgentStrings.win);

        const result = getPlatformShortcuts();

        expect(result.length).toBe(90);
        expect(result.map(item => item.shortcut)).toEqual(
            expect.arrayContaining(['Ctrl+c', 'Ctrl+v', 'Ctrl+x', 'PrtScn', 'Alt+PrtScn'])
        );
    });

    it('should return an array of shortcuts for mac UA', () => {
        vi.spyOn(global.navigator, 'userAgent', 'get').mockReturnValue(userAgentStrings.mac);

        const result = getPlatformShortcuts();

        expect(result.length).toBe(85);
        expect(result.map(item => item.shortcut)).toEqual(
            expect.arrayContaining(['Meta+C', 'Meta+V', 'Meta+X', 'Meta+Shift+3', 'Meta+Shift+4'])
        );
    });

    it('should return an array of shortcuts for unknown UA', () => {
        vi.spyOn(global.navigator, 'userAgent', 'get').mockReturnValue(userAgentStrings.unknown);

        const result = getPlatformShortcuts();

        expect(result.length).toBe(163);
    });

    it('should return an array of shortcuts with respect to whitelist', () => {
        const shortcutExistsForUserAgent = (whitelist, userAgentString, shortcut) => {
            vi.spyOn(global.navigator, 'userAgent', 'get').mockReturnValue(userAgentString);
            const result = getPlatformShortcuts(whitelist);
            return result.some(item => item.shortcut === shortcut);
        };

        const ctrlTab = 'Ctrl+tab';
        let whitelist = [
            {
                shortcut: ctrlTab, //exists both in win and mac shortcut list
                platform: 'mac'
            }
        ];

        //Ctrl+tab shortcut is removed for mac platform
        expect(shortcutExistsForUserAgent(whitelist, userAgentStrings.mac, ctrlTab)).toBe(false);

        //Ctrl+tab shortcut is not removed because it's whitelisted only for mac platform
        expect(shortcutExistsForUserAgent(whitelist, userAgentStrings.win, ctrlTab)).toBe(true);

        //for unknown platform all entries of Ctrl+tab shortcut are removed regardless the platform of shortcut
        expect(shortcutExistsForUserAgent(whitelist, userAgentStrings.unknown, ctrlTab)).toBe(false);

        //if platform is not specified, then shortcut is removed for all platforms
        whitelist = [
            {
                shortcut: ctrlTab
            }
        ];
        expect(shortcutExistsForUserAgent(whitelist, userAgentStrings.mac, ctrlTab)).toBe(false);
        expect(shortcutExistsForUserAgent(whitelist, userAgentStrings.win, ctrlTab)).toBe(false);
        expect(shortcutExistsForUserAgent(whitelist, userAgentStrings.unknown, ctrlTab)).toBe(false);
    });
});
