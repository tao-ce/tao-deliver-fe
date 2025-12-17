// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

export function convertPatternMask(qtiPatternMask) {
    let jsPatternMask = qtiPatternMask;

    if (!qtiPatternMask.startsWith('^')) {
        jsPatternMask = `^${jsPatternMask}`;
    }

    if (!qtiPatternMask.endsWith('$')) {
        jsPatternMask += '$';
    }

    return jsPatternMask;
}
