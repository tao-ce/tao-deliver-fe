// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Backend action API error codes
 */
export const actionErrorCodes = {
    proctorTerminated: 100,
    proctorPaused: 102,
    proctorReset: 105
};

/**
 * Errors in the actions
 */
//eslint-disable-next-line
export default class ActionError extends Error {
    /**
     * Instantiate an error
     * @param {string} message - the error message
     * @param {number} errorCode - the code of the error
     * @param {...} params - additional error parameters (line, etc.)
     */
    constructor(message, errorCode, ...params) {
        super(message, ...params);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ActionError);
        }

        this.name = 'ActionError';
        this.message = message;
        this.type = 'action';
        this.recoverable = errorCode !== actionErrorCodes.proctorTerminated;
        this.errorCode = errorCode;
    }
}
