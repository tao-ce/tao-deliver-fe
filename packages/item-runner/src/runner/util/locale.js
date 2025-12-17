// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { __ } from '@oat-sa-private/ui-core';

/**
 * @typedef LocalizedSymbols
 * @property {String[]} negativeSigns - first in array should be most 'common' as it will be used to format number to string
 * @property {String[]} decimalSeparators - first in array should be most 'common' as it will be used to format number to string
 */

export default function numberFormattingFactory(locale = 'en') {
    if (typeof locale !== 'string') {
        locale = getLocale();
    }
    /**
     * Default symbols which using in JS integers and floats
     * @type {LocalizedSymbols}
     */
    const defaultSymbols = {
        decimalSeparators: ['.'],
        negativeSigns: ['-']
    };
    let localizedSymbols = getCustomLocalizedSymbols(locale);
    if (!localizedSymbols) {
        localizedSymbols = getBrowserLocalizedSymbols();
    }
    localizedSymbols = getExtendedWithIdenticalSymbols(localizedSymbols);

    /**
     * Return hardcoded value for specific locales, because browser returns wrong value
     * https://bugs.chromium.org/p/chromium/issues/detail?id=620285&q=Intl.NumberFormat&can=2
     * Chrome on Mac: nn-NO dot, nb-NO comma; other browsers - both comma.
     * @param {String} loc - locale, * can be used as wildcard symbol
     * @returns {LocalizedSymbols|null} map of Symbols that have browser inconsistency
     */
    function getCustomLocalizedSymbols(loc) {
        const customLocales = ['no', 'nn', '*-NO'];
        if (
            customLocales.some(localePattern => {
                const wildcardRegexp = new RegExp(`^${localePattern.replace('*', '\\w+')}$`);
                return wildcardRegexp.test(loc);
            })
        ) {
            return { decimalSeparators: [','], negativeSigns: ['-'] };
        }
        return null;
    }

    /**
     * Return standard value for specific locales, which can be passed to `Intl` object constructor
     * @param {String} loc - locale, * can be used as wildcard symbol
     * @returns {String}
     */
    function getLocaleForIntl(loc) {
        //ar-ARB is set in TAO, but it's not a standard language code, so Intl.NumberFormat throws error on it.
        if (loc.toLowerCase() === 'ar-arb') {
            return Intl.NumberFormat.supportedLocalesOf('ar-AR', 'ar')[0] || loc;
        }
        return loc;
    }

    /**
     * Return number symbols localized by browser
     * @returns {LocalizedSymbols}
     */
    function getBrowserLocalizedSymbols() {
        /**
         * Localization of this constant allow to get all necessary info for correct formatting specific symbols, like separators, negative symbols, etc.
         * @type {Number}
         */
        const templateConstant = -12345.6;
        const parts = new Intl.NumberFormat(getLocaleForIntl(locale)).formatToParts(templateConstant);

        return {
            decimalSeparators: [parts.find(d => d.type === 'decimal').value],
            negativeSigns: [parts.find(d => d.type === 'minusSign').value]
        };
    }

    /**
     * User may input negative-sign as 'ascii-minus', or as 'unicode-minus' from his native keyboard
     * So allow multiple symbols if they have the same meaning from user perspective
     * @param {LocalizedSymbols} locSymbols
     * @returns {LocalizedSymbols}
     */
    function getExtendedWithIdenticalSymbols(locSymbols) {
        const identicalDecimalSeparators = {};

        const minusCommon = '-'; //charCode=45
        const minus2212 = '\u2212'; // '−' charCode=8722
        const identicalNegativeSigns = {
            [minusCommon]: [minusCommon, minus2212],
            [minus2212]: [minusCommon, minus2212]
        };

        return {
            decimalSeparators: getExtendedSeparators(locSymbols.decimalSeparators, identicalDecimalSeparators),
            negativeSigns: getExtendedSeparators(locSymbols.negativeSigns, identicalNegativeSigns)
        };
    }

    /**
     * @param {string[]} separators
     * @param {Object<string, string[]>} identicalSeparators
     * @returns {string[]}
     */
    function getExtendedSeparators(separators, identicalSeparators) {
        return separators
            .flatMap(decSep => identicalSeparators[decSep] || decSep)
            .filter((val, idx, arr) => idx === arr.indexOf(val));
    }

    /**
     * Ensure that number contains only permitted symbols or do not contains symbols at all
     * @param {String} value - number as string
     * @param {LocalizedSymbols} locSymbols
     * @returns {Boolean}
     */
    function containsOnlyValidSymbols(value, locSymbols) {
        const nonDigitMatches = value.match(/[^0-9]+/g);
        if (!nonDigitMatches) {
            return true;
        }
        return nonDigitMatches.every(
            symbol => locSymbols.negativeSigns.includes(symbol) || locSymbols.decimalSeparators.includes(symbol)
        );
    }

    /**
     * Replace symbols in value from current to required
     * Replaces *any* symbol in 'from' with *first* symbol from 'to'
     * @param {String} value - number with symbols
     * @param {LocalizedSymbols} from - replacement symbols
     * @param {LocalizedSymbols} to - symbols for replacing
     * @returns {String} - value with replaced numeral symbols
     */
    function updateValueSymbols(value, from = {}, to = {}) {
        if (to.decimalSeparators[0]) {
            for (const fromDecSep of from.decimalSeparators) {
                value = value.replace(fromDecSep, to.decimalSeparators[0]);
            }
        }
        if (to.negativeSigns[0]) {
            for (const fromNegSep of from.negativeSigns) {
                value = value.replace(fromNegSep, to.negativeSigns[0]);
            }
        }
        return value;
    }

    /**
     * Update string to format which can be recognized by JS as integer or float.
     * @param {String} value - initial value
     * @returns {String} - formatted string
     */
    function updateValue(value) {
        value = value.trim();

        if (!containsOnlyValidSymbols(value, localizedSymbols)) {
            return 'NaN';
        }

        // replace symbols in string to symbols which is used for integers and floats in JS
        value = updateValueSymbols(value, localizedSymbols, defaultSymbols);
        return value;
    }

    return {
        /**
         * Parse integer to the supported format of QTI spec
         * @param {String|Number} value
         * @param {Number} base
         * @returns {NaN|Number}
         * @see https://observablehq.com/@mbostock/localized-number-parsing for more info
         */
        parseIntValue(value, base) {
            if (typeof value === 'number' && Number.isInteger(value)) {
                return value;
            }
            if (typeof value === 'string') {
                // update string by using rules for integer and float formats
                const preparedString = updateValue(value);
                if (Number.isInteger(Number(preparedString))) {
                    return Number.parseInt(preparedString, base);
                }
            }
            return NaN;
        },
        /**
         * Parse float (only base=10) to the supported format of QTI spec
         * @param {String|Number} value
         * @returns {NaN|Number}
         * @see https://observablehq.com/@mbostock/localized-number-parsing for more info
         */
        parseFloatValue(value) {
            if (typeof value === 'number') {
                return value;
            }
            if (typeof value === 'string') {
                const preparedString = updateValue(value);
                // avoid problem, that Number.parseFloat('4.567abcdefgh') === 4.567 instead of NaN
                if (!isNaN(Number(preparedString))) {
                    return Number.parseFloat(preparedString);
                }
            }
            return NaN;
        },
        /**
         * Format number to string by used locale rules.
         * @param {Number} value
         * @returns {String} formatted string
         */
        formatToString(value) {
            if (typeof value !== 'number') {
                return value.toString();
            }

            // do not use Intl.NumberFormat().format() here because currently we can parse only latin numbering system in `parseFloat`->`updateValue`
            // (otherwise '-12345.67' will be '-১২৩৪৫.৬৭' in bn-BD and '؜-١٢٣٤٥٫٦٧' in ar-EG)
            let formattedValue = value.toString();
            formattedValue = updateValueSymbols(formattedValue, defaultSymbols, localizedSymbols);
            return formattedValue;
        },
        /**
         * Get LocalizedSymbols
         * @returns {LocalizedSymbols}
         */
        getLocalizedSymbols() {
            return localizedSymbols;
        }
    };
}

/**
 * Return the locale of the user
 * @returns {String} locale
 */
export function getLocale() {
    return __.getLocale() || document.documentElement.lang || 'en';
}
