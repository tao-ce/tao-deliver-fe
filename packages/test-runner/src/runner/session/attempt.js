// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import {
    isItemAnswered,
    isItemValid,
    isItemPartiallyAnswered,
    isItemWithoutInteractions,
    isItemResponseTooLong
} from '@oat-sa-private/tao-item-runner-qtinui/src/runner/util/item.js';
import {
    isMediaInteractionState,
    isStaticAudioIdentifier,
    isStaticVideoIdentifier
} from '@oat-sa-private/tao-item-runner-qtinui/src/runner/util/interaction.js';
import { isEqual, cloneDeep } from 'lodash';

const submissionModes = Object.freeze({
    individual: 0,
    simultaneous: 1
});

/**
 * Run the main logic to see if item can be submitted in current state
 * @export
 * @param {Object} [itemState={}] e.g. { RESPONSE: { response: {}, validity: false, ...<otherKeys> } }
 * @param {Object} [itemResponses={}] e.g. { RESPONSE: { response: {}, validity: false } }
 * @param {Boolean} [allowSkipping=true]
 * @param {Boolean} [validateResponses=false]
 * @param {Number} submissionMode // TODO: replace parameter by testMap.submissionMode, when BE supports it
 * @returns {Object} { canSkip: Boolean, canSubmit: Boolean }
 */
export function checkItemSubmission(
    itemState = {},
    itemResponses = {},
    allowSkipping = true,
    validateResponses = false,
    submissionMode = submissionModes.individual
) {
    let canSkip = true;
    let canSubmit = true;

    if (submissionMode === submissionModes.individual) {
        if (!allowSkipping && !isItemWithoutInteractions(itemResponses)) {
            if (!isItemAnswered(itemResponses)) {
                canSkip = false;
            }
        }

        if (validateResponses) {
            canSubmit = false;
            if (isItemValid(itemResponses)) {
                canSubmit = true;
            }
        } else {
            if (isItemResponseTooLong(itemState)) {
                canSubmit = false;
            }
        }
    }

    return {
        canSkip,
        canSubmit
    };
}

/**
 * Update current item stats
 * @export
 * @param {Object} currentItem
 * @param {Object} itemResponses - e.g. { RESPONSE: { response: {}, validity: false } }
 * @param {Boolean} [isLinearTestPart=false]
 * @param {Boolean} [countAttempt=true] - if true, updates numAttempts & remainingAttempts
 * @returns {Object} updated currentItem
 */
export function updateItemAttempt(currentItem, itemResponses, isLinearTestPart = false, countAttempt = true) {
    // Set viewed
    const viewed = true;

    // Set answered
    let answered = currentItem.answered;
    if (typeof answered === 'undefined') {
        answered = false;
    }
    if (countAttempt) {
        answered = isItemAnswered(itemResponses) || isLinearTestPart;
    }

    // Increase or initialise numAttempts
    let numAttempts = currentItem.numAttempts;
    if (typeof numAttempts === 'undefined') {
        numAttempts = 0;
    }
    if (countAttempt) {
        numAttempts++;
    }

    // Decrease or initialise remainingAttempts
    let remainingAttempts = currentItem.remainingAttempts;
    if (typeof remainingAttempts === 'undefined') {
        remainingAttempts = -1;
    }
    if (countAttempt && remainingAttempts > 0) {
        remainingAttempts--;
    }

    return Object.assign({}, currentItem, {
        viewed,
        answered,
        numAttempts,
        remainingAttempts
    });
}

/**
 * Takes an itemState object and returns the part of it corresponding to response and its validity
 * @export
 * @param {Object} itemState
 * @returns {Object} itemResponses, formatted: { [responseIdentifier]: { response: {}, validity: false } }
 */
export function reduceStateToResponses(itemState = {}) {
    if (!itemState) {
        return itemState;
    }

    const newState = {};

    Object.keys(itemState)
        .filter(responseIdentifier => typeof itemState[responseIdentifier].response !== 'undefined')
        .forEach(responseIdentifier => {
            newState[responseIdentifier] = {
                response: itemState[responseIdentifier].response,
                validity: itemState[responseIdentifier].validity
            };
            if (typeof newState[responseIdentifier].validity === 'undefined') {
                newState[responseIdentifier].validity = true;
            }
        });

    return newState;
}

/**
 * Check if there is a difference in the response between 2 itemState objects
 * @export
 * @param {Object} itemStateBefore
 * @param {Object} itemStateAfter
 * @returns {Boolean}
 */
export function isResponseChanged(itemStateBefore, itemStateAfter) {
    const itemResponsesBefore = reduceStateToResponses(itemStateBefore);
    const itemResponsesAfter = reduceStateToResponses(itemStateAfter);

    if (
        itemResponsesBefore &&
        itemResponsesAfter &&
        !isItemPartiallyAnswered(itemResponsesBefore) &&
        !isItemPartiallyAnswered(itemResponsesAfter)
    ) {
        return false;
    }
    if (isEqual(itemResponsesBefore, itemResponsesAfter)) {
        return false;
    }
    return true;
}

/**
 * Remove MediaInteractions responses from the itemState
 * (so we can check for actual changed responses, ignoring play count increment)
 * @export
 * @param {Object} itemState
 * @returns {Object} itemState
 */
export function excludeMediaInteractions(itemState = {}) {
    if (!itemState) {
        return itemState;
    }

    const newState = {};

    Object.entries(itemState).forEach(([key, state]) => {
        if (!isMediaInteractionState(state)) {
            newState[key] = state;
        }
    });
    return newState;
}

/**
 * Make a new itemState for the 'skip' payload.
 * This itemState consists of the session start item state (no responses),
 * merged with the session end item state of a few element types.
 * @export
 * @param {Object} itemStateBefore
 * @param {Object} itemStateAfter
 * @returns {Object} itemState reduced to submissible state
 */
export function createSkipSubmissionItemState(itemStateBefore, itemStateAfter) {
    if (!itemStateBefore) {
        itemStateBefore = {};
    }
    if (!itemStateAfter) {
        itemStateAfter = {};
    }

    const submissibleState = cloneDeep(itemStateBefore);

    Object.entries(itemStateAfter).forEach(([key, state]) => {
        // Currently, only media interactions & elements are supported
        if (
            isMediaInteractionState(state) ||
            isStaticAudioIdentifier(key) ||
            isStaticVideoIdentifier(key) ||
            key === 'touched'
        ) {
            submissibleState[key] = state;
        }
    });
    return submissibleState;
}
