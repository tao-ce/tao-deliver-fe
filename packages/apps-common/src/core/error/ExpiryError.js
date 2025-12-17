// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Error due to expiry of a cached resource
 */
//eslint-disable-next-line
export default class ExpiryError extends Error {
    /**
     * Instantiate an error
     * @param {string} message - the error message
     * @param {number} errorCode - the code of the error
     * @param {...} params - additional error parameters (line, etc.)
     */
    constructor(message, errorCode, ...params) {
        super(message, ...params);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ExpiryError);
        }

        this.name = 'ExpiryError';
        this.message = message;
        this.type = 'action';
        this.recoverable = true;
        this.errorCode = errorCode;
    }
}
