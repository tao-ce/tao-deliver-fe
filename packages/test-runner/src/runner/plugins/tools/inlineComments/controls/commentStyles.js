// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Find all highlight nodes, and set their attributes for accessibility
 * @param {HTMLElement[]} highlightNodes
 * @param {Function} getColorKeyForHighlight
 */
export function makeHighlightNodesAccessible(highlightNodes, getColorKeyForHighlight) {
    for (const node of highlightNodes) {
        node.setAttribute('tabindex', '0');
        const colorKey = getColorKeyForHighlight(node);
        if (colorKey) {
            node.setAttribute('aria-describedby', `tao-description-for-${colorKey}`);
        }
    }
}

/**
 * Search for all instances of 2 touching highlight nodes, and set a class on all the second ones
 * @param {HTMLElement[]} highlightNodes
 */
export function applyAdjacentHighlightNodeStyles(highlightNodes) {
    for (let i = 0; i < highlightNodes.length - 1; i++) {
        // To add sibling style, these 2 nodes should be adjacent siblings...
        const node1 = highlightNodes[i];
        const node2 = highlightNodes[i + 1];
        const areSiblings = node1 === node2.previousSibling;
        // ... or have a non-visible text node between them.
        const between1 = node1.nextSibling;
        const between2 = node2.previousSibling;
        const hasMicroTextNodeBetween =
            between1 === between2 && between1?.nodeType === Node.TEXT_NODE && between1?.textContent.length === 0;

        node2.classList.toggle('sibling', areSiblings || hasMicroTextNodeBetween);
    }
}
