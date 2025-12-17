// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import numberFormattingFactory from '../../util/locale.js';

/**
 * Sets the response variable based on its baseType and base
 * @param {*} value
 * @param {String} [baseType='string']
 * @param {Integer} [base=10]
 * @param {String} [locale='en']
 * @throws {TypeError}
 * @returns {*} new value
 */
export function formatResponseValue(value, baseType = 'string', base = 10, locale = 'en') {
    const numberBaseTypes = Object.freeze({
        integer: 'integer',
        float: 'float'
    });

    if (typeof value === 'string') {
        if (baseType in numberBaseTypes) {
            value = value.trim();
        }
        if (!value.length) {
            // Don't parse empty value
            return null;
        }
    }

    const parser = numberFormattingFactory(locale);
    let parsedValue = value;
    switch (baseType) {
        case numberBaseTypes.integer:
            parsedValue = base === 10 ? parser.parseIntValue(value, base) : parseInt(value, base);
            break;
        case numberBaseTypes.float:
            parsedValue = parser.parseFloatValue(value);
            break;
    }

    const match = typeof value === 'string' && parsedValue.toString(base).toLowerCase() === value.toLowerCase();

    // Permit leading zeros ('005' -> '5')
    const matchWithoutLeadingZeroes = parsedValue.toString(base) === value.replace(/^0+/, '');
    // Permit all zeros ('000' -> '0')
    const matchAllZeroes = parsedValue.toString(base) === value.replace(/^0+$/, '0');
    // Permit if number value is not NaN
    const matchNumber = (baseType === 'float' || (baseType === 'integer' && base === 10)) && !isNaN(parsedValue);

    if (match || matchWithoutLeadingZeroes || matchAllZeroes || matchNumber) {
        //qti specifies 32-bit integer range; min should be -2147483648, but current sdk implementation uses -2147483647
        if (baseType === 'integer' && (parsedValue < -2147483647 || parsedValue > 2147483647)) {
            throw new RangeError('Integer response type overflow');
        }

        return parsedValue;
    }

    throw new TypeError('Invalid value');
}

/**
 * Format the input value based on its baseType and base
 * @param {*} value
 * @param {String} baseType
 * @param {Integer} base
 * @param {String} [locale='en']
 * @returns {String} new value
 */
export function formatInputValue(value, baseType, base, locale = 'en') {
    if (typeof value === 'undefined' || value === null) {
        return '';
    }
    const parser = numberFormattingFactory(locale);
    return baseType !== 'string' && base === 10 ? parser.formatToString(value) : value.toString(base);
}

/**
 * Get localizedSymbols
 * @param {String} [locale='en']
 * @returns {Object}
 */
export function getLocalizedSymbols(locale = 'en') {
    const parser = numberFormattingFactory(locale);
    return parser.getLocalizedSymbols();
}

/**
 * Getting the dimension depending on the argument type
 * @param {Number|String} dimensionValue
 * @param {String} defaultValue
 * @returns {String}
 */
export function convertDimensionToCss(dimensionValue, defaultValue = 'auto') {
    if (typeof dimensionValue === 'number') {
        return `${dimensionValue}px`;
    }
    if (typeof dimensionValue === 'string') {
        return dimensionValue;
    }
    return defaultValue;
}
