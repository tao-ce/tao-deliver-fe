// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { withUnit, isResponsive } from '../size.js';

const undef = void 0;

describe('size', () => {
    test.each([
        ['2.4', 'px', '2.4px'],
        ['2.4', 'rem', '2.4rem'],
        ['2.4rem', 'px', '2.4rem'],
        [2.4, 'px', '2.4px'],
        [false, 'px', false],
        [undef, 'px', undef],
        [null, 'px', null],
        [0, 'px', '0px'],
        [483, 'px', '483px'],
        [275, undef, '275px'],
        ['auto', 'px', 'auto'],
        ['inherit', 'px', 'inherit'],
        [NaN, 'rem', NaN]
    ])('adds the unit correctly', (size, unit, expected) => {
        expect(withUnit(size, unit)).toBe(expected);
    });

    test.each([
        ['2.4', false],
        ['24', false],
        ['2.4rem', true],
        [2.4, false],
        [-24, false],
        ['2.4%', true],
        [undef, false],
        [null, false],
        [0, false],
        [483, false],
        [NaN, false],
        ['auto', true],
        ['75%', true],
        ['-15%', true],
        ['50vh', true],
        ['.5vmin', true],
        ['100vw', true]
    ])('%s isResponsive', (size, expected) => {
        expect(isResponsive(size)).toBe(expected);
    });
});
