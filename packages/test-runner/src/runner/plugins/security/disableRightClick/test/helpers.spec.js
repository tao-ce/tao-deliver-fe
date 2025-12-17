// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { isAllowedEvtTarget } from "../helpers.js";

describe('isAllowedEvtTarget helper', () => {
    it('returns true if target is allowed', () => {
        const target = document.createElement('input');
        expect(isAllowedEvtTarget(target)).toBe(true);
    });
    it('returns false if target is not allowed', () => {
        const target = document.createElement('div');
        expect(isAllowedEvtTarget(target)).toBe(false);
    });

    it('returns true if target has allow copy', () => {
        const target = document.createElement('div');
        target.setAttribute('data-allow-copy', true);
        expect(isAllowedEvtTarget(target)).toBe(true);
    });
});