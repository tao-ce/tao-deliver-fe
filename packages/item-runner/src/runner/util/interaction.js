// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pciJsonCodec from './pciJsonCodec.js';

/**
 * Is the interaction response value equal to the default?
 * @param {Object} interactionState
 * @param {Object} [interactionState.response]
 * @returns {Boolean}
 */
export function isResponseDefault(interactionState) {
    let value;
    try {
        ({ value } = pciJsonCodec.decode(interactionState.response));
    } catch (e) {
        return true;
    }

    // what can a null response look like?
    return value === null || value === '' || (Array.isArray(value) && !value.length) || typeof value === 'undefined';
}

/**
 * Is an interaction in a valid state?
 * @param {Object} interactionState
 * @param {Boolean} [interactionState.validity]
 * @returns {Boolean}
 */
export function isResponseValid(interactionState) {
    if (!interactionState || typeof interactionState.validity === 'undefined') {
        return true;
    }
    return interactionState.validity;
}

/**
 * Tells if an extendedTextInteraction state has a property that length limit was exceeded.
 * This is needed in addition to the `validity.tooLong` interaction validation event property,
 * because this length limit should always be applied, whether `validateResponses` is true or false.
 * @param {Object} interactionState
 * @returns {Boolean}
 */
export function isExtendedTextInteractionResponseTooLong(interactionState = {}) {
    return !!(interactionState && interactionState.count && interactionState.count.maxCharLimitExceeded === true);
}

/**
 * Tells if a given state looks like a mediaInteraction state
 * @param {Object} interactionState
 * @returns {Boolean}
 */
export function isMediaInteractionState(interactionState = {}) {
    return interactionState !== null && typeof interactionState === 'object' && 'playsUsed' in interactionState;
}

/**
 * Tells if an itemElementKey is that of a static Audio element
 * @param {String} key
 * @returns {Boolean}
 */
export function isStaticAudioIdentifier(key) {
    return typeof key === 'string' && key.startsWith('static_audio_');
}

/**
 * Tells if an itemElementKey is that of a static Video element
 * @param {String} key
 * @returns {Boolean}
 */
export function isStaticVideoIdentifier(key) {
    return typeof key === 'string' && key.startsWith('static_video_');
}
