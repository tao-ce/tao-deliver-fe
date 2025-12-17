// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { sortChoicesByBoundingBox } from '../focusorder.js';

/**
 * Svelte Action to forward focus inside a container, and allow it out again
 *
 * @example
 * <div
 *   tabindex="0"
 *   use:forwardFocusToChoice={{choices, choiceKeysInTabOrder, lastFocusedChoiceKey, focusChoiceWithKey, isRTL}}
 *   on:setChoiceKeysTabOrder
 *   on:setLastFocusedChoiceKey
 *   on:setHasFocus>
 *   <svg>
 *     {#each choices as choice}
 *       <g class="choice" {...choice} />
 *     {/each}
 *   </svg>
 * </div>
 *
 * @param {HTMLElement} node - the container node in which to trap focus
 * @param {Object} options
 * @param {String[]} options.choiceKeysInTabOrder
 * @param {String} options.lastFocusedChoiceKey
 * @param {Function} options.focusChoiceWithKey - callback: (newFocusedChoiceKey: String) => void
 * @param {Object[]} [options.choices=[]]
 * @param {Boolean} [options.isRTL=false]
 * @param {Boolean} [options.hasFocus=false]
 * @returns {Object} - node's lifecycle hooks
 */
export default function forwardFocusToChoice(
    node,
    { choiceKeysInTabOrder, lastFocusedChoiceKey, focusChoiceWithKey, choices = [], isRTL = false, hasFocus = false }
) {
    /**
     * Forwards the focus to a child, when the node receives it
     * @fires setChoiceKeysTabOrder
     * @fires setLastFocusedChoiceKey
     * @fires setHasFocus
     */
    function handleFocus() {
        // One time only, sort the choices (which were assigned their svg elements on mount) into correct tabbing order
        if (!choiceKeysInTabOrder && choices.every(choice => !!choice.svg)) {
            choiceKeysInTabOrder = sortChoicesByBoundingBox(choices, isRTL);
            node.dispatchEvent(
                new CustomEvent('setChoiceKeysTabOrder', {
                    detail: choiceKeysInTabOrder
                })
            );
        }
        if (!hasFocus && choiceKeysInTabOrder) {
            // forward focus to a subcomponent (the remembered one or the first)
            const newFocusedChoiceKey = lastFocusedChoiceKey || choiceKeysInTabOrder[0];
            if (focusChoiceWithKey(newFocusedChoiceKey)) {
                node.dispatchEvent(
                    new CustomEvent('setLastFocusedChoiceKey', {
                        detail: newFocusedChoiceKey
                    })
                );
                node.dispatchEvent(
                    new CustomEvent('setHasFocus', {
                        detail: true
                    })
                );
            }
        }
    }

    /**
     * Handle focusin on window:
     * Communicate new hasFocus state, in case node:focusout didn't fire (Firefox & Safari do not fire it)
     * @param {Event} event
     * @fires setHasFocus
     */
    function handleWindowFocusin(event) {
        if (hasFocus && node !== event.target && !node.contains(event.target)) {
            node.dispatchEvent(
                new CustomEvent('setHasFocus', {
                    detail: false
                })
            );
        }
    }

    // Initialise the trap
    node.addEventListener('focus', handleFocus);
    window.addEventListener('focusin', handleWindowFocusin);

    return {
        /**
         * Hook on component lifecyle: remove global and local listeners
         */
        destroy() {
            node.removeEventListener('focus', handleFocus);
            window.removeEventListener('focusin', handleWindowFocusin);
        },

        /**
         * Hook to update action params
         * @param {Object} newOptions
         */
        update(newOptions) {
            ({ choiceKeysInTabOrder, lastFocusedChoiceKey, focusChoiceWithKey, hasFocus } = newOptions);
        }
    };
}
