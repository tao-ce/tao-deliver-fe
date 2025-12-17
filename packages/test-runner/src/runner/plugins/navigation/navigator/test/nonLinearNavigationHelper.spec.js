// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { get } from 'svelte/store';
import { lastVisitedStepStore, resetLastVisitedStep, isItemDisabled } from '../nonLinearNavigationHelper.js';

describe('nonLinearNavigationHelper', () => {
    afterEach(() => {
        resetLastVisitedStep();
    });

    describe('lastVisitedStepStore', () => {
        it('initializes with value 0', () => {
            expect(get(lastVisitedStepStore)).toBe(0);
        });

        it('can be updated', () => {
            lastVisitedStepStore.set(5);
            expect(get(lastVisitedStepStore)).toBe(5);
        });
    });

    describe('resetLastVisitedStep', () => {
        it('resets lastVisitedStepStore to 0', () => {
            lastVisitedStepStore.set(5);
            resetLastVisitedStep();
            expect(get(lastVisitedStepStore)).toBe(0);
        });
    });

    describe('isItemDisabled', () => {
        const testPart = { position: 1 };

        it('returns true for items beyond lastVisitedStep + 1', () => {
            const item = { position: 4 };
            const result = isItemDisabled(item, 2, testPart);
            expect(result).toBe(true);
        });

        it('returns false for items within or equal to lastVisitedStep + 1', () => {
            const item = { position: 2 };
            const result = isItemDisabled(item, 2, testPart);
            expect(result).toBe(false);
        });

        it('updates lastVisitedStep when nonLinearRestricted is true', () => {
            const item = { position: 3 };
            isItemDisabled(item, 3, testPart);
            expect(get(lastVisitedStepStore)).toBe(2);
        });
    });
});
