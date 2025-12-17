// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getActualKey } from '@oat-sa-private/ui-core';

/**
 * Svelte Action to prevent scroll-on-space within a given element
 *
 * @example
 * <div tabindex="0" use:preventSpaceScroll />
 *
 * @param {HTMLElement} node - node capturing the keydown events
 * @returns {Object} - node's lifecycle hooks
 */
export default function preventSpaceScroll(node) {
    /**
     * Handle space key
     * @param {KeyboardEvent} event
     */
    function handleKeyDown(event) {
        const pressedKey = getActualKey(event);
        if (pressedKey === 'space') {
            event.preventDefault();
        }
    }

    // Initialise the listener
    node.addEventListener('keydown', handleKeyDown);

    return {
        /**
         * Hook on component lifecyle: remove listener
         */
        destroy() {
            node.removeEventListener('keydown', handleKeyDown);
        }
    };
}
