// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Checks event has a valid input target
 * @param {Event} e
 * @returns {boolean} Has event a valid target
 */
export const hasValidTarget = e => {
    let target = e.target;

    if (!target) {
        return false;
    }

    if (target.nodeType !== Node.ELEMENT_NODE) {
        target = target.parentNode;
    }

    if (['TEXTAREA', 'INPUT'].includes(target.tagName) || target.hasAttribute('contenteditable') || target.hasAttribute('data-allow-copy')) {
        return true;
    }
    return target.closest('textarea, input, [contenteditable], [data-allow-copy]') ? true : false;
};

/**
 * Get text content of html
 * @param {string} html
 * @returns {string} Text content of html
 */
export const htmlToText = html => {
    const parser = new DOMParser();
    const root = parser.parseFromString(html, 'text/html');
    return root.body.textContent?.trim() || '';
};

/**
 * Returns with copied string content
 * @param {ClipboardEvent} e
 * @returns {string} Copied string
 */
export const getCopiedText = e => {
    const html = e.clipboardData.getData('text/html');

    // html
    if (html) {
        return htmlToText(html);
    }

    return (
        document.getSelection().toString() || // getData('plain/text') does not return with text in every browser
        document.activeElement.value?.substring(
            // because of firefox bug
            document.activeElement.selectionStart,
            document.activeElement.selectionEnd
        )
    );
};

/**
 * Returns with pasted string content
 * @param {ClipboardEvent} e
 * @returns {string} Pasted string
 */
export const getPastedText = e => {
    const html = e.clipboardData.getData('text/html');

    if (html) {
        return htmlToText(html);
    }

    const text = e.clipboardData.getData('text/plain') || '';

    return text.replace(/\r\n/g, '\n'); // convert windows line ending
};
