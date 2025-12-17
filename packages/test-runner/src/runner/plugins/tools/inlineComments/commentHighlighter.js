// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import baseHighlighterFactory from '../highlighter/baseHighlighter.js';
import { generateElementId, getActualKey } from '@oat-sa-private/ui-core';
import { highlightBaseClassName } from '../highlighter/highlighterActionKeys.js';
import {
    commentBaseClassName,
    getCommentsContainerSelector,
    getCommentElements,
    commentModeClassName
} from './selectors.js';
import { makeHighlightNodesAccessible, applyAdjacentHighlightNodeStyles } from './controls/commentStyles.js';

const baseHighlighterOptions = {
    onUpdatedCallback: () => {},
    baseClassName: commentBaseClassName,
    toggledModeClassPerColor: {},
    defaultColor: null,
    eraserColor: null,
    containersBlackList: ['.qti-extendedTextInteraction .math-entry'],
    containersWhiteList: [],
    /**
     * a) to make it work with highlighter-plugin: "data-split-before"/"data-split-after" may not be correct for adjacent highlights from different highlighters,
     * b) for safety - to not rely on text node structure which is easily lost (unmerged sibling text nodes, empty text nodes).
     */
    keepEmptyNodes: false,
    /**
     * To make comments model independent from highlighter-plugin highlights.
     * Highlights may not be there when comments are restored! Grader's higlhights aren't visible to test-taker.
     */
    transientSelector: `.${highlightBaseClassName}`
};

/**
 * Color serves as comment id. Create unique color to use for new highlight
 * @returns {String}
 */
function generateUniqueColorKey() {
    return generateElementId('');
}

/**
 * Comment highlighter factory - helper to work with highlight elements
 * @param {Object} options
 * @param {String} options.responseId
 * @param {Function} options.onClickCallback
 * @returns {Object} `baseHighlighterFactory` instance extended with new methods
 */
export function commentHighlighterFactory({ responseId, onClickCallback } = {}) {
    let highlighterInstance;

    /**
     *  a) If we are deleting highlight, don't remove it from DOM until save request succeeds
     *  b) If highlighter-plugin is also used, ensure it's highlights won't influence comments model
     *     This is achieved by setting `transientSelector` option.
     * @param {Object} args
     * @param {String?} args.excludeColorKey
     * @returns {Object} highlights model
     */
    function getCommentsOnlyDataModel({ excludeColorKey } = {}) {
        highlighterInstance.rebuildDataModel();
        let model = highlighterInstance.getDataModel();

        if (excludeColorKey) {
            model = model.filter(hl => hl.c !== excludeColorKey);
        }

        return model;
    }

    /**
     * Highlight element listener:
     * treat Enter and Space keypresses as clicks
     * @param {KeyboardEvent} e
     */
    function onKeydown(e) {
        const key = getActualKey(e);
        if (key === 'enter' || key === 'space') {
            onClickCallback(e);
            if (key === 'space') {
                e.preventDefault(); // don't scroll page
            }
        }
    }

    /**
     * Highlight element listener:
     * Manage hover styles on multiple grouped highlight nodes, which couldn't be done with CSS :hover
     * @param {MouseEvent} e
     */
    const mouseoverHandler = e => {
        if (!e.target.classList.contains('hover')) {
            const hoveredColorKey = highlighterInstance.getColorKeyForHighlight(e.target);
            const matchingHighlightNodes = getCommentElements(responseId, hoveredColorKey);
            matchingHighlightNodes.forEach(n => n.classList.add('hover'));
        }
    };
    /**
     * Highlight element listener:
     * Manage hover styles on multiple grouped highlight nodes, which couldn't be done with CSS :hover
     * @param {MouseEvent} e
     */
    const mouseoutHandler = e => {
        if (e.target.classList.contains('hover')) {
            const hoveredColorKey = highlighterInstance.getColorKeyForHighlight(e.target);
            const matchingHighlightNodes = getCommentElements(responseId, hoveredColorKey);
            matchingHighlightNodes.forEach(n => n.classList.remove('hover'));
        }
    };

    /**
     * Will be called when highlight elements are modified (created/updated/deleted)
     */
    function onUpdatedCallback() {
        const elements = getCommentElements(responseId);
        elements.forEach(el => {
            [
                ['click', onClickCallback],
                ['keydown', onKeydown],
                ['mouseover', mouseoverHandler],
                ['mouseout', mouseoutHandler]
            ].forEach(([eventName, handler]) => {
                el.removeEventListener(eventName, handler);
                el.addEventListener(eventName, handler);
            });
        });
        makeHighlightNodesAccessible(elements, highlighterInstance.getColorKeyForHighlight); // needs to run whenever a highlight is added
        applyAdjacentHighlightNodeStyles(elements); // needs to run whenever a highlight is added or deleted
    }

    const options = {
        ...baseHighlighterOptions,
        containerSelector: getCommentsContainerSelector(responseId),
        id: `comment-highlighter-${responseId}`,
        onUpdatedCallback
    };
    highlighterInstance = baseHighlighterFactory(options);

    /**
     * On container, set style which indicates that comment-highlighter is active
     * @param {Boolean} enable
     */
    function toggleHighlightModeStyle(enable) {
        const container = document.querySelector(options.containerSelector);
        if (enable) {
            container?.classList.add(commentModeClassName);
        } else {
            container?.classList.remove(commentModeClassName);
        }
    }

    Object.assign(highlighterInstance, {
        generateUniqueColorKey,
        getCommentsOnlyDataModel,
        toggleHighlightModeStyle
    });
    return highlighterInstance;
}
