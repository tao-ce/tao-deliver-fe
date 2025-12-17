// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { calculateScalingFactor, ensureMinSize, getScaledCoords, getUsableHeight } from '../scaling.js';

describe('scaling', () => {
    describe('calculateScalingFactor', () => {
        it('resizes square content to fit width for portrait container', () => {
            expect(calculateScalingFactor(200, 200, 500, 300)).toBe(1.5);
        });

        it('resizes square content to fit height for landscape container', () => {
            expect(calculateScalingFactor(200, 200, 300, 500)).toBe(1.5);
        });

        it('scales to fit only one of dimensions with less scaling factor', () => {
            expect(calculateScalingFactor(800, 600, 1080, 768)).toBe(1.28); //not 1.35
            expect(calculateScalingFactor(600, 800, 768, 1080)).toBe(1.28);
        });

        it('does downscale larger content to smaller containers', () => {
            expect(calculateScalingFactor(1600, 1200, 800, 600)).toBe(0.5);
        });

        it('does not scale up more than x2 by default', () => {
            expect(calculateScalingFactor(10, 5, 1000, 500)).toBe(2);
            expect(calculateScalingFactor(10, 5, 10, 5)).toBe(1);
        });

        it('does not scale up more than maximumUpscaling argument', () => {
            expect(calculateScalingFactor(10, 5, 1000, 500, 40)).toBe(40);
            expect(calculateScalingFactor(10, 5, 1000, 500, 400)).toBe(100);
            expect(calculateScalingFactor(10, 5, 1000, 500, 0.5)).toBe(0.5);
        });

        it('does not restrict scale up if maximumUpscaling argument is empty', () => {
            expect(calculateScalingFactor(10, 5, 1000, 500, null)).toBe(100);
            expect(calculateScalingFactor(10, 5, 1000, 500, 0)).toBe(100);
        });
    });

    describe('ensureMinSize', () => {
        it('returns original size if both sides are not bigger than min', () => {
            expect(ensureMinSize(20, 40, 10)).toEqual({ width: 20, height: 40 });
            expect(ensureMinSize(40, 20, 10)).toEqual({ width: 40, height: 20 });
        });

        it('if vertical, scales up width to min, and height to keep aspect ratio', () => {
            expect(ensureMinSize(20, 40, 300)).toEqual({ width: 300, height: 600 });
            expect(ensureMinSize(20, 40, 30)).toEqual({ width: 30, height: 60 });
        });

        it('if horizontal, scales up height to min, and width to keep aspect ratio', () => {
            expect(ensureMinSize(40, 20, 300)).toEqual({ width: 600, height: 300 });
            expect(ensureMinSize(40, 20, 30)).toEqual({ width: 60, height: 30 });
        });
    });

    describe('getScaledCoords', () => {
        it('returns empty array for empty input', () => {
            expect(getScaledCoords()).toStrictEqual([]);
        });

        it('splits raw coords string', () => {
            expect(getScaledCoords('10,20')).toStrictEqual([10, 20]);
        });

        it('applies scaling factor correctly', () => {
            const precision = 5;
            const scalingFactor = 3.14;
            const res = getScaledCoords('10,20', scalingFactor);
            expect(res[0]).toBeCloseTo(31.4, precision);
            expect(res[1]).toBeCloseTo(62.8, precision);
        });
    });
    it('getUsableHeight', () => {
        const windowHeight = 100;
        expect(getUsableHeight(windowHeight)).toEqual(80);
        expect(getUsableHeight(0)).toEqual(0);
    });
});
