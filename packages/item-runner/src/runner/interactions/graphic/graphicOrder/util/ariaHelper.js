// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';

/**
 * Helper object that is responsible for aria-labels and aria-live announcements for GraphicOrder
 * @returns {Object}
 */
export default function ariaHelperFactory() {
    const toggleButton = __('Toggle button.');

    const getInstructionUnordered = n => __('Press enter or space to order to position %d.', n);
    const instructionOrdered = __('Press enter or space to unorder.');
    const instructionKeys = __('To move to next available hotspot, use the arrow keys.');
    const maximumReached = __('Maximum choices already reached.');

    function announce(text) {
        return { text }; //format used by AtomicAriaLive.svelte
    }

    /**
     * Get the choice's internal number from tab order (if known)
     *
     * @param {String} choiceKey
     * @param {String[]} choiceKeysInTabOrder
     * @returns {Number} - can be 0, which should be handled by caller
     */
    function getChoiceNumber(choiceKey, choiceKeysInTabOrder = []) {
        let choiceNumber = 0;
        if (choiceKeysInTabOrder.length) {
            choiceNumber = choiceKeysInTabOrder.indexOf(choiceKey) + 1;
        }
        return choiceNumber;
    }

    return {
        /**
         * Get aria-label for not placed choice
         * @param {Object} params
         * @param {Object} params.choice - Choice object used by interaction
         * @param {String[]} params.choiceKeysInTabOrder
         * @param {Number} params.choiceOrder - the number currently assigned by user
         * @param {Number} params.nextIndex - starts at zero
         * @param {Boolean} params.isSelected
         * @param {Boolean} [params.selectable=true]
         * @param {Boolean} [params.disabled=false]
         * @returns {String} aria-label
         */
        getChoiceAriaLabel({
            choice,
            choiceKeysInTabOrder,
            choiceOrder,
            nextIndex,
            isSelected,
            selectable = true,
            disabled = false
        }) {
            let ariaParts;
            const authoredLabel = choice.hotspotLabel || '';
            const choiceNumber = getChoiceNumber(choice.key, choiceKeysInTabOrder) || '';

            if (disabled) {
                ariaParts = [
                    authoredLabel,
                    __('Disabled hotspot %d.', choiceNumber),
                    __('Position %d.', choiceOrder),
                    instructionKeys
                ];
            } else if (isSelected) {
                ariaParts = [
                    authoredLabel,
                    __('Ordered hotspot %d.', choiceNumber),
                    __('Position %d.', choiceOrder),
                    toggleButton,
                    instructionOrdered,
                    instructionKeys
                ];
            } else {
                ariaParts = [
                    authoredLabel,
                    __('Unordered hotspot %d.', choiceNumber),
                    toggleButton,
                    selectable ? getInstructionUnordered(nextIndex + 1) : '',
                    instructionKeys
                ];
            }
            return ariaParts.join(' ');
        },

        /**
         * Get aria-live text for when choice is added to the order
         * @param {String} choiceKey
         * @param {Object[]} choices
         * @param {String[]} choiceKeysInTabOrder
         * @param {Number} choiceOrder - the number currently assigned by user
         * @returns {Object} announcement in format required by aria-live component
         */
        announceAdded(choiceKey, choices, choiceKeysInTabOrder, choiceOrder) {
            const choice = choices.find(c => c.key === choiceKey);
            const choiceNumber = getChoiceNumber(choiceKey, choiceKeysInTabOrder);

            return announce(
                [
                    choice.hotspotLabel || '',
                    __('Hotspot %d has been ordered to position %d.', choiceNumber, choiceOrder),
                    toggleButton,
                    instructionOrdered
                ].join(' ')
            );
        },

        /**
         * Get aria-live text for when choice is removed from the order
         * @param {String} choiceKey
         * @param {Object[]} choices
         * @param {String[]} choiceKeysInTabOrder
         * @returns {Object} announcement in format required by aria-live component
         */
        announceRemoved(choiceKey, choices, choiceKeysInTabOrder) {
            const choice = choices.find(c => c.key === choiceKey);
            const choiceNumber = getChoiceNumber(choice.key, choiceKeysInTabOrder);

            return announce(
                [choice.hotspotLabel || '', __('Ordered hotspot %d has been unordered.', choiceNumber)].join(' ')
            );
        },

        /**
         * Get aria-live text for max choices reached
         * @returns {Object} announcement in format required by aria-live component
         */
        announceMaximum() {
            return announce(maximumReached);
        }
    };
}
