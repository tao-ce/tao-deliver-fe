// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { hasPlaceholder } from '../blocks/util/placeholder.js';

/**
 * Validate that node related with default layout
 * @returns {boolean}
 */
export function validate() {
    // any node basically has default layout
    return true;
}

/**
 * Filter nodes to find one which participates in creating layout
 * @param {Node} node - the DOM node
 * @returns {boolean}
 */
export function filterBlock(node) {
    //there is a placeholder in that branch,
    //or node is a table - `.\parser\mapper\table.js` needs a container with children that can be extracted
    return hasPlaceholder(node.textContent) || node.nodeName === 'TABLE';
}

/**
 * Name of static component which will be used for rendering node
 * @param {Node} node - the DOM node
 * @returns {bool|string}
 */
export function getElementName(node) {
    return node.nodeName.toLowerCase();
}
