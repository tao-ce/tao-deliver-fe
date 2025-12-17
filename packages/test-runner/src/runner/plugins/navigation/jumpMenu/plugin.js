// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * @typedef {Object} JumpMenuItem
 * @property {string} type - type of item which that belongs to corresponding area
 * @property {HTMLElement} area - area from AreaBroker
 * @property {Array<string>} availableStatuses - list of statuses available to show menu item
 * @property {function(area: HTMLElement, selector: string)} getHighlightElement - function to get HTMLElement for highlighting
 * @property {function(area: HTMLElement, selector: string)} getFocusableElement - function to get HTMLElement for focusing
 * @property {Function} getLabel - function to get label for link item
 */

import pluginFactory from 'taoTests/runner/plugin';
import JumpMenu from './JumpMenu.svelte';
import { testSessionStatus } from '../../../session/sessionStates.js';
import { __ } from '@oat-sa-private/ui-core';
import { getKeyboardFocusableElements } from '@oat-sa-private/ui-core/dom/dom.js';

/**
 * Jump Menu plugin
 */
export default pluginFactory({
    name: 'jumpMenu',

    init() {
        //mandatory
    },

    /**
     * Append a jump menu to the test runner container
     * The links are coupled with the TestLayout structure
     */
    render() {
        const testRunner = this.getTestRunner();
        const areaBroker = testRunner.getAreaBroker();
        const testConfig = testRunner.getConfig();

        /**
         * @type {Array<JumpMenuItem>}
         */
        const items = [
            {
                type: 'toolbox',
                area: areaBroker.getTopBarArea(),
                availableStatuses: [testSessionStatus.loading, testSessionStatus.interacting],
                getHighlightElement: area => getActionElement(area, '.headerbar aside'),
                getFocusableElement: area => getActionElement(area, '.headerbar aside button'),
                getLabel: () => __('Toolbox & Configuration')
            },
            {
                type: 'question',
                area: areaBroker.getMainArea(),
                availableStatuses: [testSessionStatus.interacting],
                getHighlightElement: area => getActionElement(area, '.qti-item-container'),
                getFocusableElement: area => getActionElement(area),
                getLabel: currentItem => getQuestionLinkLabel(currentItem)
            },
            {
                type: 'asideStart',
                area: areaBroker.getAsideStartArea?.(),
                availableStatuses: [testSessionStatus.interacting],
                getHighlightElement: area => getActionElement(area),
                getFocusableElement: area => getActionElement(area, 'button'),
                getLabel: () => __('Item attachment')
            },
            {
                type: 'asideEnd',
                area: areaBroker.getAsideEndArea?.(),
                availableStatuses: [testSessionStatus.interacting],
                getHighlightElement: area => getActionElement(area),
                getFocusableElement: area => getActionElement(area, 'button'),
                getLabel: () => __('Item attachment')
            },
            {
                type: 'navigation',
                area: areaBroker.getNavigationArea(),
                availableStatuses: [testSessionStatus.interacting],
                getHighlightElement: area => getActionElement(area),
                getFocusableElement: area => {
                    const [firstFocusableElement] = getKeyboardFocusableElements(area);
                    return checkElementAvailability(firstFocusableElement);
                },
                getLabel: () => __('Test Navigation')
            },
            !testConfig.options?.review && {
                type: 'itemModalFeedback-navigation',
                area: areaBroker.getItemModalFeedbackNavigatorArea(),
                availableStatuses: [testSessionStatus.interacting],
                getHighlightElement: area => getActionElement(area),
                getFocusableElement: area => {
                    const [firstFocusableElement] = getKeyboardFocusableElements(area);
                    return checkElementAvailability(firstFocusableElement);
                },
                getLabel: () => __('Test Navigation')
            },
            {
                type: 'overview',
                area: areaBroker.getOverlayContentArea(),
                availableStatuses: [testSessionStatus.overlay],
                getHighlightElement: area => getActionElement(area, '.tabpanel'),
                getFocusableElement: area => getActionElement(area, '.step'),
                getLabel: (currentItem, currentTestPart, currentTestMap) =>
                    __('the overview of all %d questions', getTotalQuestions(currentTestPart, currentTestMap))
            }
        ].filter(i => i);

        //render the plugin component
        this.jumpMenu = new JumpMenu({
            target: areaBroker.getJumpMenuArea(),
            props: {
                serviceCallId: testConfig.serviceCallId,
                items
            }
        });

        /**
         * Used for getting element to highlight or focus
         * @param {HTMLElement} area - area from AreaBroker
         * @param {string|null} selector - specific selector
         * @returns {HTMLElement|null}
         */
        function getActionElement(area, selector = null) {
            if (!area) {
                return null;
            }
            const element = selector ? area.querySelector(selector) : area;

            return checkElementAvailability(element);
        }

        /**
         * Used for checking existence and visibility of HTML Element
         * @param {HTMLElement} element
         * @returns {HTMLElement|null}
         */
        function checkElementAvailability(element) {
            return element && element.offsetParent !== null ? element : null;
        }

        /**
         * Get the label of the "jump to question" label based on the current state
         * @param {Object} currentItem - current item from state store
         * @returns {string} the label of the link
         */
        function getQuestionLinkLabel(currentItem) {
            if (currentItem) {
                const position = currentItem.position + 1;
                const state = currentItem.answered ? __('answered') : __('unanswered');
                return `${__('Question %d', position)}: ${state}`;
            }
            return '';
        }

        /**
         * Get total quantity of questions
         * @param {Object|null} currentTestPart - current test part from state store
         * @param {Object|null} currentTestMap - The current test map object
         * @returns {number} - The total number of questions
         */
        function getTotalQuestions(currentTestPart, currentTestMap) {
            // In delivery mode get number questions only to the current part
            if (!testConfig.options?.review) {
                return currentTestPart ? currentTestPart.stats?.total : 0;
            }
            // In review mode get number questions all the parts of the test
            return currentTestMap ? currentTestMap.stats?.total : 0;
        }

        /**
         * @param {Object} eventDetail
         * @param {string} eventDetail.itemType - item type (e.g. toolbox or navigation)
         */
        function handleHighlight({ itemType }) {
            const foundItem = items.find(item => item.type === itemType);

            handleUnhighlight();

            const highlightedElement = foundItem.getHighlightElement(foundItem.area);
            if (highlightedElement) {
                highlightedElement.classList.add('highlight-area');
            }
        }

        function handleUnhighlight() {
            items
                .map(item => item.getHighlightElement(item.area))
                .filter(Boolean)
                .forEach(element => element.classList.remove('highlight-area'));
        }

        /**
         * @param {Object} eventDetail
         * @param {string} eventDetail.itemType - item type (e.g. toolbox or navigation)
         */
        function handleFocusElement({ itemType }) {
            const itemToFocus = items.find(item => item.type === itemType);
            const focusElement = itemToFocus.getFocusableElement(itemToFocus.area);

            if (focusElement) {
                focusElement.focus();
            }
        }

        this.jumpMenu.$on('highlight', ({ detail }) => handleHighlight(detail));
        this.jumpMenu.$on('unhighlight', ({ detail }) => handleUnhighlight(detail));
        this.jumpMenu.$on('focusElement', ({ detail }) => handleFocusElement(detail));

        testRunner.on(`layoutchange.${this.getName()}`, () => {
            this.jumpMenu.refresh();
        });
    },

    /**
     * Destroy the plugin
     */
    destroy() {
        if (this.jumpMenu) {
            this.jumpMenu.$destroy();
        }
    }
});
