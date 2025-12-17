// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { hasPlaceholder, extractPlaceholderContent } from '../placeholder.js';

it('check that input string contains placeholder ', () => {
    expect(hasPlaceholder('abc dfj')).toBe(false);
    expect(hasPlaceholder('abc {{erg}} dfj')).toBe(true);
});

it('converts string to array of chunks split by placeholder', () => {
    expect(extractPlaceholderContent('abc dfj')).toEqual(['abc dfj']);
    expect(extractPlaceholderContent('abc {{erg}} dfj')).toEqual(['abc ', '{{erg}}', ' dfj']);
});
