// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { writable, get } from 'svelte/store';

export const lastVisitedStepStore = writable(0);

/**
 * Reset lastVisitedStepStore to 0
 */
export function resetLastVisitedStep() {
    lastVisitedStepStore.set(0);
}

/**
 * Determines if an item should be disabled in non-linear restricted navigation mode.
 *
 * @param {Object} item - Item object from store
 * @param {Number} currentPosition - current item position
 * @param {Object} testPart - current test part
 * @returns {Boolean}
 */
export function isItemDisabled(item, currentPosition, testPart) {
    let lastVisitedStep = get(lastVisitedStepStore);

    const itemIndex = item.position - testPart.position;
    if (itemIndex > lastVisitedStep && itemIndex <= currentPosition) {
        lastVisitedStep = itemIndex;
        lastVisitedStepStore.set(lastVisitedStep);
    }

    return itemIndex > lastVisitedStep + 1;
}
