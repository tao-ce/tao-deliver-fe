// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
/**
 * Mapper for the Table static element
 *
 * We use a blockTree, so we need to wrap the content into a `<table>` element. The DomParser of the blockTreeBuilder
 * consider the HTML as invalid if sub-table elements (caption, tbody, etc.) aren't inside a `<table>`.
 * (Need to use blockTree because table can contain other elements (images, interactions, etc.) and links (they will have `target` attribute appended))
 *
 */
export default {
    /**
     * Map the table element, wrap the body into a table
     * @param {Object} element - the table element
     * @returns {object} the mapped element
     */
    mapElement(element) {
        if (element && element.body && element.body.body) {
            const htmlBody = `<table>${element.body.body}</table>`;
            const elemBody = Object.assign({}, element.body, { body: htmlBody });
            const mappedElement = Object.assign({}, element, { body: elemBody });
            return mappedElement;
        }
        return element;
    },

    /**
     * If the element body has been wrapped, we need to only unwrap the blockTree
     * @param {Object} properties - Math block properties
     * @returns {Object} mapped properties
     */
    mapProperties(properties) {
        if (
            properties.blockTree &&
            properties.blockTree.length === 1 &&
            properties.blockTree[0].content === 'table' &&
            properties.blockTree[0].children.length
        ) {
            properties.blockTree = properties.blockTree[0].children;
        }
        return properties;
    }
};
