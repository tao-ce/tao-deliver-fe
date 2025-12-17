// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import UAParser from 'ua-parser-js';

/**
 * Guess what browser & OS the software is running in
 * @param {string} [userAgentString] - User agent string. It is `global.navigator.userAgent` if it is not provided.
 * @returns {browser} parsed browser data
 */
export function getBrowserDetails(userAgentString) {
    const parser = new UAParser(userAgentString);
    const result = parser.getResult();
    return {
        browser: {
            name: (result.browser.name || '').toLowerCase(),
            version: result.browser.version
        },
        os: {
            name: (result.os.name || '').toLowerCase(),
            version: result.os.version
        },
        userAgentString: result.ua
    };
}
