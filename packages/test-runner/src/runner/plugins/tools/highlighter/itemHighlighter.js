// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { actionKeys, highlightBaseClassName } from './highlighterActionKeys.js';
import { defaults } from 'lodash';
import baseHighlighterFactory from './baseHighlighter.js';
import { commentBaseClassName } from '../inlineComments/selectors.js';

/**
 * Item Highlighter factory
 * @param {Object} options
 * @param {String} options.containerSelector - allows to select the root Node in which highlighting is allowed
 * @param {String[]} options.containersBlackList - additional blacklist selectors to be added to module instance's blacklist
 * @param {String} options.containersWhiteList - whitelist selectors
 * @param {String} options.keepEmptyNodesIgnoreSelector - inlineComments plugin uses `keepEmptyNodes: false` on this selector
 * @param {String} options.id - internal value used as store key for this highlighter's highlights
 * @param {Function} options.onUpdatedCallback - notify caller that highlights were created/removed (subscription to changes)
 * @returns {Object} `baseHighlighterFactory` instance
 */
export default function itemHighlighterFactory({
    containerSelector,
    containersBlackList,
    containersWhiteList,
    keepEmptyNodesIgnoreSelector,
    id,
    onUpdatedCallback = () => {}
} = {}) {
    const defaultOptions = {
        baseClassName: highlightBaseClassName,
        toggledModeClassPerColor: {
            //class to apply to container in `isHighlighting` mode
            [actionKeys.highlightYellow]: 'highlighter-mode-yellow',
            [actionKeys.highlightPink]: 'highlighter-mode-pink',
            [actionKeys.highlightBlue]: 'highlighter-mode-blue',
            [actionKeys.highlightGreen]: 'highlighter-mode-green',
            [actionKeys.highlightOrange]: 'highlighter-mode-orange',
            [actionKeys.eraser]: 'highlighter-mode-eraser'
        },
        defaultColor: actionKeys.highlightYellow,
        eraserColor: actionKeys.eraser,
        containerSelector: '#test-main .qti-item',
        containersBlackList: [
            //sync these selectors with css styles for `::selection`
            '.qti-interaction',
            '.qti-gapMatchInteraction > .qti-flow-container > .answer-area .gap',
            '.qti-hottextInteraction > .qti-flow-container .qti-hottext',
            '.qti-audio-container',
            '.qti-video-container',
            'mjx-container',
            `.${commentBaseClassName}` //don't allow to highlight inside inlineComment - otherwise how to show and edit intersection?
        ],
        containersWhiteList: [
            //sync these selectors with css styles for `::selection`
            '.qti-interaction > .qti-prompt',
            '.qti-gapMatchInteraction > .qti-flow-container > .answer-area',
            '.qti-hottextInteraction > .qti-flow-container'
        ],
        keepEmptyNodes: true,
        keepEmptyNodesIgnoreSelector,
        transientSelector: `.${commentBaseClassName}` //build highlight model independently from inlineComments model
    };

    const options = defaults(
        {
            containerSelector,
            id
        },
        defaultOptions
    );
    // don't override default blacklist, but add to it
    options.containersBlackList = [...defaultOptions.containersBlackList, ...(containersBlackList || [])];

    // override default whitelist if provided
    options.containersWhiteList = containersWhiteList || defaultOptions.containersWhiteList;

    const highlighterInstance = baseHighlighterFactory({ ...options, id, onUpdatedCallback });
    return highlighterInstance;
}
