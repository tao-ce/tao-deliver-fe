// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-23 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Resolves after `time` milliseconds have passed
 * @param {number} time
 * @returns {Promise<unknown>}
 */
export const wait = time =>
    new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });

/**
 * Equivalent to `defaultsDeep` from `lodash` but doesn't merge array values.
 * Mutates `destination` object.
 * Recursively assigns properties of source objects to the destination object for all destination properties that are undefined.
 * Source objects are applied from left to right. Once a property is set, additional values of the same property are ignored.
 * @param {*} destination
 * @param  {...any} sources
 * @returns {Object}
 */
export const defaultsDeepNoArrayMerge = (destination, ...sources) => {
    if (typeof destination === 'undefined' || destination === null) {
        destination = {};
    } else if (typeof destination !== 'object' || Array.isArray(destination)) {
        return destination;
    }
    let result = Object.assign({}, destination);
    for (const source of sources) {
        if (typeof source === 'object' && !Array.isArray(source)) {
            recurseDefaultsDeepNoArrayMerge(result, source);
        }
    }
    Object.assign(destination, result);
    return destination;
};

function recurseDefaultsDeepNoArrayMerge(result, source) {
    for (const key in source) {
        const isSourceUndefined = typeof source[key] === 'undefined';
        const isResultUndefined = typeof result[key] === 'undefined';
        const isSourceAnObject = typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null;
        const isResultAnObject = typeof result[key] === 'object' && !Array.isArray(result[key]) && result[key] !== null;

        if (isSourceAnObject && (isResultUndefined || isResultAnObject)) {
            if (isResultUndefined) {
                result[key] = {};
            }
            recurseDefaultsDeepNoArrayMerge(result[key], source[key]);
        } else if (isResultUndefined && !isSourceUndefined && !isSourceAnObject) {
            result[key] = source[key];
        }
    }
}
