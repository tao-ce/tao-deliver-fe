// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import request from 'core/fetchRequest';
import urlBuilder from '../../core/urlBuilder.js';

/**
 *
 * @param {Object} params
 * @param {string} params.reason - string key
 * @param {object} [params.details] -
 * @param {string} params.deliveryExecutionId
 * @param {Object} params.jwtTokenHandler
 * @param {Object} params.config - controller config, containing `endpoints` info
 * @returns {Promise<Object>}
 */
export async function securityLog({ reason, details, deliveryExecutionId, jwtTokenHandler, config }) {
    const actionName = 'security-log';
    const actionParams = {
        action: 'flag',
        reason,
        details
    };
    return actionsRequest(actionName, actionParams, { jwtTokenHandler, deliveryExecutionId, config });
}

/**
 * Send 'actions' request
 * @param {string} actionName
 * @param {object} [actionParams]
 * @param {Object} args
 * @param {string} args.deliveryExecutionId
 * @param {Object} args.jwtTokenHandler
 * @param {Object} args.config - controller config, containing `endpoints` info
 * @returns {Promise<Object>}
 */
function actionsRequest(actionName, actionParams, { jwtTokenHandler, deliveryExecutionId, config }) {
    const endpoint = config.endpoints.actions;
    const url = urlBuilder.urlFromResourceConfig(encodeURIComponent(deliveryExecutionId), endpoint);
    const requestOptions = {
        jwtTokenHandler,
        method: endpoint.method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(prepareActionBodyObj(actionName, actionParams))
    };
    const timeout = config?.runnerConfiguration?.requestTimeout;
    if (timeout) {
        requestOptions.timeout = timeout;
    }
    return request(url, requestOptions);
}

/**
 * Prepare body for the 'actions' request
 * @param {string} actionName
 * @param {object} [actionParams]
 * @returns {Object}
 */
function prepareActionBodyObj(actionName, actionParams) {
    const timestamp = Date.now();
    return [
        {
            channel: 'actions',
            message: {
                actions: [
                    {
                        name: actionName,
                        id: `${actionName}_${timestamp}`,
                        timestamp,
                        parameters: actionParams
                    }
                ]
            }
        }
    ];
}
