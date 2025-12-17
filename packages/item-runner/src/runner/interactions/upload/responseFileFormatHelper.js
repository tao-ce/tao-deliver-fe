// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Compare 2 responses object from the upload interactions.
 * To prevent reading the full file, the comparison is made only
 * the response data (name, mime type) and the file size only.
 *
 * @param {Object} responseValue1
 * @param {Object} responseValue2
 * @returns {boolean} true if they are equal, false if not
 */
export function compareResponseValues(responseValue1, responseValue2) {
    return (
        responseValue1 === responseValue2 ||
        (typeof responseValue1 === 'object' &&
            responseValue1 !== null &&
            typeof responseValue2 === 'object' &&
            responseValue2 !== null &&
            responseValue1.mime === responseValue2.mime &&
            responseValue1.name === responseValue2.name &&
            responseValue1.data === responseValue2.data)
    );
}
