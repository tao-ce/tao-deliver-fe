// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

//keep a map of all ongoing readers, to abort them if necessary
const readers = new Map();

/**
 * The upload service factory for base 64.
 * The file data is encoded in BASE 64 inside the response.
 * @param {string} interactionId - to identify an interaction
 * @returns {Object} the service
 */
export default function base64UploadServiceFactory(interactionId) {
    return {
        name: 'base64',

        /**
         * Converts the file data to base 64
         * @param {Object} fileData
         * @param {File} fileData.data
         * @returns {Promise<Object>} resolves with the response value data
         */
        upload({ data: file }) {
            if (file instanceof File) {
                return new Promise((resolve, reject) => {
                    this.cancel();

                    const reader = new FileReader();
                    readers.set(interactionId, reader);
                    reader.addEventListener('load', () => {
                        // some browser returns only with `data:`, when the file is empty
                        resolve({
                            data: reader.result.replace(/^data:(.*?base64,)?/, ''),
                            mime: file.type,
                            name: file.name
                        });
                    });

                    reader.addEventListener('abort', () => {
                        resolve(null);
                    });
                    reader.addEventListener('error', error => {
                        reject(error);
                    });
                    reader.readAsDataURL(file);
                }).finally(() => readers.delete(interactionId));
            }
            return Promise.resolve(null);
        },

        /**
         * Cancel the current conversion
         * @returns {boolean} true if an ongoing upload has been canceled
         */
        cancel() {
            if (readers.has(interactionId)) {
                const previousReader = readers.get(interactionId);
                if (previousReader instanceof FileReader && previousReader.readyState === 1) {
                    //reader state is LOADING
                    previousReader.abort();
                    return Promise.resolve(true);
                }
            }
            return Promise.resolve(false);
        },

        /**
         * Get the response base type
         * @returns {string}  the base type
         */
        getBaseType() {
            return 'file';
        }
    };
}

/**
 * Cancel all ongoing uploads (even uploads running in parallel, from different factory instances)
 */
export function cancelAllUploads() {
    readers.forEach(reader => {
        if (reader.readyState < 2) {
            // 0: EMPTY, 1: LOADING, 2: DONE
            reader.abort?.();
        }
    });
}
