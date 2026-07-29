// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { semverCompare } from '../semver.js';

describe('semverCompare', () => {
    it('1 if A newer than B', () => {
        expect(semverCompare('1.3.1', '1.3.0')).toBe(1);
        expect(semverCompare('1.3.1-alpha.1', '1.3.0-alpha.2')).toBe(1);
        expect(semverCompare('1.2.2', '0.3.3')).toBe(1);
        expect(semverCompare('22.44.55', '22.33.66')).toBe(1);
    });
    it('0 if A equal to B', () => {
        expect(semverCompare('1.3.0', '1.3.0')).toBe(0);
        expect(semverCompare('1.3.1-alpha.1', '1.3.1-alpha.2')).toBe(0); //because we don't check postfix currently
        expect(semverCompare('22.44.55', '22.44.55')).toBe(0);
    });
    it('-1 if A older than B', () => {
        expect(semverCompare('1.3.0', '1.3.1')).toBe(-1);
        expect(semverCompare('1.3.0-alpha.2', '1.3.1-alpha.1')).toBe(-1);
        expect(semverCompare('0.3.3', '1.2.2')).toBe(-1);
        expect(semverCompare('22.33.66', '22.44.55')).toBe(-1);
    });
    it('undefined if versions are not valid', () => {
        expect(semverCompare(null, '1.3.0')).toBe(void 0);
        expect(semverCompare(void 0, '1.3.0')).toBe(void 0);
        expect(semverCompare('1.3', '1.3.0')).toBe(void 0);

        expect(semverCompare('1.3.0', '1a.3.0')).toBe(void 0);
        expect(semverCompare('1.3.0', null)).toBe(void 0);
    });
});
