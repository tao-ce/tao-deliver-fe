// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Try to find the closest parent element which is a block, recursively
 * @param {HTMLElement} element - the element to check the parent
 * @returns {HTMLElement?} the parent element or null
 */
export function findClosestBlockParent(element) {
    const parent = element && element.parentElement;
    if (parent) {
        const display = window.getComputedStyle(parent).display;
        if (!['none', 'inline', 'inline-block'].includes(display)) {
            return parent;
        } else if (!['BODY', 'HTML', 'HEAD'].includes(parent.nodeName)) {
            return findClosestBlockParent(parent);
        }
    }
    return null;
}

/**
 * Check if element's parent row contains only this element and its column,
 * and return the row element if true.
 * @param {HTMLElement} element - the element to check the parent
 * @returns {HTMLElement|null} - row element or `null` if conditions didn't match
 */
export function findRowIfContainsOnly(element) {
    const row = element?.closest('.grid-row');
    const cols = row?.querySelectorAll('[class^="col-"], [class*="col-"]');
    if (row && cols.length === 1 && cols[0].children.length === 1 && cols[0].children[0] === element) {
        return row;
    }
    return null;
}
