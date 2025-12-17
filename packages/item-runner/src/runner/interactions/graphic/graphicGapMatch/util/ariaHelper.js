// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';

/**
 * Helper object that is responsible for aria-labels and aria-live announcements for GraphicGapMatch
 * @returns {Object}
 */
export default function ariaHelperFactory() {
    const choiceDescribedBy = __(
        'Press enter or space to grab and browse the answer area. To move to next available option, use the arrow keys.'
    );
    const answerDescribedBy = __('Press enter or space to grab. To move to next available answer, use the arrow keys.');
    const gapDescribedBy = __(
        'Press enter or space to place down. To browse other gaps use the arrow keys. Press escape to cancel.'
    );
    const announceFullIfChoiceFocused = __('Answer area is full. To move to the answer area press Tab');
    const announceFullIfAnswerFocused = __('Answer area is full. To return an answer use the arrow keys.');

    function announce(text) {
        return { text }; //format used by AtomicAriaLive.svelte
    }

    return {
        /**
         * Get aria-label for not placed choice
         * @param {Object} choice - Choice object used by interaction
         * @param {Object[]} freeChoices
         * @returns {String} aria-label
         */
        getChoiceAriaLabel(choice, freeChoices) {
            const choiceIndex = freeChoices.indexOf(choice);
            return __('%s option %d', choice.objectLabel || '', choiceIndex + 1);
        },
        /**
         * Get aria-label for answer
         * @param {Object} gap - Gap object used by interaction
         * @param {Object} choice - Choice object used by interaction
         * @param {String[]} gapKeysInAriaOrder
         * @returns {String} aria-label
         */
        getAnswerAriaLabel(gap, choice, gapKeysInAriaOrder) {
            const gapIndex = gapKeysInAriaOrder.indexOf(gap.key);
            return __('%s gap %d, filled with %s', gap.hotspotLabel || '', gapIndex + 1, choice.objectLabel || '');
        },
        /**
         * Get aria-label for gap
         * @param {Object} gap - Gap object used by interaction
         * @param {String[]} gapKeysInAriaOrder
         * @param {Number} gapUsageCount
         * @returns {String} aria-label
         */
        getGapAriaLabel(gap, gapKeysInAriaOrder, gapUsageCount) {
            const gapIndex = gapKeysInAriaOrder.indexOf(gap.key);
            return gapUsageCount === 0
                ? __('%s gap %d. Empty', gap.hotspotLabel || '', gapIndex + 1)
                : __('%s gap %d. Partially filled', gap.hotspotLabel || '', gapIndex + 1);
        },
        /**
         * Get aria-label for remove button of answer
         * @param {Object} choice - Choice object used by interaction
         * @returns {String} aria-label
         */
        getRemoveAriaLabel(choice) {
            return __('Return %s to the available options', choice.objectLabel || '');
        },
        /**
         * Get aria-describedby for not placed choice
         * @returns {String} aria-describedby
         */
        getChoiceDescribedBy() {
            return choiceDescribedBy;
        },
        /**
         * Get aria-describedby for answer
         * @returns {String} aria-describedby
         */
        getAnswerDescribedBy() {
            return answerDescribedBy;
        },
        /**
         * Get aria-describedby for gap
         * @returns {String} aria-describedby
         */
        getGapDescribedBy() {
            return gapDescribedBy;
        },
        /**
         * Get aria-live text for when choice is placed in answer area
         * @param {String} choiceKey
         * @param {String} gapKey
         * @param {Object[]} choices
         * @param {Object[]} freeChoices
         * @param {Object[]} gaps
         * @param {String[]} gapKeysInAriaOrder
         * @returns {Object} announcement in format required by aria-live component
         */
        announcePlaced(choiceKey, gapKey, choices, freeChoices, gaps, gapKeysInAriaOrder) {
            const choice = choices.find(c => c.key === choiceKey);
            const freeChoiceIndex = freeChoices.indexOf(choice);
            const gap = gaps.find(g => g.key === gapKey);
            const gapIndex = gapKeysInAriaOrder.indexOf(gapKey);
            if (freeChoiceIndex !== -1) {
                return announce(
                    __(
                        '%s option %d has been placed in %s gap %d',
                        choice.objectLabel || '',
                        freeChoiceIndex + 1,
                        gap.hotspotLabel || '',
                        gapIndex + 1
                    )
                );
            } else {
                return announce(
                    __(
                        '%s has been placed in %s gap %d',
                        choice.objectLabel || '',
                        gap.hotspotLabel || '',
                        gapIndex + 1
                    )
                );
            }
        },
        /**
         * Get aria-live text for when user is trying to place a choice but there are no free gaps
         * @param {Boolean} isFocusOnAnswer - false if user is trying to place a choice from choice area, true if move choice from answer area
         * @returns {Object} announcement in format required by aria-live component
         */
        announceFull(isFocusOnAnswer) {
            return announce(isFocusOnAnswer ? announceFullIfAnswerFocused : announceFullIfChoiceFocused);
        },
        /**
         * Get aria-live text for when answer is removed
         * @param {String} choiceKey
         * @param {Object[]} choices
         * @returns {Object} announcement in format required by aria-live component
         */
        announceRemoved(choiceKey, choices) {
            const choice = choices.find(c => c.key === choiceKey);
            return announce(__('%s has been returned to available options', choice.objectLabel || ''));
        },
        /**
         * Get aria-live text for when user was trying to place an answer, but cancelled operation
         * @param {String} choiceKey
         * @param {Object[]} choices
         * @param {Object[]} freeChoices
         * @returns {Object} announcement in format required by aria-live component
         */
        announceCancelled(choiceKey, choices, freeChoices) {
            const choice = choices.find(c => c.key === choiceKey);
            const freeChoiceIndex = freeChoices.indexOf(choice);
            if (freeChoiceIndex !== -1) {
                return announce(__('%s option %d has not been placed.', choice.objectLabel || '', freeChoiceIndex + 1));
            } else {
                return announce(__('%s has not been placed.', choice.objectLabel || ''));
            }
        }
    };
}
