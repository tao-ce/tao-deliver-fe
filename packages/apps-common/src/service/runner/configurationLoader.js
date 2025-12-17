// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import request from 'core/fetchRequest';
import urlBuilder from '../../core/urlBuilder.js';
import ApiError from 'core/error/ApiError';

/**
 * Loads and build the test runner configuration for this delivery execution
 *
 * @author Bertrand Chevrier <bertrand@taotesting.com>
 *
 * @example
 * configurationLoader('123-456-789', {
 *    providers : { ... }
 * }, {
 *    rootUrl : 'https://127.0.0.1:1234'
 * })
 * .then( configuration => {
 *      //do something with the config
 * })
 * .catch( console.error );
 *
 * @param {string} deliveryExecutionId - the current execution id
 * @param {Object} [defaultConfiguration] - the default configuration to add to the loaded configuration
 * @param {Object} [defaultConfiguration.runnerConfiguration] - the default test runner configuration to merge with the response
 * @param {Object} [options]
 * @param {string} [options.rootUrl] - configuration endpoint rootUrl
 * @param {string} [options.path] - configuration endpoint query path
 * @param {string} [options.resource] - configuration endpoint resource name
 * @param {string} [options.method] - configuration endpoint HTTP method
 * @param {string} [options.jwtTokenHandler] - the token handler
 * @returns {Promise<Object>} resolves with the configuration
 */
export default function configurationLoader(deliveryExecutionId = '', defaultConfiguration = {}, options = {}) {
    if (!deliveryExecutionId || !deliveryExecutionId.length) {
        return Promise.reject(new TypeError('We are unable to load the configuration without a deliveryExecutionId'));
    }

    const rejectConfigValue = (paramName, paramValue) =>
        Promise.reject(new TypeError(`The following configuration is not valid: ${paramName} : ${paramValue}`));

    if (options.rootUrl !== '') {
        try {
            new URL(options.rootUrl);
        } catch (err) {
            return rejectConfigValue('options.rootUrl', options.rootUrl);
        }
    }

    if (typeof options.path !== 'string' || !/^[\w/-]+$/.test(options.path)) {
        return rejectConfigValue('options.path', options.path);
    }

    if (typeof options.resource !== 'string' || !/^[\w-]+$/.test(options.resource)) {
        return rejectConfigValue('options.resource', options.resource);
    }

    if (!['GET', 'POST'].includes(options.method)) {
        return rejectConfigValue('options.method', options.method);
    }

    const { method, jwtTokenHandler } = options;
    const url = urlBuilder.urlFromResourceConfig(deliveryExecutionId, options);
    const requestOptions = {
        method,
        jwtTokenHandler
    };
    if (
        defaultConfiguration.runnerConfiguration &&
        typeof defaultConfiguration.runnerConfiguration.requestTimeout === 'number'
    ) {
        requestOptions.timeout = defaultConfiguration.runnerConfiguration.requestTimeout;
    }

    return request(url, requestOptions).then(response => {
        if (!response.data) {
            throw new ApiError('Configuration loader: response.data is not a json object', null, response, true);
        }

        return Object.assign(
            {
                jwtTokenHandler,
                serviceCallId: deliveryExecutionId,
                serviceUrl: urlBuilder.urlFromResourceConfig(
                    deliveryExecutionId,
                    defaultConfiguration.endpoints.actions
                ),
                initItemsUrl: urlBuilder.urlFromResourceConfig(
                    response.data.deliveryId,
                    defaultConfiguration.endpoints.initItems
                ),
                attachmentsUploadDataUrl: urlBuilder.urlFromResourceConfig(
                    deliveryExecutionId,
                    defaultConfiguration.endpoints.attachmentsUploadData
                ),
                saveScoringInlineCommentsUrl: urlBuilder.urlFromResourceConfig(
                    deliveryExecutionId,
                    defaultConfiguration.endpoints.saveScoringInlineComments
                )
            },
            defaultConfiguration.runnerConfiguration,
            response.data
        );
    });
}
