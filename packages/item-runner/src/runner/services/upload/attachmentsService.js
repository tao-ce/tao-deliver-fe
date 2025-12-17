// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import getUploadService from './uploadService.js';

export const uploadServiceStatuses = {
    initial: 'initial',
    loading: 'loading',
    ready: 'ready',
    uploading: 'uploading',
    userCancelled: 'userCancelled'
};

export const defaultGetAttachmentsUploadData = () => Promise.resolve({ uploadServiceType: 'sandbox' });

/**
 * Creates an item attachments service: an API which operates by:
 * 1. Making a request to the backend to ask where potential files should be uploaded
 * 2. Providing the initialised upload service which can be used to upload files
 * @param {Object} options
 * @param {Function} options.getAttachmentsUploadData
 * @param {String} options.itemIdentifier
 * @param {String} options.responseIdentifier
 * @param {Number} [options.timeout=30000] in milliseconds
 * @returns {*}
 */
export function attachmentsServiceFactory({
    getAttachmentsUploadData = defaultGetAttachmentsUploadData,
    itemIdentifier,
    responseIdentifier,
    timeout = 60 * 1000
} = {}) {
    // prepare the attachmentsService to be used later
    const attachmentsService = {
        // Make the initial request to get the uploadServiceParameters
        getAttachmentsUploadData,

        // Used to cancel the initial request
        abortController: new AbortController(),

        // Result, set by initializeUploadService
        uploadService: null,

        /**
         * Make the backend request to get the uploadServiceParameters (e.g. signed URL) for this interaction,
         * then select and assign the interaction's uploadService.
         * @returns {Promise} - resolves when the service is ready
         */
        initializeUploadService: () =>
            attachmentsService
                .getAttachmentsUploadData(itemIdentifier, responseIdentifier, {
                    signal: attachmentsService.abortController.signal,
                    searchParams: {
                        replace: true
                    }
                })
                .then(uploadData => {
                    const uploadServiceParameters = {
                        method: uploadData.uploadMethod,
                        url: uploadData.uploadUrl,
                        id: uploadData.uploadServiceType === 'sandbox' ? 'base64' : 'cloud-storage',
                        linkParameters: {
                            id: uploadData.id,
                            downloadUrl: uploadData.downloadUrl
                        }
                    };
                    attachmentsService.uploadService = getUploadService(
                        itemIdentifier,
                        responseIdentifier,
                        uploadServiceParameters,
                        {
                            timeout
                        }
                    );
                })
                .catch(err => {
                    // Ensure storeResponse will call initializeUploadService again next time
                    attachmentsService.uploadService = null;

                    // Re-throw for main storeResponse flow
                    throw err;
                })
    };
    return attachmentsService;
}
