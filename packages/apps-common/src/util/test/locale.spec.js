// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getLocaleFallback } from '../locale.js';

describe('getLocaleFallback', () => {
    test.each([
        ['ar', 'ar-arb'],
        ['ar-EGY', 'ar-arb'],
        ['ca-ES', 'val-ES'],
        ['de-AT', 'de-DE'],
        ['en-GB', 'en-US'],
        ['es-AR', 'es-ES'],
        ['fr-BE', 'fr-FR'],
        ['nl-BE', 'nl-NL'],
        ['pt-PT', 'pt-BR'],
        ['val-ES', 'es-ES'],
        [void 0, 'en-US'],
    ])('returns correct fallback locale for %s', (locale, expectedFallbackLocale) => {
        expect(getLocaleFallback(locale)).toBe(expectedFallbackLocale);
    });
});
