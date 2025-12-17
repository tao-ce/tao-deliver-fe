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
    const choiceDescribedBy = __(
        'Press enter or space to select and form an association. To move to the next available option, use the arrow keys'
    );
    const createAssociationDescribedBy = __(
        'Press space to associate. To move to next available option, use the arrow keys. Press escape to cancel.'
    );
    const selectedChoiceDescribedBy = __(
        'Selected. To move to next available option, use the arrow keys. Press escape or space to cancel.'
    );
    const disabledChoiceDescribedBy = __('Disabled. To move to next available option, use the arrow keys.');
    const inactiveChoiceDescribedBy = __('Inactive. To move to next available option, use the arrow keys.');
    const fulfilledChoiceDescribedBy = __('To move to next available option, use the arrow keys.');
    const button = __('Button.');

    function announce(text) {
        return { text }; //format used by AtomicAriaLive.svelte
    }

    /**
     * Get the choice's internal number from tab order (if known)
     *
     * @param {Object} choice
     * @param {String[]} choiceKeysInTabOrder
     * @returns {String} - can be 0, which should be handled by caller
     */
    function getChoiceNumber(choice, choiceKeysInTabOrder = []) {
        const choiceKey = choice ? choice.key : null;
        let choiceNumber = '';
        if (choiceKey && choiceKeysInTabOrder.length) {
            const index = choiceKeysInTabOrder.indexOf(choiceKey);
            choiceNumber = `${index !== -1 ? index + 1 : ''}`;
        }
        return choiceNumber;
    }

    /**
     * Get choice label
     * @param {Object} choice
     * @returns {String}
     */
    function getHotspotLabel(choice) {
        return (choice && choice.hotspotLabel) || '';
    }

    function getDefaultLabel(number) {
        return __('option %s', number);
    }

    /**
     * Get labels of choices for announcing
     * @param {Object} choice
     * @param {Array} orderedKeys
     * @returns {String}
     */
    function getHotspotLabels(choice, orderedKeys) {
        let label = 'option';
        if (choice) {
            const choiceNumber = getChoiceNumber(choice, orderedKeys);
            label = choice && choice.hotspotLabel ? getHotspotLabel(choice) : getDefaultLabel(choiceNumber);
        }

        return label;
    }

    /**
     * Preapare generic part of any choice
     * @param {Object} choiceFirst
     * @param {Array} associatedChoices - associated choices array
     * @param {String[]} orderedKeys
     * @returns {String}
     */
    function prepareChoiceLabel(choiceFirst, associatedChoices = [], orderedKeys) {
        let ariaParts = [];
        if (associatedChoices.length) {
            associatedChoices.forEach(choice => {
                const associatedChoiceLabel = getHotspotLabels(choice, orderedKeys);
                ariaParts.push(__('Associated with %s.', associatedChoiceLabel));
            });
            ariaParts.push(button);
        } else {
            ariaParts = [__('No association.'), button];
        }
        return ariaParts.join(' ');
    }

    return {
        /**
         * Get aria-describedby for choice
         * @returns {String} aria-describedby
         */
        getChoiceDescribedBy() {
            return choiceDescribedBy;
        },
        /**
         * Get aria-describedby for association
         * @returns {String} aria-describedby
         */
        getAssociationCreationDescribedBy() {
            return createAssociationDescribedBy;
        },
        /**
         * Get aria-describedby for selected choice
         * @returns {String} aria-describedby
         */
        getSelectedChoiceDescribedBy() {
            return selectedChoiceDescribedBy;
        },
        /**
         * Get aria-describedby for choice with have max associations
         * @returns {String} aria-describedby
         */
        getFulfilledChoiceDescribedBy() {
            return fulfilledChoiceDescribedBy;
        },
        /**
         * Get aria-describedby for disabled choice
         * @returns {String} aria-describedby
         */
        getDisabledChoiceDescribedBy() {
            return disabledChoiceDescribedBy;
        },
        /**
         * Get aria-describedby for inactive choice
         * @returns {String} aria-describedby
         */
        getInactiveChoiceDescribedBy() {
            return inactiveChoiceDescribedBy;
        },
        /**
         * Get aria-label for choice
         * @param {Object} choiceFirst
         * @param {Array} associatedChoices - associated choices array
         * @param {String[]} orderedKeys
         * @returns {String} aria-label
         */
        getChoiceAriaLabel(choiceFirst, associatedChoices = [], orderedKeys) {
            let ariaParts = [
                getHotspotLabels(choiceFirst, orderedKeys),
                prepareChoiceLabel(choiceFirst, associatedChoices, orderedKeys)
            ];
            return ariaParts.join('. ');
        },

        /**
         * Get aria-label for choice which reached association limit
         * @param {Object} choiceFirst
         * @param {Array} associatedChoices - associated choices array
         * @param {String[]} orderedKeys
         * @returns {String} aria-label
         */
        getChoiceMaxAssociationLabel(choiceFirst, associatedChoices = [], orderedKeys) {
            const firstLabel = getHotspotLabels(choiceFirst, orderedKeys);
            const associations = prepareChoiceLabel(choiceFirst, associatedChoices, orderedKeys);
            return __('%s. Max associations reached. %s', firstLabel, associations);
        },

        /**
         * Get aria-label for choice
         * @param {Object} choiceFirst
         * @param {Object} choiceSecond
         * @param {String[]} orderedKeys
         * @returns {String} aria-label
         */
        getRemoveButtonAriaLabel(choiceFirst, choiceSecond, orderedKeys) {
            const firstLabel = getHotspotLabels(choiceFirst, orderedKeys);
            const secondLabel = getHotspotLabels(choiceSecond, orderedKeys);

            return [__('Delete association between %s and %s.', firstLabel, secondLabel), button].join(' ');
        },

        /**
         * Get aria-live text for when association is created
         * @param {Object} choiceFirst
         * @param {Object} choiceSecond
         * @param {String[]} orderedKeys
         * @returns {Object} announcement in format required by aria-live component
         */
        announceAdded(choiceFirst, choiceSecond, orderedKeys) {
            const firstLabel = getHotspotLabels(choiceFirst, orderedKeys);
            const secondLabel = getHotspotLabels(choiceSecond, orderedKeys);

            return announce(__('Association between %s and %s created.', firstLabel, secondLabel));
        },

        /**
         * Get aria-live text for when association is removed
         * @param {Object} choiceFirst
         * @param {Object} choiceSecond
         * @param {String[]} orderedKeys
         * @returns {Object} announcement in format required by aria-live component
         */
        announceRemoved(choiceFirst, choiceSecond, orderedKeys) {
            const firstLabel = getHotspotLabels(choiceFirst, orderedKeys);
            const secondLabel = getHotspotLabels(choiceSecond, orderedKeys);

            return announce(__('The association between %s and %s has been deleted.', firstLabel, secondLabel));
        },

        /**
         * Get aria-live text for cancelled activated action
         * @returns {Object} announcement in format required by aria-live component
         */
        announceCancelled() {
            return announce(__('cancelled'));
        }
    };
}
