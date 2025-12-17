// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getActualKey } from '@oat-sa-private/ui-core';

/**
 * @deprecated use `import {arrowKeysFocusLoop} from '@oat-sa-private/ui-core'`
 *
 * Svelte Action to focus previous and next elements inside a container on arrow keys
 *
 * @example
 * <g
 *   use:arrowKeysFocusLoop={{choices, choiceKeysInTabOrder, lastFocusedChoiceKey, focusChoiceWithKey, isRTL}}
 *   on:setLastFocusedChoiceKey
 *   on:setHasFocus>
 *   {#each choices as choice}
 *     <g class="choice" {...choice} />
 *   {/each}
 * </g>
 *
 * @param {HTMLElement} node - container node inside which the focusables reside
 * @param {Object} options
 * @param {String[]} options.choiceKeysInTabOrder
 * @param {String} options.lastFocusedChoiceKey
 * @param {Function} options.focusChoiceWithKey - callback: (newFocusedChoiceKey: String) => void
 * @param {Boolean} [options.isRTL=false]
 * @returns {Object} - node's lifecycle hooks
 */
export default function arrowKeysFocusLoop(
    node,
    { choiceKeysInTabOrder, lastFocusedChoiceKey, focusChoiceWithKey, isRTL = false }
) {
    /**
     * Focus a sibling choice in the tabbing order
     * Supports looping from last to first
     * @param {Number} [offset=1] use 1 for next, -1 for previous
     * @fires setLastFocusedChoiceKey
     * @fires setHasFocus
     */
    function focusSibling(offset = 1) {
        if (lastFocusedChoiceKey) {
            const index = choiceKeysInTabOrder.indexOf(lastFocusedChoiceKey);
            const newIndex = (choiceKeysInTabOrder.length + index + offset) % choiceKeysInTabOrder.length;
            const newFocusedChoiceKey = choiceKeysInTabOrder[newIndex];
            if (focusChoiceWithKey(newFocusedChoiceKey)) {
                lastFocusedChoiceKey = newFocusedChoiceKey;
                node.dispatchEvent(
                    new CustomEvent('setLastFocusedChoiceKey', {
                        detail: newFocusedChoiceKey,
                        bubbles: true
                    })
                );
                node.dispatchEvent(
                    new CustomEvent('setHasFocus', {
                        detail: true,
                        bubbles: true
                    })
                );
            }
        }
    }

    /**
     * Handle key navigation (only arrow keys move between available choices)
     * @param {KeyboardEvent} event
     */
    function handleKeyDown(event) {
        const pressedKey = getActualKey(event);
        switch (pressedKey) {
            case 'down':
            case !isRTL && 'right':
            case isRTL && 'left':
                event.preventDefault();
                focusSibling(1);
                break;

            case 'up':
            case !isRTL && 'left':
            case isRTL && 'right':
                event.preventDefault();
                focusSibling(-1);
                break;
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
        },

        /**
         * Hook to update action params
         * @param {Object} newOptions
         */
        update(newOptions) {
            ({ choiceKeysInTabOrder, lastFocusedChoiceKey, focusChoiceWithKey } = newOptions);
        }
    };
}
