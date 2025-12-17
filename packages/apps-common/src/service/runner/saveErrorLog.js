// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import request from 'core/fetchRequest';
import urlBuilder from '../../core/urlBuilder.js';
import { wait } from '../../core/async.js';
import TimeoutError from 'core/error/TimeoutError';

/**
 *
 * @param {Object} params
 * @param {string} [params.errorLog] - info about error message and stacktrace
 * @param {string?} [params.error] - error object (if LTI backend error, may not exist)
 * @param {string?} [params.itemIdentifier]
 * @param {boolean} [params.retry] - is error recoverable or not (will user be offered Reload button, or will he need to re-launch)
 * @param {string} [params.deliveryExecutionId]
 * @param {Object} [params.jwtTokenHandler]
 * @param {Object} [params.config] - controller config, containing `endpoints` info
 * @param {Object} [params.logger]
 * @returns {Promise<void>}
 */
export async function saveErrorLog({
    errorLog,
    error,
    itemIdentifier,
    retry,
    deliveryExecutionId,
    jwtTokenHandler,
    config,
    logger
}) {
    if (!jwtTokenHandler) {
        return; //error happened earlier than auth was configured; do nothing as log endpoint will fail
    }
    const timeout = 2500; //ms; small enough to not hinder `exitUrl` redirect too much

    const reasonParamMaxlength = 8000;
    const recoverableMsg = retry ? '[recoverable]' : '[unrecoverable]';
    const itemIdentifierMsg = itemIdentifier ? `[${itemIdentifier}]` : '';

    let additionalMsg = '';
    additionalMsg += error?.additionalInfo?.edgeReadAloud ? '[edgeReadAloud]' : '';
    additionalMsg += error?.additionalInfo?.unhandledPromiseRejection ? '[unhandledPromiseRejection]' : '';
    additionalMsg += error?.logOnly ? '[logOnly]' : '';

    errorLog = errorLog.slice(
        0,
        reasonParamMaxlength - itemIdentifierMsg.length - recoverableMsg.length - additionalMsg.length
    );
    const bodyObj = {
        issuer: 'deliver-fe',
        reason: `${errorLog}\n${additionalMsg}${itemIdentifierMsg}${recoverableMsg}`
    };

    const endpoint = config.endpoints.errorLog;
    const url = urlBuilder.urlFromResourceConfig(deliveryExecutionId, endpoint);
    const requestOptions = {
        method: endpoint.method,
        jwtTokenHandler,
        timeout,
        body: JSON.stringify(bodyObj),
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        //timeout inside `fetchRequest` doesn't apply to `refreshToken` and second request after refresh.
        await Promise.race([
            request(url, requestOptions),
            wait(timeout).then(() => Promise.reject(new TimeoutError('saveErrorLog timeout', timeout)))
        ]);
    } catch (err) {
        logger.error(`postErrorLog request failed: ${err?.message}\n${err?.stack}`);
    }
}
