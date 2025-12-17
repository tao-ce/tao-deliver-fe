// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ApiError from 'core/error/ApiError';
import NetworkError from 'core/error/NetworkError';
import TimeoutError from 'core/error/TimeoutError';
import digest from 'core/digest';
import { cloudStorageUploadRequest } from './cloudStorageUploadRequest.js';

/**
 * Contains all ongoing uploads, by interaction.
 * If a test taker changes, we cancel the current upload and start the new one.
 */
const uploads = new Map();

/**
 * The upload service factory for Google Cloud Storage. The file is uploaded directly to a bucket from a signed URL.
 *
 * @param {string} interactionId - to identify an interaction
 * @param {Object} uploadServiceParameters - configuration for this upload from the server
 * @param {string} uploadServiceParameters.method - the HTTP method
 * @param {string} uploadServiceParameters.url - the signed URL for the upload
 * @param {Object} [uploadServiceParameters.linkParameters] - parameters to pass to the response, for linking
 * @param {Object} [config] - upload configuration from the interaction
 * @param {number} [config.timeout] - timeout for the upload requests
 * @returns {Object} the service
 */
export default function cloudStorageUploadServiceFactory(
    interactionId,
    { method, url, linkParameters } = {},
    { timeout } = {}
) {
    method = method || 'PUT';

    if (!url) {
        throw new TypeError('The signed URL is missing from uploadServiceParameters.');
    }

    //ensure we can access to window.subtle, Safari seems to not care...
    if ('isSecureContext' in window && window.isSecureContext === false) {
        throw new Error(`The page is not considered as secure, we won't be able to upload files.`);
    }

    return {
        name: 'cloud-storage',

        /**
         * Send the file to Cloud Storage
         * @param {Object} fileData
         * @param {File} fileData.data
         * @param {Object} [options]
         * @param {AbortController} [options.controller]
         * @param {function} [options.onProgress] - (bytesLoaded, bytesTotal) => void
         * @returns {Promise<Object>} resolves with the response value data
         */
        upload({ data: file }, options) {
            if (file instanceof File) {
                const controller = options?.controller || new AbortController();

                const uploadPromise = Promise.all([this.cancel(), digest(file, 'SHA-256')])
                    .then(results => {
                        const hash = results[1];

                        uploads.set(interactionId, {
                            controller,
                            uploadPromise
                        });

                        return cloudStorageUploadRequest({
                            url,
                            method,
                            file,
                            timeout,
                            abortController: controller,
                            onProgress: options?.onProgress
                        }).then(result => {
                            uploads.delete(interactionId);

                            if (result === null) {
                                return Promise.reject();
                            }
                            return Object.assign(
                                {
                                    data: hash,
                                    mime: file.type,
                                    name: file.name,
                                    localFile: file,
                                    version: result.version
                                },
                                linkParameters
                            );
                        });
                    })
                    .catch(err => {
                        uploads.delete(interactionId);

                        if (err instanceof ApiError) {
                            return Promise.reject(err);
                        }

                        if (err instanceof DOMException) {
                            //timeout
                            if (err.name === 'TimeoutError') {
                                return Promise.reject(new TimeoutError(err.message, timeout));
                            }

                            //connectivity or cors
                            if (err.name === 'NetworkError') {
                                return Promise.reject(new NetworkError(err.message, 0));
                            }
                        }

                        // AbortError, or unknown err
                        return Promise.reject(err);
                    });
                return uploadPromise;
            }
            return Promise.resolve(null);
        },

        /**
         * Cancel the current upload
         * @param {string} [reason] - optional reason for the cancellation
         * @returns {Promise<boolean>} true if an ongoing upload has been canceled
         */
        cancel(reason) {
            if (uploads.has(interactionId)) {
                const previousUpload = uploads.get(interactionId);
                if (previousUpload.controller instanceof AbortController) {
                    previousUpload.controller.abort(reason);
                    return previousUpload.uploadPromise.then(
                        () => true, // if resolved
                        () => true // if rejected
                    );
                }
            }
            return Promise.resolve(false);
        },

        /**
         * Get the response base type
         * @returns {string}  the base type
         */
        getBaseType() {
            return 'fileHash';
        }
    };
}

/**
 * Cancel all ongoing uploads (even uploads running in parallel, from different factory instances)
 */
export function cancelAllUploads() {
    uploads.forEach(upload => {
        if (upload.controller instanceof AbortController) {
            upload.controller.abort('cancelAllUploads');
        }
    });
}
