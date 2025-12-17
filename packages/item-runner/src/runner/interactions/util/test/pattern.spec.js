// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { convertPatternMask } from '../pattern.js';

describe('patten helper', () => {
    test.each([
        ['.*', '^.*$'],
        ['^[a-z]+', '^[a-z]+$'],
        ['[0-9]{1,2}$', '^[0-9]{1,2}$'],
        ['^abc$', '^abc$']
    ])('should convert %s to %s', (originalPattern, expectedPattern) => {
        expect(convertPatternMask(originalPattern)).toBe(expectedPattern);
    });
});
