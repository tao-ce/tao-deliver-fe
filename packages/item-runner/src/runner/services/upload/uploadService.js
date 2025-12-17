// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import services from './services.js';

/**
 * Get an upload service implementation for a given interaction
 * @param {string} itemIdentifier - the item identifier
 * @param {string} responseIdentifier - the response id to identify the interactin
 * @param {Object} serviceParameters
 * @param {string} serviceParameters.id - the identifier of the upload service
 * @param {Object} [config] - shared upload configuration
 * @returns {Object} an upload service instance
 */
export default function getUploadService(itemIdentifier, responseIdentifier, serviceParameters = {}, config = {}) {
    const { id: serviceId } = serviceParameters;

    if (serviceId && services[serviceId]) {
        const { default: uploadServiceFactory } = services[serviceId];
        const key = `${itemIdentifier}_${responseIdentifier}`;
        //instantiate the factory
        return uploadServiceFactory(key, serviceParameters, config);
    }
    throw new TypeError(`no upload service found with id '${serviceId}'`);
}

/**
 * Cancel all ongoing uploads from all services
 */
export function cancelAllServicesUploads() {
    Object.values(services).forEach(uploadService => {
        uploadService.cancelAllUploads?.();
    });
}
