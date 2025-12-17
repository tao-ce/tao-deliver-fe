// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2024 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { __ } from '@oat-sa-private/ui-core';
import ApiError from 'core/error/ApiError';
import NetworkError from 'core/error/NetworkError';
import TokenError from 'core/error/TokenError';
import ActionError from 'taoDeliverAppsCommon/core/error/ActionError.js';
import LaunchError from 'taoDeliverAppsCommon/core/error/LaunchError.js';
import { getErrorMessageFromError as getCommonErrorMessageFromError } from 'taoDeliverAppsCommon/core/error/messages.js';

/**
 * List of application-specific error messages targetting the end user
 */
export const errorMessages = Object.freeze({
    notFound: {
        get title() {
            return __('Not found.');
        },
        get cause() {
            return __('The requested resource cannot be found.');
        },
        get remediation() {
            return __('Please reload the page or contact your administrator.');
        }
    },
    unauthorised: {
        get title() {
            return __('Authentication required.');
        },
        get cause() {
            return __('One or more resources at this page require authentication.');
        },
        get remediation() {
            return __('Please re-authenticate and try again, or contact your administrator.');
        }
    }
});

/**
 * The list of error message types
 */
export const errorMessagesTypes = Object.keys(errorMessages);

/**
 * Get error messages from an Error
 * @param {Error} err - the original error
 * @returns {Object} the error messages
 */
export function getErrorMessageFromError(err) {
    const isFromHTTP = err instanceof ApiError || err instanceof NetworkError || err instanceof ActionError;

    if (isFromHTTP && [403, 404].includes(err.errorCode) && !(err instanceof TokenError)) {
        return errorMessages.notFound;
    }
    if (isFromHTTP && 401 === err.errorCode) {
        err.recoverable = false;
        return errorMessages.unauthorised;
    }
    if (err instanceof LaunchError) {
        return errorMessages.notFound;
    }
    return getCommonErrorMessageFromError(err);
}

/**
 * Get if an Error is retriable
 * @param {Error} err - the original error
 * @returns {Boolean} retry
 */
export function getIsRetriableFromError(err) {
    const isFromHTTP = err instanceof ApiError || err instanceof NetworkError || err instanceof ActionError;
    if (isFromHTTP && err.errorCode === 404) {
        return false;
    }
    //if we can recover from the error (the double check is for backward compat)
    return err.recoverable === true || err.unrecoverable === false;
}

export async function getErrorDetailsFromError(err) {
    const details = [];

    if ('response' in err && 'body' in err.response) {
        const body = await new Response(err.response.body).json();

        if ('errors' in body) {
            for (const e of body.errors) {
                const entry = {
                    title: e.title,
                    detail: e.detail
                };

                if ('meta' in e) {
                    entry.meta = e.meta;
                }

                details.push(entry);
            }
        }
    }

    return details;
}
