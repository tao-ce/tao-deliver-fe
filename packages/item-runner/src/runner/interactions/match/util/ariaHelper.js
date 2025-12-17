// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { __ } from '@oat-sa-private/ui-core';

/**
 * @typedef {Object} choice
 * @property {String} key
 * @property {String} content
 * @property {String} plainText
 * @property {Number} position
 */

/**
 * Collection of aria helpers for:
 * - triggering aria-live updates in a DOM element
 * - generating aria labels for rendering
 * @param {choice[][]} choices - static value, originally defined in itemData
 * @returns {Object} API
 */
export default function AriaHelperFactory(choices) {
    const instructions = {
        unusedChoice: __('Press enter or space to grab and browse the answer area.'),
        bucketChoice: __('Press enter or space to grab.'),
        toMoveNextChoice: __('To move to next available option, use the arrow keys.'),
        toMoveNextAnswer: __('To move to next available answer, use the arrow keys.'),
        toPlace: __('Press enter or space to place down.'),
        toBrowse: __('To browse other groups use the arrow keys.'),
        toCancel: __('Press escape to cancel.'),
        answerAreaFull: __('Answer area is full. To move to the answer area press tab.')
    };
    const terms = {
        buttonDraggable: __('Button draggable.'),
        listAvailable: __('List available options.')
    };
    let ariaLiveElements = {};

    /**
     * Finds the choice with the specified key in either set
     * @param {Object} params
     * @param {String} [params.xKey]
     * @param {String} [params.yKey]
     * @returns {Object|void}
     */
    function getChoice({ xKey, yKey }) {
        if (xKey) {
            return choices[0].find(choice => choice.key === xKey);
        } else if (yKey) {
            return choices[1].find(choice => choice.key === yKey);
        }
    }

    return {
        /**
         * Receive the aria-live container and store it for module announcements
         * @param {HTMLElement} ariaLiveContainer - wrapper element containing elements with [aria-live] attributes
         */
        setAriaLiveContainer(ariaLiveContainer) {
            if (ariaLiveContainer instanceof HTMLElement) {
                ariaLiveElements = {
                    assertive: ariaLiveContainer.querySelector('[aria-live="assertive"]'),
                    polite: ariaLiveContainer.querySelector('[aria-live="polite"]')
                };
            }
        },

        /**
         * Update text in ariaLiveContainer to trigger SR announcement
         * @param {String} content
         * @param {Boolean} assertive - controls aria-live priority level
         */
        announce(content, assertive = false) {
            const level = assertive ? 'assertive' : 'polite';
            const element = ariaLiveElements[level];
            if (!element) {
                return;
            }
            element.innerHTML = ''; // allows to announce the content even it didn't change
            element.innerHTML = content;
        },

        /**
         * Aria live announcement for adding a matched pair
         * @param {String} xKey
         * @param {String} yKey
         */
        announceAddPair(xKey, yKey) {
            const choiceX = getChoice({ xKey });
            const choiceY = getChoice({ yKey });
            if (choiceX && choiceY) {
                this.announce(
                    __('%s has been placed in %s (group %d).', choiceX.plainText, choiceY.plainText, choiceY.position),
                    true
                );
            }
        },

        /**
         * Aria live announcement for removing a matched pair
         * @param {String} xKey
         * @param {String} yKey
         */
        announceRemovePair(xKey, yKey) {
            const choiceX = getChoice({ xKey });
            const choiceY = getChoice({ yKey });
            if (choiceX && choiceY) {
                this.announce(__('%s has been removed from %s.', choiceX.plainText, choiceY.plainText), true);
            }
        },

        /**
         * Aria live announcement for a cancelled action
         * @param {String} xKey
         */
        announceCancelled(xKey) {
            const choiceX = choices[0].find(choice => choice.key === xKey);
            if (choiceX) {
                this.announce(__('%s has not been placed.', choiceX.plainText), true);
            }
        },

        /**
         * Aria live announcement for a choice returned home
         * @param {String} xKey
         */
        announceReturned(xKey) {
            const choiceX = getChoice({ xKey });
            if (choiceX) {
                this.announce(__('%s has been returned to the available options.', choiceX.plainText), true);
            }
        },

        /**
         * Aria live announcement when focusing unused choices with a choice selected
         */
        announceUnusedChoices() {
            this.announce(
                `
                ${terms.listAvailable}
                ${instructions.toPlace}
                ${instructions.toBrowse}
                ${instructions.toCancel}`,
                true
            );
        },

        /**
         * Aria live announcement when focusing a bucket with a choice selected
         * @param {Striig} yKey
         */
        announceBucket(yKey) {
            const choiceY = getChoice({ yKey });
            if (choiceY) {
                this.announce(this.getBucketAriaLabel(choiceY), true);
            }
        },

        /**
         * Aria live announcement for selecting choice when no answer spaces available
         */
        announceAnswerAreaFull() {
            this.announce(instructions.answerAreaFull, true);
        },

        /**
         * Generate aria label for unused choices area (focusable only when a choice is selected)
         * @returns {String}
         */
        getUnusedChoicesAriaLabel() {
            return terms.listAvailable;
        },

        /**
         * Generate aria label for a bucket (focusable only when a choice is selected)
         * @param {choice} [choiceY] choice in Set B
         * @returns {String}
         */
        getBucketAriaLabel(choiceY) {
            return [
                `${choiceY.plainText}.`,
                __('group %d.', choiceY.position),
                instructions.toPlace,
                instructions.toBrowse,
                instructions.toCancel
            ].join(' ');
        },

        /**
         * Generate aria label for an unused choice
         * @param {Number} [listPosition] position of choiceX in list (starts at 1)
         * @param {Number} [listSize] amount of unused choices in list
         * @param {Number} [stackSize] amount of choiceX currently available
         * @returns {String}
         */
        getUnusedChoiceAriaLabel(listPosition = 1, listSize = 1, stackSize = -1) {
            const optionNumber = __('option %d of %d.', listPosition, listSize);
            const availability = stackSize === -1 ? '' : __('available %d times.', stackSize);
            return [
                optionNumber,
                terms.buttonDraggable,
                availability,
                terms.listAvailable,
                instructions.unusedChoice,
                instructions.toMoveNextChoice
            ].join(' ');
        },

        /**
         * Generate aria label for an placed choice
         * @param {choice} choiceY choice in Set B
         * @returns {String}
         */
        getPlacedChoiceAriaLabel(choiceY) {
            const grouping = __('grouped in %s.', choiceY.plainText);
            return [grouping, terms.buttonDraggable, instructions.bucketChoice, instructions.toMoveNextChoice].join(
                ' '
            );
        },

        /**
         * Generate aria label for choice remove button
         * @param {choice} choiceX choice in Set A
         * @returns {String}
         */
        getRemoveChoiceAriaLabel(choiceX) {
            return __('Return %s to the available options.', choiceX.plainText);
        }
    };
}
