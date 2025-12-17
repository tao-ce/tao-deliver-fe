// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tryParseMaxlength, tryParseMaxWords } from '../patternMask.js';

describe('tryParseMaxlength', () => {
    it('returns null if no pattern', () => {
        expect(tryParseMaxlength('')).toEqual(null);
        expect(tryParseMaxlength(null)).toEqual(null);
        expect(tryParseMaxlength()).toEqual(null);
    });

    it('returns maxlength if pattern matches template', () => {
        expect(tryParseMaxlength('^[\\s\\S]{0,4}$')).toEqual(4);
        expect(tryParseMaxlength('^[\\s\\S]{0,256}$')).toEqual(256);
    });

    it('returns null if pattern does not match template', () => {
        expect(tryParseMaxlength('^[a-z]{0,4}$')).toEqual(null);
        expect(tryParseMaxlength('^[\\s\\S]{1,4}$')).toEqual(null);
        expect(tryParseMaxlength('[\\s\\S]{0,4}')).toEqual(null);
    });
});

describe('tryParseMaxWords', () => {
    it('returns max words limit and word separators, if pattern matches template', () => {
        expect(
            tryParseMaxWords('^(?:(?:[^\\s\\:\\!\\?\\;\\\u2026\\\u20ac]+)[\\s\\:\\!\\?\\;\\\u2026\\\u20ac]*){0,50}$')
        ).toEqual({ max: 50, separators: '\\s.,:;?!&#%/*+=' });
        expect(
            tryParseMaxWords('^(?:(?:[^\\s\\:\\!\\?\\;\\\u2026\\\u20ac]+)[\\s\\:\\!\\?\\;\\\u2026\\\u20ac]*){0,1}$')
        ).toEqual({ max: 1, separators: '\\s.,:;?!&#%/*+=' });
    });

    it('returns null if pattern does not match template', () => {
        expect(tryParseMaxWords(null)).toEqual(null);
        expect(tryParseMaxWords()).toEqual(null);

        expect(
            tryParseMaxWords('^(?:(?:[^\\s\\:\\!\\?\\;\\\u2026\\\u20ac]+)[\\s\\:\\!\\?\\;\\\u2026\\\u20ac]*){1,50}$')
        ).toEqual(null);
        expect(
            tryParseMaxWords('(?:(?:[^\\s\\:\\!\\?\\;\\\u2026\\\u20ac]+)[\\s\\:\\!\\?\\;\\\u2026\\\u20ac]*){0,50}')
        ).toEqual(null);
        expect(
            tryParseMaxWords('^(?:(?:[\\s\\:\\!\\?\\;\\\u2026\\\u20ac]+)[\\s\\:\\!\\?\\;\\\u2026\\\u20ac]*){0,50}$')
        ).toEqual(null);
        expect(tryParseMaxWords('^(?:(?:[^\\s\\:\\!\\?\\;\\\u2026]+)[\\s\\:\\!\\?\\;\\\u2026]*){0,50}$')).toEqual(null);
        expect(tryParseMaxWords('^hello$')).toEqual(null);
    });
});
