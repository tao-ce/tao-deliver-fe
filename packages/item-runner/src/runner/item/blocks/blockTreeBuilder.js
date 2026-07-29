// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import blockTypes from './blockTypes.js';
import { filterBlockByLayout, getLayouts, getElementName } from '../layouts/parseLayout.js';
import { hasPlaceholder, extractPlaceholderContent } from './util/placeholder.js';

/**
 * Checks is block tree consists only of text nodes
 * @param {Object[]} blockTree
 * @returns {Boolean}
 */
export function isPlainText(blockTree) {
    return !blockTree || !blockTree.length || blockTree.every(block => block.type === 'text');
}

/**
 * Internal utility to retrieve all node attributes as a key value object
 *
 * @param {Node} node - a DOM Node
 * @returns {Object} the attributes as key/value
 */
function getNodeAttributes(node) {
    return [...node.attributes].reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
    }, {});
}

/**
 * Creates a block
 * @param {String} type - from the blockTypes
 * @param {String} content - node content
 * @param {Object[]} [children] - node's children
 * @param {Object} [props] - properties of the block
 * @returns {Object} a block
 */
function createBlock(type, content = '', children = [], props = {}) {
    if (type === blockTypes.html || type === blockTypes.text) {
        return {
            type,
            content
        };
    }
    return {
        type,
        content,
        children,
        props
    };
}

/**
 * Text content to blocks. If the text contains a placeholder,
 * we create an element block from the placeholder.
 *
 * @example textToBlocks('Before content {{foo_1}} after content');
 * returns 3 blocks : [TextBlock, ElementBlock, TextBlock]
 *
 * @param {String} text - the text content
 * @returns {Object[]} an array of blocks
 */
function textToBlocks(text) {
    return extractPlaceholderContent(text).map(chunk => {
        if (hasPlaceholder(chunk)) {
            return createBlock(blockTypes.element, chunk.replace(/[{}]/g, ''));
        }
        return createBlock(blockTypes.text, chunk);
    });
}

/**
 * Search node and its children for `<a>` elements and set `target="_blank"` on each,
 * to force links to open in the new tab
 * @param {Node} node - the DOM node
 */
function addTargetBlankToLinks(node) {
    let linkNodes = node.querySelectorAll('a');
    if (node.nodeName === 'A') {
        linkNodes = Array.from(linkNodes).concat(node);
    }
    linkNodes.forEach(linkNode => {
        const href = linkNode.getAttribute('href');
        if (href && !href.trim().startsWith('#')) {
            linkNode.setAttribute('target', '_blank');
            linkNode.setAttribute('rel', 'noopener noreferer');
        }
    });
}

/**
 * Converts a DOMNode to a BlockTree (the node and it's children)
 * @param {Node} node - the DOM node
 * @param {Array} layouts - names of layouts applied to item. ["default"] is a minimal list
 * @returns {Object} the block with its children if any
 */
function nodeToBlock(node, layouts = []) {
    for (let i = 0; i < layouts.length; i++) {
        const layout = layouts[i];
        if (filterBlockByLayout(layout, node)) {
            const nodeName = getElementName(layout, node);

            return createBlock(blockTypes.container, nodeName, nodesToBlocks(node, layouts), {
                attributes: getNodeAttributes(node)
            });
        }
    }

    addTargetBlankToLinks(node);
    return createBlock(blockTypes.html, node.outerHTML);
}

/**
 * Converts all children (including text nodes) of a node to blocks
 * @param {Node} node - the DOM node
 * @param {Array} layouts - names of custom layouts applied to item
 * @returns {Object[]} the blocks with its children if any
 */
function nodesToBlocks(node, layouts = []) {
    return [...node.childNodes].reduce((blocks, childNode) => {
        if (childNode.nodeType === Node.TEXT_NODE) {
            blocks = blocks.concat(textToBlocks(childNode.textContent));
        } else if (childNode.nodeType === Node.ELEMENT_NODE) {
            blocks.push(nodeToBlock(childNode, layouts));
        }

        return blocks;
    }, []);
}

/**
 * Transform QTI HTML5 namespaced elements to standard HTML elements.
 * QTI uses qh5: prefix for HTML5 elements (like ruby annotations) that aren't part of XHTML.
 * @param {string} html - the HTML string to transform
 * @returns {string} the transformed HTML string
 */
function transformNamespacedElements(html) {
    return html.includes('qh5:')
        ? html.replace(/<(\/?)qh5:([a-z]+)/gi, '<$1$2')
        : html;
}

/**
 * Convert html presented as string to DOM nodes
 * @param {string} htmlString
 * @returns {*}
 */
export function convertToDOM(htmlString = '') {
    const transformedHtml = transformNamespacedElements(htmlString);
    //use a DOM parser to walk through the html string
    const domParser = new DOMParser();
    return domParser.parseFromString(transformedHtml, 'text/html');
}

/**
 * The treeBlockBuilder parse and walk through an item body to convert it
 * to a tree of objects (the blocks). This tree will be used to render the
 * body based on the block type :
 *  - html or text for static content,
 *  - container for node's containers (to be rendered as components)
 *  - element for interaction or special elements (to be rendered as components)
 *
 * Elements are identified by {{placeholder}} within the HTML string.
 *
 * @param {String} itemBody - the HTML as a string that represents the body
 * @returns {Object[]} the tree of blocks
 */
export default function treeBlockBuilder(itemBody) {
    const doc = convertToDOM(itemBody);
    const layouts = getLayouts(doc.body);

    return nodesToBlocks(doc.body, layouts);
}
