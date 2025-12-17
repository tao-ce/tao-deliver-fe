// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../../../util/scaling.js', async importOriginal => {
    const originalModule = await importOriginal();
    return {
        ...originalModule,
        getUsableHeight: vi.fn(),
        calculateScalingFactor: vi.fn()
    };
});
import sizingHelperFactory from '../sizingHelper.js';
import { getUsableHeight, calculateScalingFactor } from '../../../util/scaling.js';

describe('sizingHelper', () => {
    afterEach(() => {
        getUsableHeight.mockClear();
        calculateScalingFactor.mockClear();
    });

    it('exports a function', () => {
        expect(typeof sizingHelperFactory).toBe('function');
    });

    it('creates an object with all methods', () => {
        const s = sizingHelperFactory([], {});
        expect(typeof s).toBe('object');
        expect(typeof s.getContainerMaxHeight).toBe('function');
        expect(typeof s.getIsHorizontal).toBe('function');
        expect(typeof s.getBayMaxSize).toBe('function');
        expect(typeof s.getChoiceSize).toBe('function');
        expect(typeof s.getBayContainerSize).toBe('function');
        expect(typeof s.getBayScrollHeight).toBe('function');
        expect(typeof s.getImageSize).toBe('function');
        expect(typeof s.getChoiceX).toBe('function');
        expect(typeof s.getChoiceY).toBe('function');
    });

    it('returns getContainerMaxHeight', () => {
        getUsableHeight.mockImplementation(h => h / 5);
        const sh = sizingHelperFactory([], {});
        const res1 = sh.getContainerMaxHeight(100);
        expect(res1).toBe(20);
    });

    it('returns getIsHorizontal', () => {
        const sh = sizingHelperFactory([], {});
        const res1 = sh.getIsHorizontal(true, { containerMaxHeight: 100, containerWidth: 10 });
        expect(res1).toBe(false);

        const res1a = sh.getIsHorizontal(true, { containerMaxHeight: 10, containerWidth: 100 });
        expect(res1a).toBe(true);

        const res2 = sh.getIsHorizontal(false, { containerMaxHeight: 10, containerWidth: 100 });
        expect(res2).toBe(false);

        const res2a = sh.getIsHorizontal(false, { containerMaxHeight: 100, containerWidth: 10 });
        expect(res2a).toBe(false);

        const res3 = sh.getIsHorizontal(null, { containerMaxHeight: 11, containerWidth: 10 });
        expect(res3).toBe(false);

        const res4 = sh.getIsHorizontal(null, { containerMaxHeight: 10, containerWidth: 11 });
        expect(res4).toBe(true);
    });

    it('returns getChoiceX', () => {
        const sh = sizingHelperFactory([], { choiceAreaPadding: 0, choiceGap: 0 });
        const i1 = 0;
        const bayColumns = 4;
        const choiceHeight = 10;
        const res1 = sh.getChoiceX(i1, bayColumns, choiceHeight);
        expect(res1).toBe(0);

        const i2 = 7;
        const res2 = sh.getChoiceX(i2, bayColumns, choiceHeight);
        expect(res2).toBe(30);

        const sh2 = sizingHelperFactory([], { choiceAreaPadding: 15, choiceGap: 0 });
        const res3 = sh2.getChoiceX(i2, bayColumns, choiceHeight);
        expect(res3).toBe(45);

        const sh3 = sizingHelperFactory([], { choiceAreaPadding: 15, choiceGap: 4 });
        const res4 = sh3.getChoiceX(i2, bayColumns, choiceHeight);
        expect(res4).toBe(57);
    });

    it('returns getChoiceY', () => {
        const sh = sizingHelperFactory([], { choiceAreaPadding: 0, choiceGap: 0 });
        const i1 = 0;
        const bayColumns = 4;
        const choiceHeight = 10;
        const res1 = sh.getChoiceY(i1, bayColumns, choiceHeight);
        expect(res1).toBe(0);

        const i2 = 8;
        const res2 = sh.getChoiceY(i2, bayColumns, choiceHeight);
        expect(res2).toBe(20);

        const sh2 = sizingHelperFactory([], { choiceAreaPadding: 15, choiceGap: 0 });
        const res3 = sh2.getChoiceY(i2, bayColumns, choiceHeight);
        expect(res3).toBe(35);

        const sh3 = sizingHelperFactory([], { choiceAreaPadding: 15, choiceGap: 4 });
        const res4 = sh3.getChoiceY(i2, bayColumns, choiceHeight);
        expect(res4).toBe(43);
    });

    it('returns getBayMaxSize', () => {
        const sh = sizingHelperFactory([], { choiceAreaBottomMargin: 0, choiceAreaMaxPortion: 0.25 });
        const res1 = sh.getBayMaxSize({ isHorizontal: true, containerWidth: 16, containerMaxHeight: 11 });
        expect(res1).toEqual({ bayMaxWidth: 4, bayMaxHeight: 11 });

        const res2 = sh.getBayMaxSize({ isHorizontal: false, containerWidth: 11, containerMaxHeight: 16 });
        expect(res2).toEqual({ bayMaxWidth: 11, bayMaxHeight: 4 });

        const sh2 = sizingHelperFactory([], { choiceAreaBottomMargin: 5, choiceAreaMaxPortion: 0.25 });
        const res3 = sh2.getBayMaxSize({ isHorizontal: true, containerWidth: 16, containerMaxHeight: 11 });
        expect(res3).toEqual({ bayMaxWidth: 4, bayMaxHeight: 11 });

        const res4 = sh2.getBayMaxSize({ isHorizontal: false, containerWidth: 11, containerMaxHeight: 16 + 5 });
        expect(res4).toEqual({ bayMaxWidth: 11, bayMaxHeight: 4 });
    });

    describe('getChoiceSize', () => {
        it('returns no size if no choices', () => {
            const choices = [];
            const sh = sizingHelperFactory(choices, {
                choiceMaxSizeMobile: 2,
                choiceMaxSizeDesktop: 2,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res1 = sh.getChoiceSize({ isHorizontal: true, containerWidth: 1, bayMaxWidth: 1, bayMaxHeight: 1 });
            expect(res1).toEqual({ choiceWidth: 0, choiceHeight: 0 });
        });

        it('max size depends on containerWidth', () => {
            const choices = [{ width: 100, height: 100 }];
            const sh = sizingHelperFactory(choices, {
                choiceMaxSizeMobile: 22,
                choiceMaxSizeDesktop: 33,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res1 = sh.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1210,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res1).toEqual({ choiceWidth: 33, choiceHeight: 33 });

            const res2 = sh.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1190,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res2).toEqual({ choiceWidth: 22, choiceHeight: 22 });
        });

        it('max size is restricted by bay size', () => {
            const choices = [{ width: 100, height: 100 }];
            const sh = sizingHelperFactory(choices, {
                choiceMaxSizeMobile: 100,
                choiceMaxSizeDesktop: 100,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res1 = sh.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 22,
                bayMaxHeight: 33
            });
            expect(res1).toEqual({ choiceWidth: 22, choiceHeight: 22 });

            const res2 = sh.getChoiceSize({
                isHorizontal: false,
                containerWidth: 1000,
                bayMaxWidth: 22,
                bayMaxHeight: 33
            });
            expect(res2).toEqual({ choiceWidth: 33, choiceHeight: 33 });
        });

        it('max size calculation includes area paddings', () => {
            const choices1 = [{ width: 100, height: 100 }];
            const sh1 = sizingHelperFactory(choices1, {
                choiceMaxSizeMobile: 100,
                choiceMaxSizeDesktop: 100,
                choiceMinSize: 1,
                choiceScrollPadding: 10,
                choiceAreaPadding: 8,
                choiceBorderSize: 0
            });
            const res1 = sh1.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 22,
                bayMaxHeight: 33
            });
            expect(res1).toEqual({ choiceWidth: 22 - 18, choiceHeight: 22 - 18 });

            const choices2 = [{ width: 100, height: 100 }];
            const sh2 = sizingHelperFactory(choices2, {
                choiceMaxSizeMobile: 100,
                choiceMaxSizeDesktop: 100,
                choiceMinSize: 1,
                choiceScrollPadding: 10,
                choiceAreaPadding: 8,
                choiceBorderSize: 0
            });
            const res2 = sh2.getChoiceSize({
                isHorizontal: false,
                containerWidth: 1000,
                bayMaxWidth: 22,
                bayMaxHeight: 33
            });
            expect(res2).toEqual({ choiceWidth: 33 - 16, choiceHeight: 33 - 16 });
        });

        it('size has average aspect ratio and is restricted to max size on smaller side', () => {
            const choices1 = [
                { width: 1, height: 1 },
                { width: 300, height: 300 }
            ];
            const sh1 = sizingHelperFactory(choices1, {
                choiceMaxSizeMobile: 5,
                choiceMaxSizeDesktop: 5,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res1 = sh1.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res1).toEqual({ choiceWidth: 5, choiceHeight: 5 });

            const choices2 = [
                { width: 100, height: 10 },
                { width: 300, height: 10 }
            ];
            const sh2 = sizingHelperFactory(choices2, {
                choiceMaxSizeMobile: 5,
                choiceMaxSizeDesktop: 5,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res2 = sh2.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res2).toEqual({ choiceWidth: 5 * 20, choiceHeight: 5 });

            const choices3 = [
                { width: 10, height: 100 },
                { width: 10, height: 400 }
            ];
            const sh3 = sizingHelperFactory(choices3, {
                choiceMaxSizeMobile: 5,
                choiceMaxSizeDesktop: 5,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res3 = sh3.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res3).toEqual({ choiceWidth: 5, choiceHeight: 5 / 0.0625 });
        });

        it('size has average aspect ratio and is restricted to min size on smaller side', () => {
            const choices1 = [
                { width: 1, height: 1 },
                { width: 30, height: 30 }
            ];
            const sh1 = sizingHelperFactory(choices1, {
                choiceMaxSizeMobile: 500,
                choiceMaxSizeDesktop: 500,
                choiceMinSize: 50,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res1 = sh1.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res1).toEqual({ choiceWidth: 50, choiceHeight: 50 });

            const choices2 = [
                { width: 10, height: 1 },
                { width: 30, height: 1 }
            ];
            const sh2 = sizingHelperFactory(choices2, {
                choiceMaxSizeMobile: 500,
                choiceMaxSizeDesktop: 500,
                choiceMinSize: 50,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res2 = sh2.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res2).toEqual({ choiceWidth: 50 * 20, choiceHeight: 50 });

            const choices3 = [
                { width: 1, height: 10 },
                { width: 1, height: 40 }
            ];
            const sh3 = sizingHelperFactory(choices3, {
                choiceMaxSizeMobile: 500,
                choiceMaxSizeDesktop: 500,
                choiceMinSize: 50,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res3 = sh3.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res3).toEqual({ choiceWidth: 50, choiceHeight: 50 / 0.0625 });
        });

        it('size has average aspect ratio and does not scale down any image (if min/max not reached)', () => {
            const choices1 = [
                { width: 20, height: 10 },
                { width: 10, height: 20 }
            ];
            const sh1 = sizingHelperFactory(choices1, {
                choiceMaxSizeMobile: 200,
                choiceMaxSizeDesktop: 200,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res1 = sh1.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res1).toEqual({ choiceWidth: 25, choiceHeight: 20 });

            const choices2 = [
                { width: 20, height: 10 },
                { width: 30, height: 10 }
            ];
            const sh2 = sizingHelperFactory(choices2, {
                choiceMaxSizeMobile: 200,
                choiceMaxSizeDesktop: 200,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res2 = sh2.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res2).toEqual({ choiceWidth: 30, choiceHeight: 12 });

            const choices3 = [
                { width: 10, height: 10 },
                { width: 10, height: 40 }
            ];
            const sh3 = sizingHelperFactory(choices3, {
                choiceMaxSizeMobile: 200,
                choiceMaxSizeDesktop: 200,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res3 = sh3.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res3).toEqual({ choiceWidth: 25, choiceHeight: 40 });

            const choices4 = [
                { width: 100, height: 69 },
                { width: 68, height: 31 }
            ];
            const sh4 = sizingHelperFactory(choices4, {
                choiceMaxSizeMobile: 200,
                choiceMaxSizeDesktop: 200,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res4 = sh4.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(Math.floor(res4.choiceWidth)).toEqual(125);
            expect(res4.choiceHeight).toEqual(69);

            const choices5 = [
                { width: 69, height: 100 },
                { width: 31, height: 68 }
            ];
            const sh5 = sizingHelperFactory(choices5, {
                choiceMaxSizeMobile: 200,
                choiceMaxSizeDesktop: 200,
                choiceMinSize: 1,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 0
            });
            const res5 = sh5.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res5.choiceWidth).toEqual(69);
            expect(Math.floor(res5.choiceHeight)).toEqual(120);
        });

        it('choice border is included in size and will not corrupt image aspect ratio', () => {
            const choices1 = [{ width: 1, height: 1 }];
            const sh1 = sizingHelperFactory(choices1, {
                choiceMaxSizeMobile: 10,
                choiceMaxSizeDesktop: 10,
                choiceMinSize: 10,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 4
            });
            const res1 = sh1.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res1).toEqual({ choiceWidth: 10, choiceHeight: 10 });

            const choices2 = [{ width: 10, height: 1 }];
            const sh2 = sizingHelperFactory(choices2, {
                choiceMaxSizeMobile: 10,
                choiceMaxSizeDesktop: 10,
                choiceMinSize: 10,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 2
            });
            const res2 = sh2.getChoiceSize({
                isHorizontal: true,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res2).toEqual({ choiceWidth: (10 - 4) * 10 + 4, choiceHeight: 10 });

            const choices3 = [{ width: 10, height: 1 }];
            const sh3 = sizingHelperFactory(choices3, {
                choiceMaxSizeMobile: 10,
                choiceMaxSizeDesktop: 10,
                choiceMinSize: 10,
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceBorderSize: 2
            });
            const res3 = sh3.getChoiceSize({
                isHorizontal: false,
                containerWidth: 1000,
                bayMaxWidth: 1000,
                bayMaxHeight: 1000
            });
            expect(res3).toEqual({ choiceWidth: 10 * (10 - 4) + 4, choiceHeight: 10 });
        });
    });

    describe('getBayContainerSize', () => {
        function choicesWithLength(length) {
            const res = [];
            for (let i = 0; i < length; i++) {
                res.push({});
            }
            return res;
        }

        it('returns if no choices', () => {
            const sh = sizingHelperFactory(choicesWithLength(0), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 8,
                choiceHeight: 10,
                bayMaxWidth: 200,
                bayMaxHeight: 300,
                containerWidth: 400
            });
            expect(res1).toEqual({ bayColumns: 1, bayWidth: 8, bayHeight: 300 });

            const res2 = sh.getBayContainerSize({
                isHorizontal: false,
                choiceWidth: 8,
                choiceHeight: 10,
                bayMaxWidth: 200,
                bayMaxHeight: 300,
                containerWidth: 400
            });
            expect(res2).toEqual({ bayColumns: 1, bayWidth: 400, bayHeight: 0 });
        });

        it('is restricted to max bay size', () => {
            const sh = sizingHelperFactory(choicesWithLength(10), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 5,
                bayMaxWidth: 35,
                bayMaxHeight: 1,
                containerWidth: 400
            });
            expect(res1.bayColumns).toEqual(3);
            expect(res1.bayWidth).toEqual(30);

            const res2 = sh.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 5,
                bayMaxWidth: 1,
                bayMaxHeight: 1,
                containerWidth: 400
            });
            expect(res2.bayColumns).toEqual(1);
            expect(res2.bayWidth).toEqual(10);

            const res3 = sh.getBayContainerSize({
                isHorizontal: false,
                choiceWidth: 10,
                choiceHeight: 5,
                bayMaxWidth: 35,
                bayMaxHeight: 4,
                containerWidth: 35
            });
            expect(res3.bayHeight).toEqual(4);
        });

        it('does not stretch to fill max size', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(5), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh1.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 5,
                bayMaxWidth: 20,
                bayMaxHeight: 400,
                containerWidth: 400
            });
            expect(res1.bayColumns).toEqual(1);
            expect(res1.bayWidth).toEqual(10);

            const res2 = sh1.getBayContainerSize({
                isHorizontal: false,
                choiceWidth: 10,
                choiceHeight: 8,
                bayMaxWidth: 400,
                bayMaxHeight: 20,
                containerWidth: 400
            });
            expect(res2.bayColumns).toEqual(5);
            expect(res2.bayHeight).toEqual(8);
        });

        it('if horizontal, fill choices in all rows before filling next column', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(10), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh1.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 5,
                choiceHeight: 10,
                bayMaxWidth: 200,
                bayMaxHeight: 40,
                containerWidth: 400
            });
            expect(res1.bayColumns).toEqual(3);
            expect(res1.bayWidth).toEqual(15);

            const res2 = sh1.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 5,
                choiceHeight: 10,
                bayMaxWidth: 10,
                bayMaxHeight: 40,
                containerWidth: 400
            });
            expect(res2.bayColumns).toEqual(2);
            expect(res2.bayWidth).toEqual(10);

            const res3 = sh1.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 5,
                choiceHeight: 10,
                bayMaxWidth: 10,
                bayMaxHeight: 400,
                containerWidth: 400
            });
            expect(res3.bayColumns).toEqual(1);
            expect(res3.bayWidth).toEqual(5);
        });

        it('if vertical, fill choices in all columns before filling next row', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(10), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh1.getBayContainerSize({
                isHorizontal: false,
                choiceWidth: 10,
                choiceHeight: 5,
                bayMaxWidth: 40,
                bayMaxHeight: 400,
                containerWidth: 40
            });
            expect(res1.bayColumns).toEqual(4);
            expect(res1.bayWidth).toEqual(40);
        });

        it('if horizontal, height equals max height', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(1), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh1.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 10,
                bayMaxWidth: 100,
                bayMaxHeight: 400,
                containerWidth: 100
            });
            expect(res1.bayHeight).toEqual(400);
        });

        it('if vertical, width equals max width', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(1), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh1.getBayContainerSize({
                isHorizontal: false,
                choiceWidth: 10,
                choiceHeight: 10,
                bayMaxWidth: 400,
                bayMaxHeight: 100,
                containerWidth: 400
            });
            expect(res1.bayWidth).toEqual(400);
        });

        it('includes gaps between choices into calculation', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(5), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 8
            });
            const res1 = sh1.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 10,
                bayMaxWidth: 400,
                bayMaxHeight: 10,
                containerWidth: 400
            });
            expect(res1.bayWidth).toEqual(5 * 10 + 4 * 8);

            const sh2 = sizingHelperFactory(choicesWithLength(5), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 20
            });
            const res2 = sh2.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 10,
                bayMaxWidth: 45,
                bayMaxHeight: 10,
                containerWidth: 400
            });
            expect(res2.bayColumns).toEqual(2);
        });

        it('includes bay paddings in calculation', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(2), {
                choiceScrollPadding: 11,
                choiceAreaPadding: 2,
                choiceGap: 0
            });
            const res1 = sh1.getBayContainerSize({
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 10,
                bayMaxWidth: 400,
                bayMaxHeight: 10,
                containerWidth: 400
            });
            expect(res1.bayWidth).toEqual(13 + 20);
        });
    });

    describe('getBayScrollHeight', () => {
        function choicesWithLength(length) {
            const res = [];
            for (let i = 0; i < length; i++) {
                res.push({});
            }
            return res;
        }

        it('depends on number of free choices, not of all choices', () => {
            const sh = sizingHelperFactory(choicesWithLength(5), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh.getBayScrollHeight(choicesWithLength(2), {
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 10,
                bayMaxWidth: 400,
                bayMaxHeight: 400,
                containerWidth: 400
            });
            expect(res1).toEqual(20);

            const res2 = sh.getBayScrollHeight(choicesWithLength(4), {
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 10,
                bayMaxWidth: 400,
                bayMaxHeight: 400,
                containerWidth: 400
            });
            expect(res2).toEqual(40);
        });

        it('is less than container height if choices do not fill whole container', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(0), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh1.getBayScrollHeight(choicesWithLength(1), {
                isHorizontal: true,
                choiceWidth: 20,
                choiceHeight: 10,
                bayMaxWidth: 40,
                bayMaxHeight: 50,
                containerWidth: 400
            });
            expect(res1).toEqual(10);
        });

        it('is more than container height if choices go over container bounds', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(0), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 0
            });
            const res1 = sh1.getBayScrollHeight(choicesWithLength(10), {
                isHorizontal: true,
                choiceWidth: 20,
                choiceHeight: 10,
                bayMaxWidth: 40,
                bayMaxHeight: 20,
                containerWidth: 400
            });
            expect(res1).toEqual(50);
        });

        it('includes gaps between choices into calculation', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(0), {
                choiceScrollPadding: 0,
                choiceAreaPadding: 0,
                choiceGap: 8
            });
            const res1 = sh1.getBayScrollHeight(choicesWithLength(5), {
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 10,
                bayMaxWidth: 20,
                bayMaxHeight: 20,
                containerWidth: 400
            });
            expect(res1).toEqual(5 * 10 + 4 * 8);
        });

        it('includes bay paddings in calculation', () => {
            const sh1 = sizingHelperFactory(choicesWithLength(2), {
                choiceScrollPadding: 11,
                choiceAreaPadding: 2,
                choiceGap: 0
            });
            const res1 = sh1.getBayScrollHeight(choicesWithLength(5), {
                isHorizontal: true,
                choiceWidth: 10,
                choiceHeight: 10,
                bayMaxWidth: 20,
                bayMaxHeight: 10,
                containerWidth: 400
            });
            expect(res1).toEqual(5 * 10 + 4);
        });
    });

    describe('getImageSize', () => {
        function expectImgContainerSize(imgContainerWidth, imgContainerHeight) {
            expect(calculateScalingFactor).toHaveBeenCalled();
            expect(calculateScalingFactor.mock.calls[0][2]).toBe(imgContainerWidth);
            expect(calculateScalingFactor.mock.calls[0][3]).toBe(imgContainerHeight);
            calculateScalingFactor.mockClear();
        }

        it('returns scaled image size', () => {
            calculateScalingFactor.mockImplementation(() => 8);
            const sh = sizingHelperFactory([], {});
            const imgObject = { width: 10, height: 2 };
            const res1 = sh.getImageSize(imgObject, {
                isHorizontal: true,
                bayWidth: 1,
                bayHeight: 1,
                containerWidth: 1,
                containerMaxHeight: 1
            });
            expect(res1).toEqual({ imgScalingFactor: 8, imgWidth: 80, imgHeight: 16 });
        });

        it('fits image to bounds depending on bay and container position and size', () => {
            calculateScalingFactor.mockImplementation(() => 1);
            const sh = sizingHelperFactory([], {});
            const imgObject = { width: 1, height: 1 };
            sh.getImageSize(imgObject, {
                isHorizontal: true,
                bayWidth: 10,
                bayHeight: 10,
                containerWidth: 100,
                containerMaxHeight: 100
            });
            expectImgContainerSize(90, 100);

            sh.getImageSize(imgObject, {
                isHorizontal: true,
                bayWidth: 20,
                bayHeight: 30,
                containerWidth: 200,
                containerMaxHeight: 400
            });
            expectImgContainerSize(180, 400);

            sh.getImageSize(imgObject, {
                isHorizontal: false,
                bayWidth: 10,
                bayHeight: 10,
                containerWidth: 100,
                containerMaxHeight: 100
            });
            expectImgContainerSize(100, 90);

            sh.getImageSize(imgObject, {
                isHorizontal: false,
                bayWidth: 20,
                bayHeight: 30,
                containerWidth: 200,
                containerMaxHeight: 400
            });
            expectImgContainerSize(200, 370);
        });
    });
});
