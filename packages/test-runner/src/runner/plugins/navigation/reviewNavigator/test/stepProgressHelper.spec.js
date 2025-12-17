// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import getStep from '../stepProgressHelper.js';

const simpleItems = [
    [{ answered: false, flagged: false, viewed: false, informational: false }],
    [{ answered: true, flagged: false, viewed: false, informational: false }],
    [{ answered: false, flagged: false, viewed: true, informational: false }],
    [{ answered: false, flagged: false, viewed: false, informational: true }],
    [{ answered: true, flagged: false, viewed: true, informational: false }],
    [{ answered: false, flagged: true, viewed: true, informational: false }],
    [{ answered: false, flagged: false, viewed: true, informational: true }],
    [{ answered: true, flagged: true, viewed: true, informational: false }],
    [{ answered: true, flagged: false, viewed: true, informational: true }],
    [{ answered: false, flagged: true, viewed: true, informational: true }],
    [{ answered: true, flagged: true, viewed: true, informational: true }]
];

const scoredItems = [
    [{ maxScore: 12, score: 12, answered: false, viewed: false }],
    [{ maxScore: 12, score: 12, answered: false, viewed: true }],
    [{ maxScore: 12, score: 12, answered: true, viewed: true }],
    [{ maxScore: 2, score: 1, answered: true, viewed: true }],
    [{ maxScore: 1, score: 0, answered: true, viewed: true }],
    [{ maxScore: 0, score: 0, answered: true, viewed: true }],
    [{ externalScored: true, maxScore: 2, score: null, answered: false, viewed: true }],
    [{ externalScored: true, maxScore: 2, score: null, answered: true, viewed: true }],
    [{ externalScored: true, maxScore: 2, score: 2, answered: true, viewed: true }],
    [{ externalScored: true, maxScore: 0, score: null, answered: true, viewed: true }]
];

describe('stepProgressHelper helper', () => {
    const getActual = (item, showScore) => {
        const viewPosition = item.informational ? null : 5;
        const itemFull = Object.assign({}, item, { position: 8, id: 'id1', label: 'Hi' });
        return getStep({ showScore })(itemFull, true, viewPosition);
    };

    test.each([...simpleItems, ...scoredItems])('returns step if showScore=true %j', item => {
        const actual = getActual(item, true);
        expect(actual).toMatchSnapshot();
    });

    it('does not return score states if showScore=false', () => {
        const commonResultProps = { icon: null, key: 8, label: 5 };
        expect(getActual(simpleItems[0][0], false)).toEqual({
            ariaLabel: 'Question 5. Not completed.',
            state: void 0,
            ...commonResultProps
        });
        expect(getActual(simpleItems[4][0], false)).toEqual({
            ariaLabel: 'Question 5. Completed.',
            state: 'completed',
            ...commonResultProps
        });
        expect(getActual(scoredItems[7][0], false)).toEqual({
            ariaLabel: 'Question 5. Completed.',
            state: 'completed',
            ...commonResultProps
        });
        expect(getActual(scoredItems[7][0], false)).toEqual({
            ariaLabel: 'Question 5. Completed.',
            state: 'completed',
            ...commonResultProps
        });
    });
});
