// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Tests the functionality of the API of the MatchChoicesManager
 */
import MatchChoicesManagerFactory from '../matchChoicesManager.js';

describe('MatchChoicesManager API', () => {
    it('has expected API', () => {
        const choicesMgr = new MatchChoicesManagerFactory([]);

        expect(typeof choicesMgr.setPairs).toEqual('function');
        expect(typeof choicesMgr.getChoicesPairedWithKey).toEqual('function');
        expect(typeof choicesMgr.getPlaceholderChoices).toEqual('function');
        expect(typeof choicesMgr.getSortedUnusedChoices).toEqual('function');
        expect(typeof choicesMgr.getChoiceXUsageCount).toEqual('function');
        expect(typeof choicesMgr.getChoiceYUsageCount).toEqual('function');
        expect(typeof choicesMgr.getChoiceXStackSize).toEqual('function');
        expect(typeof choicesMgr.getChoicesPresentItemCount).toEqual('function');
        expect(typeof choicesMgr.areKeysPaired).toEqual('function');
        expect(typeof choicesMgr.canReceiveChoice).toEqual('function');
        expect(typeof choicesMgr.isValidBucket).toEqual('function');
    });
});

describe('MatchChoicesManager', () => {
    const choiceA = { key: 'A', matchMin: 1, matchMax: 2 };
    const choiceB = { key: 'B', matchMin: 0, matchMax: 1 };
    const choiceC = { key: 'C', matchMin: 0, matchMax: 0 };

    const bucket1 = { key: '1', matchMin: 1, matchMax: 2 };
    const bucket2 = { key: '2', matchMin: 0, matchMax: 1 };
    const bucket3 = { key: '3', matchMin: 0, matchMax: 0 };

    const choices = [
        [choiceA, choiceB, choiceC],
        [bucket1, bucket2, bucket3]
    ];

    const choicesMgr = new MatchChoicesManagerFactory(choices);

    afterEach(() => {
        choicesMgr.setPairs([]);
    });

    describe('getChoicesPairedWithKey', () => {
        it('gets correct choices paired with key', () => {
            choicesMgr.setPairs([
                ['A', '1'],
                ['B', '1'],
                ['C', '2']
            ]);
            const res = choicesMgr.getChoicesPairedWithKey('1');
            expect(res).toMatchObject([choiceA, choiceB]);
        });

        it('returns no choices', () => {
            choicesMgr.setPairs([
                ['A', '1'],
                ['B', '1'],
                ['C', '2']
            ]);
            const res = choicesMgr.getChoicesPairedWithKey('3');
            expect(res).toMatchObject([]);
        });
    });

    describe('getPlaceholderChoices', () => {
        it('returns all choices if empty and no matchmax', () => {
            choicesMgr.setPairs([]);
            const res = choicesMgr.getPlaceholderChoices(bucket3); // matchMax of 0
            expect(res).toMatchObject([choiceA, choiceB, choiceC]);
        });

        it('returns limited choices if partially full and no matchMax', () => {
            choicesMgr.setPairs([['A', '3']]);
            const res = choicesMgr.getPlaceholderChoices(bucket3); // matchMax of 0
            expect(res).toMatchObject([choiceB, choiceC]);
        });

        it('returns limited choices if partially full and matchMax undefined', () => {
            choicesMgr.setPairs([['A', '3']]);
            const res = choicesMgr.getPlaceholderChoices({ key: '3' });
            expect(res).toMatchObject([choiceB, choiceC]);
        });

        it('returns limited choices if empty and matchMax set', () => {
            choicesMgr.setPairs([]);
            const res = choicesMgr.getPlaceholderChoices(bucket1); // matchMax of 2
            expect(res).toMatchObject([choiceA, choiceB]);
        });

        it('returns limited choices if partially full and matchMax set', () => {
            choicesMgr.setPairs([['B', '1']]);
            const res = choicesMgr.getPlaceholderChoices(bucket1); // matchMax of 2
            expect(res).toMatchObject([choiceA]);
        });

        it('returns no choices if bucket full to the matchMax', () => {
            choicesMgr.setPairs([['C', '2']]);
            const res = choicesMgr.getPlaceholderChoices(bucket2); // matchMax of 1
            expect(res).toMatchObject([]);
        });
    });

    describe('getSortedUnusedChoices', () => {
        it('returns default choices', () => {
            choicesMgr.setPairs([]);
            const res = choicesMgr.getSortedUnusedChoices();
            expect(res).toMatchObject([choiceA, choiceB, choiceC]);
        });

        it('gets present choices sorted above absent', () => {
            choicesMgr.setPairs([['B', '1']]);
            const res = choicesMgr.getSortedUnusedChoices();
            expect(res).toMatchObject([choiceA, choiceC, choiceB]);
        });
    });

    describe('getChoiceXUsageCount', () => {
        it('returns zero usages', () => {
            choicesMgr.setPairs([]);
            const res = choicesMgr.getChoiceXUsageCount('A');
            expect(res).toBe(0);
        });

        it('returns 1 usage', () => {
            choicesMgr.setPairs([['B', '1']]);
            const res = choicesMgr.getChoiceXUsageCount('B');
            expect(res).toBe(1);
        });

        it('returns some usages among various', () => {
            choicesMgr.setPairs([
                ['A', '1'],
                ['C', '1'],
                ['C', '3'],
                ['B', '2']
            ]);
            const res = choicesMgr.getChoiceXUsageCount('C');
            expect(res).toBe(2);
        });
    });

    describe('getChoiceYUsageCount', () => {
        it('returns zero usages', () => {
            choicesMgr.setPairs([]);
            const res = choicesMgr.getChoiceYUsageCount('1');
            expect(res).toBe(0);
        });

        it('returns 1 usage', () => {
            choicesMgr.setPairs([['B', '2']]);
            const res = choicesMgr.getChoiceYUsageCount('2');
            expect(res).toBe(1);
        });

        it('returns some usages among various', () => {
            choicesMgr.setPairs([
                ['A', '3'],
                ['C', '1'],
                ['C', '3'],
                ['B', '2']
            ]);
            const res = choicesMgr.getChoiceYUsageCount('3');
            expect(res).toBe(2);
        });
    });

    describe('getChoiceXStackSize', () => {
        it('returns stack of 2', () => {
            choicesMgr.setPairs([]);
            const res = choicesMgr.getChoiceXStackSize('A');
            expect(res).toBe(2);
        });

        it('returns stack of 1', () => {
            choicesMgr.setPairs([['A', '1']]);
            const res = choicesMgr.getChoiceXStackSize('A');
            expect(res).toBe(1);
        });

        it('returns stack of 0', () => {
            choicesMgr.setPairs([
                ['A', '1'],
                ['A', '2']
            ]);
            const res = choicesMgr.getChoiceXStackSize('A');
            expect(res).toBe(0);
        });

        it('returns unlimited stack', () => {
            choicesMgr.setPairs([]);
            const res = choicesMgr.getChoiceXStackSize('C');
            expect(res).toBe(-1);
        });
    });

    describe('getChoicesPresentItemCount', () => {
        it('gets original count', () => {
            choicesMgr.setPairs([]);
            const res = choicesMgr.getChoicesPresentItemCount();
            expect(res).toBe(3);
        });

        it('gets reduced count', () => {
            choicesMgr.setPairs([
                ['A', '1'],
                ['B', '1']
            ]);
            const res = choicesMgr.getChoicesPresentItemCount();
            expect(res).toBe(2);
        });

        it('gets fully reduced count', () => {
            choicesMgr.setPairs([
                ['A', '1'],
                ['A', '2'],
                ['B', '1'],
                ['C', '2']
            ]);
            const res = choicesMgr.getChoicesPresentItemCount();
            expect(res).toBe(1);
        });
    });

    describe('areKeysPaired', () => {
        it('returns true if choices paired', () => {
            choicesMgr.setPairs([['A', '1']]);
            const res = choicesMgr.areKeysPaired('A', '1');
            expect(res).toBe(true);
        });

        it('returns false if choices not paired', () => {
            choicesMgr.setPairs([['A', '2']]);
            const res = choicesMgr.areKeysPaired('A', '1');
            expect(res).toBe(false);
        });
    });

    describe('canReceiveChoice', () => {
        it('returns false if bucket already has choice', () => {
            choicesMgr.setPairs([['A', '2']]);
            const res = choicesMgr.canReceiveChoice('A', '2');
            expect(res).toBe(false);
        });

        it('returns false if bucket full', () => {
            choicesMgr.setPairs([
                ['A', '2'],
                ['B', '2']
            ]);
            const res = choicesMgr.canReceiveChoice('C', '2');
            expect(res).toBe(false);
        });

        it('returns true if bucket can receive', () => {
            choicesMgr.setPairs([['A', '2']]);
            const res = choicesMgr.canReceiveChoice('C', '1');
            expect(res).toBe(true);
        });
    });

    describe('isValidBucket', () => {
        it('returns false if bucket too full', () => {
            choicesMgr.setPairs([
                ['A', '1'],
                ['B', '1'],
                ['C', '1']
            ]);
            const res = choicesMgr.isValidBucket(bucket1);
            expect(res).toBe(false);
        });

        it('returns false if bucket too empty', () => {
            choicesMgr.setPairs([]);
            const res = choicesMgr.isValidBucket(bucket1);
            expect(res).toBe(false);
        });

        it('returns true if bucket within constraints', () => {
            choicesMgr.setPairs([
                ['A', '1'],
                ['B', '1']
            ]);
            const res = choicesMgr.isValidBucket(bucket1);
            expect(res).toBe(true);
        });
    });
});
