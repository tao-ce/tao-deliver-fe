// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Methods to help with ARIA support in interactions
 */

/**
 * Gets readable text content from content (e.g. in preparation for it to be announced)
 * Also strips placeholders and HTML tags from content
 * @see https://stackoverflow.com/a/47140708
 * @param {String} content
 * @returns {String} cleaned text content
 */
export function getReadableContent(content = '') {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    return (doc.body.textContent || '').replace(/\{\{.*?\}\}/g, '').trim();
}

/**
 * To allow to announce same text multiple times, insert empty character before text
 * @param {HTMLElement} ariaLiveElement
 * @param {String} text - new announcement text for this element
 * @returns {String} adjusted text
 */
export function textWithChangeToggle(ariaLiveElement, text) {
    if (ariaLiveElement && !ariaLiveElement.textContent.startsWith('\u00A0')) {
        return `${'\u00A0'}${text}`;
    }
    return text;
}
