// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025-2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { notifyFactory } from './notify.js';
import { wait } from '../core/async.js';
import request from 'core/fetchRequest';

/**
 * Normalizes URLs coming from runtime configuration.
 * We accept absolute URLs, protocol-relative URLs and root-relative URLs.
 *
 * @param {string} url
 * @returns {string}
 */
function resolveUrl(url = '') {
    if (!url?.length) {
        return url;
    }

    if (url.startsWith('//')) {
        return window.location.protocol + url;
    }

    if (url.startsWith('/')) {
        return window.location.origin + url;
    }

    return url;
}

/**
 *
 * @param {object} options
 * @param {object} [options.jwtTokenHandler]
 * @param {string} [options.exitUrl] - URL to redirect to in cases like submission, unrecoverable error
 * @param {object} [options.exitUrlParameters]
 * @param {string} [options.endAssessmentUrl] - URL to redirect to in cases like test-taker logout
 * @param {string} [options.successUrl] - URL to redirect to when submission succeeds
 * @returns {Promise<void>}
 */
export async function endAssessment({
    jwtTokenHandler,
    exitUrl,
    exitUrlParameters = {},
    endAssessmentUrl = '',
    successUrl = ''
}) {
    let exitUrlEntity;
    let notify;
    try {
        exitUrlEntity = new URL(exitUrl);
        for (const [parameter, value] of Object.entries(exitUrlParameters)) {
            exitUrlEntity.searchParams.append(parameter, value);
        }
        notify = notifyFactory(exitUrlEntity?.origin);
    } catch {
        exitUrlEntity = '';
        notify = () => {};
    }

    const resolvedExitUrl = exitUrlEntity.toString();
    const resolvedEndAssessmentUrl = resolveUrl(endAssessmentUrl);
    const resolvedSuccessUrl = resolveUrl(successUrl) || resolvedExitUrl;

    if (!resolvedEndAssessmentUrl?.length || !jwtTokenHandler) {
        if (resolvedSuccessUrl === resolvedExitUrl) {
            // potential parent app has a short time to handle the exit its own way;
            // if it hasn't destroyed us, we'll continue with redirect
            notify('exit', { exitUrl: resolvedExitUrl });
        }
        await wait(1000);
        window.location.replace(resolvedSuccessUrl);
        return;
    }

    let redirectUrl = resolvedExitUrl;
    let shouldNotifyExit = true;
    try {
        const endAssessmentUrlEntity = new URL(resolvedEndAssessmentUrl);
        endAssessmentUrlEntity.searchParams.append('redirectUrl', resolvedSuccessUrl);
        endAssessmentUrlEntity.searchParams.append('redirect', 0);

        const requestOptions = {
            jwtTokenHandler,
            method: 'GET'
        };
        const response = await request(endAssessmentUrlEntity.toString(), requestOptions);
        if (response.endAssessmentUrl) {
            redirectUrl = response.endAssessmentUrl;
            shouldNotifyExit = resolvedSuccessUrl === resolvedExitUrl;
        }
    } catch {
        // suppress endAssessmentUrl request error, and fallback to using the original exitUrl
    } finally {
        if (shouldNotifyExit) {
            notify('exit', { exitUrl: resolvedExitUrl });
        }
        await wait(1000);
        window.location.replace(redirectUrl);
    }
}
