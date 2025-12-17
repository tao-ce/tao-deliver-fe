// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { get } from 'svelte/store';
import { screenSize, setScreenSize } from '../screenSizeStore';

describe('screenSizeStore', () => {
    afterEach(() => {
        screenSize.set({ unknown: true });
    });

    it('is standard writable store', () => {
        expect(get(screenSize)).toStrictEqual({ unknown: true });

        const onChange = vi.fn();
        const unsubscribe = screenSize.subscribe(onChange);
        screenSize.set({ something: 'something' });

        expect(get(screenSize)).toStrictEqual({ something: 'something' });
        expect(onChange).toHaveBeenLastCalledWith({ something: 'something' });

        unsubscribe();
    });

    it('sets value from windowWidth', () => {
        expect(get(screenSize)).toStrictEqual({ unknown: true });

        setScreenSize(void 0);
        expect(get(screenSize)).toStrictEqual({ unknown: true });

        setScreenSize(1);
        expect(get(screenSize)).toStrictEqual({ mobile: true, mobilePortrait: true });

        setScreenSize(576);
        expect(get(screenSize)).toStrictEqual({ mobile: true, mobilePortrait: true });

        setScreenSize(767);
        expect(get(screenSize)).toStrictEqual({ mobile: true, mobileLandscape: true });

        setScreenSize(992);
        expect(get(screenSize)).toStrictEqual({ tablet: true, tabletPortrait: true });

        setScreenSize(1200);
        expect(get(screenSize)).toStrictEqual({ tablet: true, tabletLandscape: true });

        setScreenSize(1201);
        expect(get(screenSize)).toStrictEqual({ desktop: true });
    });
});
