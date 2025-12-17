// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Parser which provide various methods to work with layouts.
 * Each imported layout require to implement at least three methods: validate, filterBlock, getElementName
 */
import * as dualColumnLayout from './dualColumnLayout.js';
import * as defaultLayout from './defaultLayout.js';

const layoutsHandlers = new Map([['dualColumnLayout', dualColumnLayout]]);

/**
 * Returns name of component which will be used to build layout
 * @param {string} layout - layout name
 * @param {Node} node - the DOM node
 * @returns {string}
 */
export function getElementName(layout, node) {
    return layout && layoutsHandlers.has(layout) ? layoutsHandlers.get(layout).getElementName(node) : '';
}

/**
 * Select node which have to be prepared for correctly using income layout
 * @param {string} layout - layout name
 * @param {Node} node - the DOM node
 * @returns {boolean}
 */
export function filterBlockByLayout(layout, node) {
    if (!layout) {
        return false;
    }
    return layoutsHandlers.has(layout) && layoutsHandlers.get(layout).filterBlock(node);
}
/**
 * Get list of all item layouts
 * @param {Node} bodyNode node element of test body. Do not take care about children's body
 * @returns {[]} names of layouts which should be applied to item
 */
export function getLayouts(bodyNode) {
    // default layout always should be the last, because we filter nodes from first to last till first success
    if (!layoutsHandlers.has('defaultLayout')) {
        layoutsHandlers.set('defaultLayout', defaultLayout);
    }

    const layouts = [];
    for (const [name, handler] of layoutsHandlers) {
        if (handler.validate(bodyNode)) {
            layouts.push(name);
        }
    }

    return layouts;
}

/**
 * Get list of custom item layouts
 * @param {Node} bodyNode node element of test body. Do not take care about children's body
 * @returns {[]} names of layouts
 */
export function getCustomLayouts(bodyNode) {
    const layouts = getLayouts(bodyNode);

    return layouts.filter(layout => layout !== 'defaultLayout');
}
