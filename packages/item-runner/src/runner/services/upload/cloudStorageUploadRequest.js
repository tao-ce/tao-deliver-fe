// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ApiError from 'core/error/ApiError';
import TimeoutError from 'core/error/TimeoutError';
import NetworkError from 'core/error/NetworkError';
import AbortError from 'taoDeliverAppsCommon/core/error/AbortError';

/**
 * Upload file to Google Cloud storage
 * Can also be used with local delivery upload attachments endpoint
 * @param {Object} options
 * @param {String} options.url
 * @param {String} options.method
 * @param {File} options.file
 * @param {Number} options.timeout
 * @param {Object} options.abortController
 * @param {Function} options.onProgress - (progressBytes: Number. totalBytes: Number) => void
 * @returns {Promise<Object|null>} - `Promise<{version: string}>` on success, `Promise.reject(error: Error)` on error or abort
 */
export function cloudStorageUploadRequest({ url, method, file, timeout, abortController = null, onProgress = null }) {
    if (!abortController) {
        abortController = new AbortController();
    }

    if ('isSecureContext' in window && window.isSecureContext === false) {
        throw new Error(`The page is not considered as secure, we won't be able to upload files.`);
    }

    let xhr = null;
    const onAbort = () => {
        if (xhr) {
            xhr.abort();
        }
    };

    return new Promise((resolve, reject) => {
        xhr = new XMLHttpRequest();
        xhr.open(method, url, true);

        xhr.addEventListener('error', () => {
            reject(new NetworkError('Could not make Cloud Storage request', 0));
        });
        xhr.addEventListener('abort', () => {
            reject(new AbortError('Cloud Storage request aborted'));
        });

        if (timeout) {
            xhr.timeout = timeout;
            xhr.addEventListener('timeout', () => {
                reject(new TimeoutError('Cloud Storage timeout', xhr.timeout));
            });
        }
        abortController.signal.addEventListener('abort', onAbort);

        if (xhr.upload && onProgress) {
            xhr.upload.addEventListener('progress', evt => {
                if (evt.lengthComputable) {
                    onProgress(evt.loaded, evt.total);
                }
            });
        }

        xhr.addEventListener('load', () => {
            resolve();
        });

        xhr.send(file);
    })
        .then(() => {
            const status = xhr.status;
            const responseBody = xhr.responseText;

            if (status === 200) {
                let version = null;
                if (xhr.getAllResponseHeaders().indexOf('x-goog-generation') >= 0) {
                    version = xhr.getResponseHeader('x-goog-generation');
                }
                return { version };
            }
            if (status >= 400) {
                const isJson = xhr.getResponseHeader('Content-Type') === 'application/json';
                const parsedError = isJson
                    ? parseJsonError(responseBody, status)
                    : parseCloudStorageError(responseBody);
                if (parsedError) {
                    return Promise.reject(
                        new ApiError(`Cloud Storage ${parsedError.code}: ${parsedError.message}`, status, responseBody)
                    );
                }
            }
            return Promise.reject(new ApiError('Unable to upload the file to Cloud Storage', status, responseBody));
        })
        .finally(() => {
            abortController.signal.removeEventListener('abort', onAbort);
        });
}

/**
 * Parse XML error sent by the Cloud Storage API
 * @param {string} xmlError - an xml string
 * @returns {Object?} with a code and a message
 */
function parseCloudStorageError(xmlError) {
    try {
        const parser = new DOMParser().parseFromString(xmlError, 'application/xml');
        if (parser && parser.documentElement) {
            const codeElement = parser.documentElement.querySelector('Code');
            const messageElement = parser.documentElement.querySelector('Message');

            return {
                code: codeElement && codeElement.textContent,
                message: messageElement && messageElement.textContent
            };
        }
        // eslint-disable-next-line no-unused-vars
    } catch (parsingErr) {
        return null;
    }
    return null;
}

/**
 * Parse json error sent by local upload attachments endpoint
 * @param {string} jsonError
 * @param {string} statusCode
 * @returns {Object?} with a code and a message
 */
function parseJsonError(jsonError, statusCode) {
    try {
        const json = JSON.parse(jsonError);
        if (json && json.error) {
            return {
                code: statusCode,
                message: json.error.message
            };
        }
        // eslint-disable-next-line no-unused-vars
    } catch (parsingErr) {
        return null;
    }
    return null;
}
