// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * @typedef {Object} Count - holds word and character counts
 * @property {number} words
 * @property {number} chars
 */

/**
 * Get word counts from rich text editor
 * @param {string} text target text to count words length
 * @returns {Count}
 */
export function getRichEditorCount(text) {
    if (typeof text !== 'string') {
        return {
            words: 0,
            chars: 0
        };
    }
    const wordsMatchRegExp = new RegExp('([\\p{L}\\p{N}]+\\S?)+', 'gu');
    const detectedWords = text.match(wordsMatchRegExp) || [];
    const detectedChars = text.replace(/\n/g, '') || '';

    return {
        words: detectedWords.length,
        chars: detectedChars.length
    };
}

/**
 * Get word counts from simple text area
 * @param {string} text target text to count words length
 * @returns {Count}
 */
export function getPlainEditorCount(text) {
    if (typeof text !== 'string') {
        return {
            words: 0,
            chars: 0
        };
    }
    const wordMatches = text.match(/[^\s.,:;?!&#%/*+=]+/g) || [];

    return {
        words: wordMatches.length,
        chars: text.length
    };
}
