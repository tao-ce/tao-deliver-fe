// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Helps you build URLs based on the API patterns
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 */
export default {
    /**
     * Let's you create the endpoint URL by concat
     * ${rootUrl}/${path}/${path}...
     *
     * @param {String} rootUrl - configuration endpoint rootUrl
     * @param {...String} paths - path chunks
     * @returns {String} the URL
     */
    urlFromPaths(rootUrl = '', ...paths) {
        return [rootUrl, ...paths].reduce((acc, chunk) => {
            //prevent double slashes in the concat while keeping it inside a chunk (ie. http://)
            if (acc.length && chunk.length) {
                return `${acc.replace(/\/$/, '')}/${chunk.replace(/^\//, '')}`;
            }
            acc += chunk;
            return acc;
        }, '');
    },

    /**
     * Let's you create the endpoint URL based on the following pattern:
     * ${rootUrl}/${path}
     *
     * @param {Object} [options]
     * @param {String} [options.rootUrl] - configuration endpoint rootUrl
     * @param {String} [options.path] - configuration endpoint query path
     * @returns {String} the URL
     */
    urlFromConfig({ rootUrl = '', path = '/api/v1' } = {}) {
        return this.urlFromPaths(rootUrl, path);
    },

    /**
     * Let's you create the endpoint URL based on the following pattern:
     * ${rootUrl}/${path}/${id}/${resource}
     *
     * @param {String} id - the identifier in the path
     * @param {Object} [options]
     * @param {String} [options.rootUrl] - configuration endpoint rootUrl
     * @param {String} [options.path] - configuration endpoint query path
     * @param {String} [options.resource] - configuration endpoint resource name
     * @returns {String} the URL
     */
    urlFromResourceConfig(id = '', { rootUrl = '', path = '/api/v1', resource = '' } = {}) {
        return this.urlFromPaths(rootUrl, path, id, resource);
    }
};
