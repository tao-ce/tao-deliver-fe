// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Errors in the delivery launch
 */
//eslint-disable-next-line
export default class LaunchError extends Error {
    /**
     * Instantiate an error
     * @param {string} message - the error message
     * @param {...} params - additional error parameters (line, etc.)
     */
    constructor(message, ...params) {
        super(message, ...params);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, LaunchError);
        }

        this.name = 'LaunchError';
        this.message = message;
        this.type = 'launch';
    }
}
