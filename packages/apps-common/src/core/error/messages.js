// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019-2022 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ApiError from 'core/error/ApiError';
import NetworkError from 'core/error/NetworkError';
import RenderingError from 'core/error/RenderingError';
import TimeoutError from 'core/error/TimeoutError';
import UserError from 'core/error/UserError';
import LaunchError from './LaunchError.js';
import ActionError, { actionErrorCodes } from './ActionError.js';
import { __ } from '@oat-sa-private/ui-core';
import TokenError from 'core/error/TokenError';

/**
 * List of error message targetting the end user
 */
export const errorMessages = Object.freeze({
    timeout: {
        get title() {
            return __('Timeout');
        },
        get cause() {
            return __('This page cannot be reached.');
        },
        get remediation() {
            return __('Please reload the page or contact your administrator.');
        }
    },

    noConnection: {
        get title() {
            return __('No connection to the service.');
        },
        get remediation() {
            return __('Please contact your test administrator.');
        }
    },

    noInternet: {
        get title() {
            return __('No internet connection.');
        },
        get remediation() {
            return __('Please check your internet connection or contact your test administrator.');
        }
    },

    notAvailable: {
        get title() {
            return __('Test not available.');
        },
        get cause() {
            return __('Sorry, we cannot start your test.');
        },
        get remediation() {
            return __('Please launch your test again or contact your administrator.');
        }
    },

    busy: {
        get title() {
            return __('Service busy.');
        },
        get cause() {
            return __('The service is temporarily unavailable due to high traffic load.');
        },
        get remediation() {
            return __('Please wait for a few minutes and try again.');
        }
    },

    client: {
        get title() {
            return __('Unexpected error.');
        },
        get cause() {
            return __('Sorry, an unexpected error happened during the test.');
        },
        get remediation() {
            return __('Please reload the page or contact your test administrator.');
        }
    },

    clientEdgeReadAloud: {
        get title() {
            return __('Unexpected error.');
        },
        get cause() {
            return __(
                'Certain third-party tools are not supported in TAO Advance. For example, "Read aloud" provided by Edge browser.'
            );
        },
        get remediation() {
            return __('Please disable them and reload the page, or contact your test administrator for more details.');
        }
    },

    unexpected: {
        get title() {
            return __('Unexpected error.');
        },
        get cause() {
            return __('Sorry, an unexpected error happened during the test.');
        },
        get remediation() {
            return __('Please contact your test administrator.');
        }
    },

    multipleSession: {
        get title() {
            return __('Unexpected error.');
        },
        get cause() {
            return __('The system identified multiple active sessions.');
        },
        get remediation() {
            return __('In order to continue, please click on the Reload button.');
        }
    },

    proctorTerminated: {
        get title() {
            return __('Test terminated');
        },
        get cause() {
            return __('Your test has been terminated by the proctor.');
        }
    },

    proctorPaused: {
        get title() {
            return __('Test paused');
        },
        get cause() {
            return __('Your test has been paused by the proctor.');
        },

        get remediation() {
            return __('Please click on the Reload button.');
        }
    },

    proctorReset: {
        get title() {
            return __('Test was reset');
        },
        get cause() {
            return __('The administrator reset your test, you need to start again.');
        },

        get remediation() {
            return __('Please click on the Reload button to restart.');
        }
    },

    tokenExpired: {
        get title() {
            return __('The test cannot be continued.');
        },
        get cause() {
            return __('Sorry, a problem occurred due to long inactivity.');
        },
        get remediation() {
            return __('Please launch your test again or contact your administrator.');
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
    if (err instanceof TimeoutError || (isFromHTTP && err.errorCode === 408)) {
        return errorMessages.timeout;
    }
    if (isFromHTTP && err.errorCode === 0 && navigator.onLine === false) {
        return errorMessages.noInternet;
    }
    if (isFromHTTP && [0, 503].includes(err.errorCode) && navigator.onLine === true) {
        return errorMessages.noConnection;
    }
    if (isFromHTTP && [401, 403, 404].includes(err.errorCode) && !(err instanceof TokenError)) {
        return errorMessages.notAvailable;
    }
    if (isFromHTTP && [429, 504].includes(err.errorCode)) {
        return errorMessages.busy;
    }
    if (isFromHTTP && err.errorCode === 409) {
        return errorMessages.multipleSession;
    }
    if (err instanceof RenderingError || err instanceof UserError) {
        return errorMessages.client;
    }
    if (err instanceof LaunchError) {
        return errorMessages.notAvailable;
    }
    if (err instanceof TokenError) {
        return errorMessages.tokenExpired;
    }
    if (err instanceof ActionError && err.errorCode === actionErrorCodes.proctorTerminated) {
        return errorMessages.proctorTerminated;
    }
    if (err instanceof ActionError && err.errorCode === actionErrorCodes.proctorPaused) {
        return errorMessages.proctorPaused;
    }
    if (err instanceof ActionError && err.errorCode === actionErrorCodes.proctorReset) {
        return errorMessages.proctorReset;
    }
    if (err?.additionalInfo && err.additionalInfo.edgeReadAloud && err.additionalInfo.fromSvelte) {
        return errorMessages.clientEdgeReadAloud;
    }
    return errorMessages.unexpected;
}

/**
 * Get error messages by type
 * @param {string} type - the message type from errorMessagesTypes
 * @returns {Object} the error messages
 */
export function getErrorMessageByType(type) {
    return type && errorMessages[type] ? errorMessages[type] : errorMessages.unexpected;
}

/**
 * Create the error message structure based on it's content
 * @param {String} message - a unique error message, can be structured if separated by new lines
 * @returns {Object|void} the structure for the template
 */
export function guessMessageStructure(message = '') {
    const titleThreshold = 25;
    const chunks = message.split('\n').filter(Boolean);

    if (chunks.length === 0) {
        return errorMessages.unexpected;
    } else if (chunks.length === 1) {
        if (chunks[0].length > titleThreshold) {
            return {
                title: errorMessages.unexpected.title,
                cause: chunks[0]
            };
        } else {
            return {
                title: chunks[0],
                cause: errorMessages.unexpected.cause
            };
        }
    } else if (chunks.length === 2) {
        return {
            title: chunks[0],
            cause: chunks[1]
        };
    } else if (chunks.length > 2) {
        return {
            title: chunks[0],
            cause: chunks[1],
            remediation: chunks.slice(2).join(' ')
        };
    }
}
