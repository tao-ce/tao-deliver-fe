// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import getStep from '../stepProgressHelper.js';

const items = [
    [
        { answered: false, flagged: false, viewed: false, informational: false },
        { ariaLabel: 'Question 5. Not seen.', icon: null, state: null }
    ],
    [
        { answered: true, flagged: false, viewed: false, informational: false },
        { ariaLabel: 'Question 5. Completed.', icon: null, state: 'completed' }
    ],
    [
        { answered: false, flagged: false, viewed: true, informational: false },
        { ariaLabel: 'Question 5. Not completed.', icon: null, state: 'visited' }
    ],
    [
        { answered: false, flagged: false, viewed: false, informational: true },
        { ariaLabel: 'Informational Item. Not seen.', icon: 'info-bare-16', state: null }
    ],
    [
        { answered: true, flagged: false, viewed: true, informational: false },
        { ariaLabel: 'Question 5. Completed.', icon: null, state: 'completed' }
    ],
    [
        { answered: false, flagged: true, viewed: true, informational: false },
        { ariaLabel: 'Bookmarked Question 5. Not completed.', icon: 'bookmark-12', state: 'visited' }
    ],
    [
        { answered: false, flagged: false, viewed: true, informational: true },
        { ariaLabel: 'Informational Item. Seen.', icon: 'info-bare-16', state: 'completed' }
    ],
    [
        { answered: true, flagged: true, viewed: true, informational: false },
        { ariaLabel: 'Bookmarked Question 5. Completed.', icon: 'bookmark-12', state: 'completed' }
    ],
    [
        { answered: true, flagged: false, viewed: true, informational: true },
        { ariaLabel: 'Informational Item. Seen.', icon: 'info-bare-16', state: 'completed' }
    ],
    [
        { answered: false, flagged: true, viewed: true, informational: true },
        { ariaLabel: 'Informational Item. Seen.', icon: 'bookmark-12', state: 'completed' }
    ],
    [
        { answered: true, flagged: true, viewed: true, informational: true },
        { ariaLabel: 'Informational Item. Seen.', icon: 'bookmark-12', state: 'completed' }
    ],
    [
        { answered: false, flagged: true, viewed: true, informational: false, isTimedOut: true },
        { ariaLabel: 'Bookmarked Question 5. Not completed. Timed out.', icon: 'bookmark-12', state: 'visited' }
    ],
    [
        { answered: false, flagged: false, viewed: true, informational: false, isTimedOut: true },
        { ariaLabel: 'Question 5. Not completed. Timed out.', icon: 'timer-16', state: 'visited' }
    ]
];

describe('stepProgressHelper helper', () => {
    test.each(items)('returns step for state %j', (item, step) => {
        const viewPosition = item.informational ? null : 5;
        const itemFull = Object.assign({}, item, { position: 8, id: 'id1', label: 'Hi' });
        const stepFull = Object.assign({}, step, { key: 8, label: viewPosition });

        const isTimedOut = item.isTimedOut;
        delete item.isTimedOut;

        const actual = getStep(itemFull, true, viewPosition, isTimedOut);
        expect(actual).toEqual(stepFull);
    });

    it('does not use bookmark icon with showBookmarkState param', () => {
        const item = {
            position: 0,
            flagged: true,
            answered: false,
            viewed: false,
            informational: false
        };
        const actual = getStep(item, false, 1);
        expect(actual).toEqual({
            key: 0,
            label: 1,
            ariaLabel: 'Bookmarked Question 1. Not seen.',
            icon: null,
            state: null
        });
    });
});
