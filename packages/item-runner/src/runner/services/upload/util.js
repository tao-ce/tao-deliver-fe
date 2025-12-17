// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Get the file from the response value data.
 *
 * @param {Object|Promise<Object>} fileData
 * @param {string} fileData.data
 * @param {string} fileData.mime
 * @param {string} fileData.name
 * @param {string} [fileData.link] - in the case of cloud storage
 * @param {File} [fileData.localFile] - in the case where only the local state is available
 * @returns {Promise<File>}
 */
export function getFile(fileData) {
    const resolved = fileData instanceof Promise ? fileData : Promise.resolve(fileData);
    return resolved.then(results => {
        if (results) {
            const { link, localFile, data, name, mime: type } = results;
            if (data instanceof File) {
                return data;
            } else if (localFile instanceof File) {
                return localFile;
            } else if (link) {
                return new File([], name, {
                    type
                });
            } else if (typeof data === 'string') {
                // this case should be only reached if we stored the file as base64? *I guess*
                const buffer = base64ToBuffer(data);
                return new File([buffer], name, { type });
            }
        }
        return null;
    });
}

/**
 * Convert base64 string to ArrayBuffer.
 * Result can then be written to a File for storage.
 * @param {string} data
 * @returns {ArrayBuffer}
 */
export function base64ToBuffer(data) {
    const binary = window.atob(data);
    const length = binary.length;
    const buffer = new ArrayBuffer(length);
    const array = new Uint8Array(buffer);
    for (let i = 0; i < length; i++) {
        array[i] = binary.charCodeAt(i);
    }
    return buffer;
}

/**
 * Convert ArrayBuffer to base64 string.
 * To use it after fetching a file, use `response.arrayBuffer()` to create the input.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function bufferToBase64(buffer) {
    let binary = '';
    const array = new Uint8Array(buffer);
    const len = array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(array[i]);
    }
    return window.btoa(binary);
}

/**
 * Get the file link from the response value data.
 *
 * @param {Object|Promise<Object>} fileData
 * @param {string} fileData.link
 * @returns {Promise<string>}
 */
export function getLink(fileData) {
    const resolved = fileData instanceof Promise ? fileData : Promise.resolve(fileData);
    return resolved.then(results => {
        if (results && results.link) {
            return results.link;
        }
        return null;
    });
}
