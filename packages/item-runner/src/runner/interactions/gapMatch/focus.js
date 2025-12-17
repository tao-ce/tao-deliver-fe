// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * This tracker helps to organize focusing flow between elements
 * For avoiding issues with wrong selectors three parent elements should be initialized before start using methods:
 * 'choiceListArea' - element with unmatched choices
 * 'answerArea' - element with matched choices
 * 'focusRouterElement' - helper element which is used for focusing gaps
 *
 * @constructor
 */
export default function FocusTracker() {
    /**
     * Binded areas are available after component initialization, so this method set correct areas after rendering
     * @param {HTMLElement} choiceListArea
     * @param {HTMLElement} answerArea
     * @param {HTMLElement} focusRouterElement
     */
    this.initAreas = function (choiceListArea, answerArea, focusRouterElement) {
        this.choiceListArea = choiceListArea.querySelector('.draggable-list');
        this.answerArea = answerArea;
        this.focusRouterElement = focusRouterElement; // this area helps to forward focus from answer area to exact child: gap of control
    };
    /**
     * Focus element
     * @param {HTMLElement} element
     */
    this.focus = function (element) {
        element.focus({ preventScroll: true });
        //todo scroll to elements only if they are out of viewport
        element.scrollIntoView(true);
    };

    /**
     * Enable ability to focus element
     */
    this.makeAnswerAreaFocusable = function () {
        this.focusRouterElement.setAttribute('tabindex', '0');
    };

    /**
     * Disable ability to focus element
     */
    this.makeAnswerAreaUnfocusable = function () {
        this.focusRouterElement.removeAttribute('tabindex');
    };

    /**
     * Focus answer area
     */
    this.focusAnswerArea = function () {
        this.focus(this.answerArea);
    };

    /**
     * Focus list with choices
     */
    this.focusChoiceListArea = function () {
        this.focus(this.choiceListArea.querySelector('.item-btn[tabindex="0"]'));
    };

    /**
     * Get all focusable elements in parent in order from top to bottom
     * @param {HTMLElement} parentElement
     * @returns { NodeList }
     */
    this.getAllFocusableElementsByParent = function (parentElement) {
        return parentElement.querySelectorAll('[tabindex]:not([tabindex="1000"]):not(.visually-hidden)');
    };

    /**
     * Get all focusable elements in answer area
     * @returns {NodeList}
     */
    this.getAllFocusableElements = function () {
        return this.getAllFocusableElementsByParent(this.answerArea);
    };

    /**
     * If gap contains choice - it is not focusable
     * @returns {array} - gaps
     */
    this.getAllFocusableGaps = function () {
        const elements = this.getAllFocusableElements();
        return [...elements].filter(element => element.classList.contains('gap-droppable'));
    };

    /**
     * Selected choice which matched with gaps
     * @returns {array} - choices
     */
    this.getAllFocusableChoicesInGaps = function () {
        const elements = this.getAllFocusableElements();
        return [...elements].filter(element => !element.classList.contains('gap-droppable'));
    };

    /**
     * Focus first empty gap in answer area
     * @returns {boolean} - false if no empty gaps
     */
    this.focusFirstEmptyGap = function () {
        const gaps = this.getAllFocusableGaps();
        if (gaps[0]) {
            this.focus(gaps[0]);
            return true;
        }
        return false;
    };

    /**
     * Focus choice placeholder in first filled gap.
     * @returns {boolean} - false if all gaps are empty
     */
    this.focusChoiceInFirstGap = function () {
        const elements = this.getAllFocusableChoicesInGaps();
        if (elements[0]) {
            this.focus(elements[0]);
            return true;
        }
        return false;
    };

    /**
     * Focus choice in pointed gap
     * @param {Node} gapElement
     */
    this.focusChoiceInGap = function (gapElement) {
        const focusableChildren = this.getAllFocusableElementsByParent(gapElement);
        // remove button is also focusable, so skip it
        const choiceToFocus = [...focusableChildren].filter(el => el.classList.contains('item-btn'))[0];
        this.focus(choiceToFocus);
    };

    /**
     * Focus previous/next element
     * @param {NodeList} elements - list of focusable elements
     * @returns {{focusPrevious: function, focusNext: function}|null}
     */
    this.moveFocus = function (elements) {
        let previousFocusableElement = null;
        let nextFocusableElement = null;
        const focusedElement = [...elements].some((element, index, arr) => {
            if (element.isSameNode(document.activeElement)) {
                previousFocusableElement = arr[index - 1] || elements[elements.length - 1];
                nextFocusableElement = arr[index + 1] || elements[0];
                return true;
            }
            return false;
        });
        //in 'elements' absent element which is focused now
        if (!focusedElement) {
            return null;
        }
        //focus next focusable element
        const nextFunction = () => {
            if (nextFocusableElement) {
                this.focus(nextFocusableElement);
            }
        };
        //focus previous focusable element
        const previousFunction = () => {
            if (previousFocusableElement) {
                this.focus(previousFocusableElement);
            }
        };

        return {
            focusNext: nextFunction,
            focusPrevious: previousFunction
        };
    };
}
