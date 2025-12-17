// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import matchesHelperFactory from '../matchesHelper.js';

describe('matchesHelper API', () => {
    it('exports a function', () => {
        expect(typeof matchesHelperFactory).toBe('function');
    });

    it('creates an object with all methods', () => {
        const m = matchesHelperFactory();
        expect(typeof m).toBe('object');
        expect(typeof m.swap).toBe('function');
        expect(typeof m.addOrMove).toBe('function');
        expect(typeof m.remove).toBe('function');
        expect(typeof m.getGapUsageCount).toBe('function');
        expect(typeof m.isGapFree).toBe('function');
        expect(typeof m.isGapUsedByChoice).toBe('function');
        expect(typeof m.getChoiceUsageCount).toBe('function');
        expect(typeof m.getChoiceRemainingAmount).toBe('function');
    });
});

describe('matchesHelper methods', () => {
    describe('addOrMove', () => {
        const mh = matchesHelperFactory();

        it('can add 1 unused choice to 2 gaps', () => {
            const sourceKey = 'src';
            const targetGapKey1 = 'targetGap1';
            const targetGapKey2 = 'targetGap2';
            const matches = [];

            const res1 = mh.addOrMove(sourceKey, void 0, targetGapKey1, matches);
            expect(res1).toMatchObject([['src', 'targetGap1']]);

            const res2 = mh.addOrMove(sourceKey, void 0, targetGapKey2, res1);
            expect(res2).toMatchObject([
                ['src', 'targetGap1'],
                ['src', 'targetGap2']
            ]);
        });

        it('can add 2 unused choices to 1 gap', () => {
            const sourceKey1 = 'src1';
            const sourceKey2 = 'src2';
            const targetGapKey = 'targetGap';
            const matches = [];

            const res1 = mh.addOrMove(sourceKey1, void 0, targetGapKey, matches);
            expect(res1).toMatchObject([['src1', 'targetGap']]);

            const res2 = mh.addOrMove(sourceKey2, void 0, targetGapKey, res1);
            expect(res2).toMatchObject([
                ['src1', 'targetGap'],
                ['src2', 'targetGap']
            ]);
        });

        it('can move 1 placed choice to another gap and back', () => {
            const sourceKey = 'src';
            const sourceGapKey = 'srcGap';
            const targetGapKey = 'targetGap';
            const matches = [['src', 'srcGap']];

            const res1 = mh.addOrMove(sourceKey, sourceGapKey, targetGapKey, matches);
            expect(res1).toMatchObject([['src', 'targetGap']]);

            const res2 = mh.addOrMove(sourceKey, targetGapKey, sourceGapKey, res1);
            expect(res2).toMatchObject(matches);
        });
    });

    describe('remove', () => {
        it('can remove single placed choices one-by-one from multiple', () => {
            const mh = matchesHelperFactory();
            const choiceKey1 = 'src1';
            const choiceKey2 = 'src2';
            const choiceKey3 = 'src3';
            const gapKey = 'gap';
            const matches = [
                ['src1', 'gap'],
                ['src2', 'gap'],
                ['src3', 'gap']
            ];

            const res1 = mh.remove(choiceKey2, gapKey, matches);
            expect(res1).toMatchObject([
                ['src1', 'gap'],
                ['src3', 'gap']
            ]);

            const res2 = mh.remove(choiceKey1, gapKey, res1);
            expect(res2).toMatchObject([['src3', 'gap']]);

            const res3 = mh.remove(choiceKey3, gapKey, res2);
            expect(res3).toMatchObject([]);
        });
    });

    describe('swap', () => {
        const mh = matchesHelperFactory();
        const sourceKey = 'src';
        const targetKey = 'target';
        const sourceGapKey = 'srcGap';
        const targetGapKey = 'targetGap';

        it('can swap choice to answer', () => {
            const matches = [['target', 'targetGap']];
            const res = mh.swap(sourceKey, void 0, targetKey, targetGapKey, matches);
            expect(res).toMatchObject([['src', 'targetGap']]);
        });

        it('can swap answer to choice', () => {
            const matches = [['src', 'srcGap']];
            const res = mh.swap(sourceKey, sourceGapKey, targetKey, void 0, matches);
            expect(res).toMatchObject([['target', 'srcGap']]);
        });

        it('can swap answer to answer', () => {
            const matches = [
                ['src', 'srcGap'],
                ['target', 'targetGap']
            ];
            const res = mh.swap(sourceKey, sourceGapKey, targetKey, targetGapKey, matches);
            expect(res).toMatchObject([
                ['src', 'targetGap'],
                ['target', 'srcGap']
            ]);
        });

        it('when swap answer to answer, does not duplicate already existing match', () => {
            const matches = [
                ['src', 'srcGap'],
                ['target', 'targetGap'],
                ['target', 'srcGap']
            ];
            const res = mh.swap(sourceKey, sourceGapKey, targetKey, targetGapKey, matches);
            expect(res).toMatchObject([
                ['target', 'srcGap'],
                ['src', 'targetGap']
            ]);
        });
    });

    describe('getGapUsageCount', () => {
        const mh = matchesHelperFactory();
        const gapKey = 'gap';

        it('returns zero', () => {
            const matches = [['foo', 'bar']];
            expect(mh.getGapUsageCount(gapKey, matches)).toBe(0);
        });

        it('returns 1', () => {
            const matches = [
                ['foo', 'bar'],
                ['baz', 'gap']
            ];
            expect(mh.getGapUsageCount(gapKey, matches)).toBe(1);
        });

        it('returns 2', () => {
            const matches = [
                ['foo', 'bar'],
                ['baz', 'gap'],
                ['qux', 'gap']
            ];
            expect(mh.getGapUsageCount(gapKey, matches)).toBe(2);
        });
    });

    describe('isGapFree', () => {
        const mh = matchesHelperFactory();
        const gapKey = 'gap';
        const matches = [['choice', 'gap']];

        it('returns true due to matchMax unlimited', () => {
            const gaps = [{ key: 'gap', matchMax: 0 }];
            expect(mh.isGapFree(gapKey, matches, gaps)).toBe(true);
        });

        it('returns true due to matchMax not reached', () => {
            const gaps = [{ key: 'gap', matchMax: 2 }];
            expect(mh.isGapFree(gapKey, matches, gaps)).toBe(true);
        });

        it('returns false due to matchMax reached', () => {
            const gaps = [{ key: 'gap', matchMax: 1 }];
            expect(mh.isGapFree(gapKey, matches, gaps)).toBe(false);
        });
    });

    describe('isGapUsedByChoice', () => {
        const mh = matchesHelperFactory();
        const choiceKey = 'choice';
        const gapKey = 'gap';

        it('returns true', () => {
            const matches = [['choice', 'gap']];
            expect(mh.isGapUsedByChoice(gapKey, choiceKey, matches)).toBe(true);
        });

        it('returns false', () => {
            const matches = [];
            expect(mh.isGapUsedByChoice(gapKey, choiceKey, matches)).toBe(false);
        });

        it('returns false (even if gap present)', () => {
            const matches = [['foo', 'gap']];
            expect(mh.isGapUsedByChoice(gapKey, choiceKey, matches)).toBe(false);
        });

        it('returns false (even if choice present)', () => {
            const matches = [['choice', 'bar']];
            expect(mh.isGapUsedByChoice(gapKey, choiceKey, matches)).toBe(false);
        });
    });

    describe('getChoiceUsageCount', () => {
        const mh = matchesHelperFactory();
        const choiceKey = 'src';

        it('returns zero', () => {
            const matches = [['foo', 'bar']];
            expect(mh.getChoiceUsageCount(choiceKey, matches)).toBe(0);
        });

        it('returns 1', () => {
            const matches = [
                ['foo', 'bar'],
                ['src', 'baz']
            ];
            expect(mh.getChoiceUsageCount(choiceKey, matches)).toBe(1);
        });

        it('returns 2', () => {
            const matches = [
                ['foo', 'bar'],
                ['src', 'baz'],
                ['src', 'qux']
            ];
            expect(mh.getChoiceUsageCount(choiceKey, matches)).toBe(2);
        });
    });

    describe('getChoiceRemainingAmount', () => {
        const mh = matchesHelperFactory();
        const matches = [['src', 'gap']];

        it('returns zero', () => {
            const choice = { key: 'src', matchMax: 1 };
            expect(mh.getChoiceRemainingAmount(choice, matches)).toBe(0);
        });

        it('returns 1', () => {
            const choice = { key: 'src', matchMax: 2 };
            expect(mh.getChoiceRemainingAmount(choice, matches)).toBe(1);
        });

        it('returns 2', () => {
            const choice = { key: 'src', matchMax: 3 };
            expect(mh.getChoiceRemainingAmount(choice, matches)).toBe(2);
        });

        it('returns unlimited', () => {
            const choice = { key: 'src', matchMax: 0 };
            expect(mh.getChoiceRemainingAmount(choice, matches)).toBe(-1);
        });
    });
});
