// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { isEqual } from 'lodash';
import { isResponseDefault, isResponseValid, isExtendedTextInteractionResponseTooLong } from './interaction.js';

/**
 * Get the state (answered and valid) of each interaction of the item
 * @param {Object} itemResponses
 * @returns {Object<string, Object>} by response identifier we get the answered and valid state
 */
export function getInteractionsStates(itemResponses) {
    return Object.keys(itemResponses).reduce((acc, responseIdentifier) => {
        acc[responseIdentifier] = {
            answered: !isResponseDefault(itemResponses[responseIdentifier]),
            valid: isResponseValid(itemResponses[responseIdentifier]),
            tooLong: isExtendedTextInteractionResponseTooLong(itemResponses[responseIdentifier])
        };
        return acc;
    }, {});
}

/**
 * If all interactions have a non-default answer
 * @param {Object} itemResponses
 * @returns {boolean} true if it is fully answered
 */
export function isItemAnswered(itemResponses) {
    const interactionStates = Object.values(getInteractionsStates(itemResponses));
    if (interactionStates.length) {
        return interactionStates.every(state => state.answered === true);
    }
    return false;
}

/**
 * If one of the interaction have a non-default answer
 * @param {Object} itemResponses
 * @returns {boolean} true if it is partially answered
 */
export function isItemPartiallyAnswered(itemResponses) {
    const interactionStates = Object.values(getInteractionsStates(itemResponses));
    if (interactionStates.length) {
        return interactionStates.some(state => state.answered === true);
    }
    return false;
}

/**
 * If all the interactions are valid
 * @param {Object} itemResponses
 * @returns {boolean} true if valid
 */
export function isItemValid(itemResponses) {
    const interactionStates = Object.values(getInteractionsStates(itemResponses));
    if (interactionStates.length) {
        return interactionStates.every(state => state.valid === true);
    }
    return true;
}

/**
 * If one of the interaction is valid
 * @param {Object} itemResponses
 * @returns {boolean} true if partially valid
 */
export function isItemPartiallyValid(itemResponses) {
    const interactionStates = Object.values(getInteractionsStates(itemResponses));
    if (interactionStates.length) {
        return interactionStates.some(state => state.valid === true);
    }
    return true;
}

/**
 * If there are no interactions in the item
 * @param {Object} itemResponses
 * @returns {boolean}
 */
export function isItemWithoutInteractions(itemResponses) {
    return Object.values(itemResponses).length === 0;
}

/**
 * If one of the interactions has a too long response
 * @param {Object} itemState
 * @returns {boolean} true if too long
 */
export function isItemResponseTooLong(itemState) {
    const interactionStates = Object.values(getInteractionsStates(itemState));
    if (interactionStates.length) {
        return interactionStates.some(state => state.tooLong === true);
    }
    return false;
}

/**
 * Extracts state from item state
 * @param {object} itemState
 * @returns {object}
 */
export function reduceItemStateToState(itemState) {
    if (!itemState) {
        return itemState;
    }

    return Object.keys(itemState).reduce((newState, responseIdentifier) => {
        const { state } = itemState[responseIdentifier];
        if (typeof state !== 'undefined' && state !== null) {
            newState[responseIdentifier] = { state };
        }
        return newState;
    }, {});
}

/**
 * Checks state was changed in two item states
 * @param {object} stateOne
 * @param {object} stateTwo
 * @returns {boolean}
 */
export function isStateChanged(stateOne, stateTwo) {
    const onlyStateOne = reduceItemStateToState(stateOne);
    const onlyStateTwo = reduceItemStateToState(stateTwo);

    return !isEqual(onlyStateOne, onlyStateTwo);
}
