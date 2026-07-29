// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Errors from the lockdown browser
 */
//eslint-disable-next-line
export default class KioskError extends Error {
    /**
     * Instantiate an error
     * @param {string} message - the error message
     * @param {...} params - additional error parameters (line, etc.)
     */
    constructor(message, ...params) {
        super(message, ...params);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, KioskError);
        }

        this.name = 'KioskError';
        this.message = message;
        this.type = 'kiosk';
    }
}
