// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Compare semver versions,
 * for simple cases like 1.22.33 - doesn't check postfix, doesn't properly validate version
 * @param {String} versionA
 * @param {String} versionB
 * @returns {Number|void 0} 1 if A newer than B; 0 if A equal to B; -1 if A older than B; undefined if versions are not valid
 */
export function semverCompare(versionA, versionB) {
    const parsedA = typeof versionA === 'string' && semverParse(versionA);
    const parsedB = typeof versionB === 'string' && semverParse(versionB);
    if (!parsedA || !parsedB) {
        return void 0;
    }
    if (parsedA[0] !== parsedB[0]) {
        return parsedA[0] - parsedB[0] > 0 ? 1 : -1;
    }
    if (parsedA[1] !== parsedB[1]) {
        return parsedA[1] - parsedB[1] > 0 ? 1 : -1;
    }
    if (parsedA[2] !== parsedB[2]) {
        return parsedA[2] - parsedB[2] > 0 ? 1 : -1;
    }
    return 0;
}

function semverParse(version) {
    const regex = /^v?([0-9]+)\.([0-9]+)\.([0-9]+)/;
    const match = version.match(regex);
    if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return null;
}
