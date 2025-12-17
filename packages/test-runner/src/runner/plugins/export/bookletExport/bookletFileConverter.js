// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import * as htmlToDocx from 'html-docx-js-typescript';

/**
 * Helper to convert html to booklet file format (*.docx), and to download it
 * @returns {Object}
 */
export function bookletFileConverterFactory() {
    /**
     * Download blob
     * Will set download href on `anchorElement` if it is passed
     * @param {Blob} fileBlob
     * @param {String} filename
     * @param {Node?} anchorElement
     */
    function downloadBlobWithAnchor(fileBlob, filename, anchorElement = null) {
        const blobUrl = URL.createObjectURL(fileBlob);
        if (!anchorElement) {
            anchorElement = document.createElement('a');
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 40 * 1000);
        }
        anchorElement.download = filename;
        anchorElement.href = blobUrl;
        anchorElement.click();
    }

    /**
     * Get simple filename-safe string (supports only latin characters and numbers)
     * @param {String} str
     * @returns {String}
     */
    function toSafeFilenamePart(str) {
        return str
            .replace(/([^\w]|-)+/g, '-')
            .replace(/(^-+|-+$)/g, '')
            .substring(0, 50);
    }

    const api = {
        /**
         * Get filename without extension, suitable for this test
         * @param {Object} testContext
         * @param {Object} testMap
         * @param {Number} startPosition
         * @param {Number} endPosition
         * @returns {String}
         */
        getFilenameForTest(testContext, testMap, startPosition, endPosition) {
            const testId = toSafeFilenamePart(testMap.id || '') || 'booklet';
            const testLabel = toSafeFilenamePart(testMap.label || testMap.title || '');
            const locale = testContext.locale || '';
            const start = (startPosition || 0) + 1;
            const end = (endPosition || 0) + 1;
            return `${testId}_${testLabel}_${locale}_${start}-${end}`;
        },
        /**
         * Convert html string to *.docx blob
         * @param {String} htmlContent
         * @returns {Blob}
         */
        async convert(htmlContent) {
            const fileBlob = await htmlToDocx.asBlob(htmlContent);
            return fileBlob;
        },
        /**
         * Download *.docx file
         * Will set download href on `anchorElement` if it is passed
         * @param {Blob} fileBlob
         * @param {String} filename
         * @param {Node?} anchorElement
         */
        downloadBooklet(fileBlob, filename, anchorElement = null) {
            downloadBlobWithAnchor(fileBlob, `${filename}.docx`, anchorElement);
        },
        /**
         * Download *.html file
         * Will set download href on `anchorElement` if it is passed
         * @param {String} htmlContent
         * @param {String} filename
         * @param {Node?} anchorElement
         */
        downloadHtml(htmlContent, filename, anchorElement = null) {
            const fileBlob = new Blob([htmlContent], { type: 'text/plain;charset=utf-8' });
            downloadBlobWithAnchor(fileBlob, `${filename}.html`, anchorElement);
        }
    };
    return api;
}
