// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const qtiHtmlAttributes = ['id', 'class', 'role', 'dir', 'lang'];
const qtiHtmlPrefixes = ['aria', 'data'];

/**
 * Get the attributes that renders as HTML attributes
 * @param {Object} attributes - the source attributes
 * @param {String[]} [excludes] - excludes some attributes that would have been rendered
 * @returns {Object} the filtered attributes object
 */
export function htmlAttributes(attributes = {}, excludes = []) {
    return Object.keys(attributes || {})
        .filter(
            key =>
                !excludes.includes(key) &&
                (qtiHtmlAttributes.includes(key) || qtiHtmlPrefixes.some(prefix => key.startsWith(`${prefix}-`)))
        )
        .reduce((acc, key) => {
            acc[key] = attributes[key];
            return acc;
        }, {});
}
