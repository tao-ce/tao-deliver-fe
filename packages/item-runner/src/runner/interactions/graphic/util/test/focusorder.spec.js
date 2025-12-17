// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { sortChoicesByBoundingBox, getChoiceNumericLabel, isRTLElement } from '../focusorder.js';

describe('sortChoicesByBoundingBox', () => {
    it('returns [] for [] input', () => {
        expect(sortChoicesByBoundingBox([])).toMatchObject([]);
    });

    /**
     * layout:
     * a b c
     *
     *  d e f
     *   g h
     */
    const choices = {
        a: {
            svg: {
                bbox: () => ({
                    x: 20,
                    y: 50
                })
            },
            key: 'a'
        },
        b: {
            svg: {
                bbox: () => ({
                    x: 40,
                    y: 50
                })
            },
            key: 'b'
        },
        c: {
            svg: {
                bbox: () => ({
                    x: 60,
                    y: 50
                })
            },
            key: 'c'
        },
        d: {
            svg: {
                bbox: () => ({
                    x: 30,
                    y: 100
                })
            },
            key: 'd'
        },
        e: {
            svg: {
                bbox: () => ({
                    x: 50,
                    y: 100
                })
            },
            key: 'e'
        },
        f: {
            svg: {
                bbox: () => ({
                    x: 70,
                    y: 100
                })
            },
            key: 'f'
        },
        g: {
            svg: {
                bbox: () => ({
                    x: 40,
                    y: 91
                })
            },
            key: 'g'
        },
        h: {
            svg: {
                bbox: () => ({
                    x: 60,
                    y: 109
                })
            },
            key: 'h'
        }
    };

    it('sorts choices with exactly the same Y by X', () => {
        expect(sortChoicesByBoundingBox([choices.c, choices.a, choices.b])).toMatchObject(['a', 'b', 'c']);
    });

    it('sorts choices with exactly the same X by Y', () => {
        expect(sortChoicesByBoundingBox([choices.d, choices.a])).toMatchObject(['a', 'd']);
    });

    it('sorts choices with almost the same Y by X (vertical banding)', () => {
        expect(sortChoicesByBoundingBox([choices.e, choices.f, choices.g, choices.d, choices.h])).toMatchObject([
            'd',
            'g',
            'e',
            'h',
            'f'
        ]);
    });

    it('sorts a shuffled array of choices - LTR', () => {
        expect(
            sortChoicesByBoundingBox([
                choices.c,
                choices.e,
                choices.f,
                choices.h,
                choices.g,
                choices.a,
                choices.d,
                choices.b
            ])
        ).toMatchObject(['a', 'b', 'c', 'd', 'g', 'e', 'h', 'f']);
    });

    it('sorts a shuffled array of choices - RTL', () => {
        expect(
            sortChoicesByBoundingBox(
                [choices.c, choices.e, choices.f, choices.h, choices.g, choices.a, choices.d, choices.b],
                true
            )
        ).toMatchObject(['c', 'b', 'a', 'f', 'h', 'e', 'g', 'd']);
    });

    it('returns the same order as input array if the svg bboxes are missing', () => {
        const incompleteChoices = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
        expect(sortChoicesByBoundingBox(incompleteChoices)).toMatchObject(['a', 'b', 'c']);
    });
});

describe('getChoiceNumericLabel', () => {
    it('returns empty string if params omitted', () => {
        expect(getChoiceNumericLabel({})).toBe('');
        expect(getChoiceNumericLabel({ key: 'a' })).toBe('');
    });

    const keyOrder = ['a', 'b', 'c', 'd'];

    it('returns numeric part of label', () => {
        const choice = {
            key: 'c'
        };
        expect(getChoiceNumericLabel(choice, keyOrder)).toBe('option 3 of 4');
    });

    it('returns full label', () => {
        const choice = {
            key: 'c',
            hotspotLabel: 'a footastic choice'
        };
        expect(getChoiceNumericLabel(choice, keyOrder)).toBe('option 3 of 4 a footastic choice');
    });
});

it('isRTLElement', () => {
    const element = document.createElement('div');
    element.style.direction = 'rtl';
    document.body.appendChild(element);

    expect(isRTLElement(element)).toBe(true);

    element.style.direction = null;
    expect(isRTLElement(element)).toBe(false);
});
