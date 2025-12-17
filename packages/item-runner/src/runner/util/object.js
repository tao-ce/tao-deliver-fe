// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-23 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Safe object properties extractor:
 *    const object = { 'a': { 'b': { 'c': 3 } } };
 *    get(object, 'a.b.c') => 3
 *    get(object, 'a.b.d', 'default') => 'default'
 *
 * @param {Object} obj object - The object to query.
 * @param {string} path - The path of the property to get.
 * @param {*} [defaultValue] - The value returned for undefined resolved values.
 * @returns {*}
 */
export const get = (obj, path, defaultValue) => {
    const properties = path.split('.');
    let currentObj = obj;

    for (let i = 0; i < properties.length && currentObj; i++) {
        const property = properties[i];
        currentObj = currentObj[property];
    }

    return currentObj === void 0 ? defaultValue : currentObj;
};
