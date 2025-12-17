// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Error due to aborted request or process
 */
//eslint-disable-next-line
export default class AbortError extends Error {
    /**
     * Instantiate an error
     * @param {string} message - the error message
     * @param {...} params - additional error parameters (line, etc.)
     */
    constructor(message, ...params) {
        super(message, ...params);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AbortError);
        }

        this.name = 'AbortError';
        this.message = message;
    }
}
