// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { hasPlaceholder } from '../blocks/util/placeholder.js';

/**
 * Validate that current item should be switched to "dual independent columns" layout
 * @param {Node} node - the DOM node
 * @returns {boolean}
 */
export function validate(node) {
    //if node is absent we can not correctly validate, so do not handle this case anyway
    const rows = node.querySelectorAll('.grid-row');
    if (rows.length !== 1 || (rows.length === 1 && !rows[0].classList.contains('dual-column-layout'))) {
        return false;
    }
    const cols = rows[0].querySelectorAll(':scope > [class^="col-"]');

    return cols.length === 2;
}

/**
 * Filter nodes to find one which participates in creating custom layout
 * @param {Node} node - the DOM node
 * @returns {boolean}
 */
export function filterBlock(node) {
    if (!node) {
        return false;
    }
    // catch column element with 'col-*' class || if column do not has placeholders we never call this method, so we check parent row element rather than column
    return node.className.includes('col-') || (!hasPlaceholder(node) && node.className.includes('dual-column-layout'));
}

/**
 * Name of static component which will be used for columns in grid, instead of "Div"
 * @param {Node} node - the DOM node
 * @returns {bool|string}
 */
export function getElementName(node) {
    //we don't want to handle row element
    if (node && node.className.includes('dual-column-layout')) {
        return node.nodeName.toLowerCase();
    }
    return 'dualColumn';
}
