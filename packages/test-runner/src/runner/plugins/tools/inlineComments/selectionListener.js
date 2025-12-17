// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getCommentsContainerSelector, commentBaseClassName } from './selectors.js';

/**
 * Helper which listens to document selection,
 * on nodes where comments can be created,
 * and triggers callbacks when selection is created/removed
 * @param {Object} options
 * @param {String[]} options.responseIds
 * @param {Function} options.onSelectedCallback
 * @param {Function} options.onClearedCallback
 * @returns {Object}
 */
export function selectionListenerFactory({ responseIds, onSelectedCallback, onClearedCallback } = {}) {
    const containers = responseIds.map(i => document.querySelector(getCommentsContainerSelector(i)));
    const intersectionBlacklistSelector = `.${commentBaseClassName}`;

    const documentSelection = window.getSelection(); //reference to browser `Selection` object
    let isTouchSelection = false;
    let isSelectionChanged = false;

    function onTouchStart() {
        if (!isTouchSelection) {
            isTouchSelection = true;
        }
    }
    function onMouseDown() {
        if (isTouchSelection) {
            isTouchSelection = false;
        }
    }

    function onSelectionChange() {
        if (!isSelectionChanged) {
            isSelectionChanged = true;
        }
        if (documentSelection.isCollapsed) {
            onClearedCallback();
        } else if (isTouchSelection) {
            onSelectionFinished();
        }
    }

    function onMouseUp() {
        if (isSelectionChanged) {
            onSelectionFinished();
            isSelectionChanged = false;
        }
    }

    function onSelectionFinished() {
        if (documentSelection.isCollapsed) {
            return;
        }

        let container;
        let allRanges = [];
        for (let i = 0; i < documentSelection.rangeCount; i++) {
            const range = documentSelection.getRangeAt(i);
            //if part of selection goes outside container, do nothing
            const containerForRange = containers.find(
                c =>
                    range.commonAncestorContainer &&
                    (c.contains(range.commonAncestorContainer) || c === range.commonAncestorContainer)
            );
            if (!container) {
                container = containerForRange;
            }

            if (container && container === containerForRange) {
                //don't offer whitespace ranges
                if (!range.collapsed && range.toString().trim().length > 0) {
                    allRanges.push(range);
                }
            }
        }

        //if selection overlaps blacklist, do nothing
        if (container && intersectionBlacklistSelector) {
            const blacklistNodes = Array.from(container.querySelectorAll(intersectionBlacklistSelector));
            if (blacklistNodes.some(i => documentSelection.containsNode(i, true))) {
                allRanges = [];
            }
        }

        if (!allRanges.length) {
            onClearedCallback();
        } else {
            const clonedRanges = allRanges.map(range => range.cloneRange());
            onSelectedCallback(clonedRanges, container);
        }
    }

    /**
     * Add selection listeners
     */
    function attach() {
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('touchstart', onTouchStart);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('selectionchange', onSelectionChange);
    }

    /**
     * Remove selection listeners
     */
    function detach() {
        document.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('selectionchange', onSelectionChange);
    }

    return {
        attach,
        detach
    };
}
