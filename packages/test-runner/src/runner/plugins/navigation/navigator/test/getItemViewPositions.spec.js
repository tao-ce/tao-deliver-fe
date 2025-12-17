// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import getItemViewPositions from '../getItemViewPositions.js';

describe('getItemViewPositions helper', () => {
    it('returns position relative to testPart and skips informational items', () => {
        const testPart = {
            position: 7,
            sections: {
                'section-1': {
                    items: {
                        'item-20': {
                            position: 7,
                            informational: false
                        },
                        'item-21': {
                            position: 8,
                            informational: true
                        },
                        'item-3': {
                            position: 9,
                            informational: true
                        },
                        'item-5': {
                            position: 10,
                            informational: false
                        }
                    }
                },
                'assessmentSection-3': {
                    items: {
                        'item-1': {
                            position: 11,
                            informational: true
                        },
                        'item-2': {
                            position: 12,
                            informational: false
                        },
                        'item-4': {
                            position: 13,
                            informational: false
                        }
                    }
                }
            }
        };

        const actual = getItemViewPositions(testPart);
        expect(actual).toEqual({
            7: 1,
            8: null,
            9: null,
            10: 2,
            11: null,
            12: 3,
            13: 4
        });
    });
});
