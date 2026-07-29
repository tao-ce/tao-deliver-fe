// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Methods to help with rows and textarea height calculation
 */

import { extractFromClasses } from './attributes.js';

const possibleQtiHeightLinesValues = [3, 6, 15];
const charactersPerLine = 72;
const defaultLines = 8;

/**
 * Calculates rows number for textarea based on classes and constraints
 * @param {object?} options
 * @param {number?} [options.expectedLength] expected (recommended) response length
 * @param {number?} [options.expectedLines] expected (recommended) response lines
 * @param {number?} [options.maxlength] - constraint via patternmask for chars
 * @param {number?} [options.maxWordsLimit] - constraint via patternmask for words
 * @param {string?} [options.classes] qti classes
 * @returns {number|null} rows number or null
 */
export function getRowsValue({ expectedLength, expectedLines, maxlength, maxWordsLimit, classes = '' } = {}) {
    const extractedFromClasses = extractFromClasses(classes, 'qti-height-lines-', val => {
        val = parseInt(val, 10);
        return val;
    });

    if (possibleQtiHeightLinesValues.includes(extractedFromClasses)) {
        return extractedFromClasses;
    } else if (expectedLength) {
        return Math.ceil(expectedLength / charactersPerLine);
    } else if (expectedLines) {
        return expectedLines;
    } else if (maxWordsLimit) {
        return defaultLines;
    } else if (maxlength) {
        return Math.ceil(maxlength / charactersPerLine);
    }
    return null;
}

const rowSelector = '.colrow, .grid-row';

/**
 * Checks if item has prompt, leading or trailing content and
 * returns additional spacing value
 * @param {DOMElement} rootRef root element for text container
 * @param {boolean} hasPrompt interaction has prompt
 * @param {boolean} isVerticalWritingMode
 * @returns {String}
 */
export function getAdditionalSpacing(rootRef, hasPrompt, isVerticalWritingMode) {
    let addSpacing = false;
    if (hasPrompt) {
        addSpacing = true;
    } else {
        const closestParentRow = rootRef.closest(rowSelector);
        addSpacing = closestParentRow && closestParentRow.parentNode && closestParentRow.parentNode.children.length > 1;
    }

    if (isVerticalWritingMode) {
        return addSpacing ? '13rem' : '3rem';
    } else {
        return addSpacing ? '10rem' : '0px';
    }
}
