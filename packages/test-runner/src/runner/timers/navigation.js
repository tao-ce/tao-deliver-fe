// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getTimersStore } from './timersStore.js';

/**
 * Check if navigation needs to be disabled giving min max timers
 * @param {string} serviceCallId
 * @param {object} currentTestPart
 * @param {string} itemIdentifier
 * @returns {boolean}
 */
export function isNavigationDisabledByTimers(serviceCallId, currentTestPart, itemIdentifier) {
    if (!serviceCallId || !currentTestPart || !itemIdentifier) {
        return false;
    }
    const timersStore = getTimersStore(serviceCallId);
    if (!timersStore) {
        return false;
    }
    const areTimersEqual = timersStore.isMinMaxEqual(itemIdentifier);
    //leave nav disabled only if timers are equal and test is linear otherwise enable it
    return areTimersEqual && currentTestPart.isLinear;
}
