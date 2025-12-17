// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import NumberFormattingFactory from '../locale.js';

/* eslint-disable no-loss-of-precision */

// examples for parsing strings/integers into integers
const dotBasedIntegers = [
    { value: 0, result: 0 },
    { value: 1, result: 1 },
    { value: -100000, result: -100000 },
    { value: 99999999999999999999999, result: 99999999999999999999999 },
    { value: 0.1, result: NaN },
    { value: Math.PI, result: NaN },
    { value: NaN, result: NaN },
    { value: Infinity, result: NaN },
    { value: -Infinity, result: NaN },
    { value: '10', result: 10 },
    { value: true, result: NaN },
    { value: false, result: NaN },
    { value: void 0, result: NaN },
    { value: null, result: NaN },
    { value: [1], result: NaN },
    { value: {}, result: NaN },
    { value: 5.0, result: 5 }, // it is not true for JS, but may be true for test
    { value: 5.0000000000000001, result: 5 }, // it is not true for JS, but may be true for test
    { value: '5.0', result: 5 },
    { value: '5.0000000000000001', result: 5 },
    { value: '0', result: 0 },
    { value: '1', result: 1 },
    { value: '-100000', result: -100000 },
    { value: '−100000', result: -100000 }, //'\u2212' minus
    { value: '100000-', result: NaN },
    { value: '-2.0', result: -2 },
    { value: '-2,0', result: NaN },
    { value: '-2,2', result: NaN },
    { value: '-2.5', result: NaN },
    { value: '99999999999999999999999', result: 99999999999999999999999 },
    { value: 'true', result: NaN },
    { value: 'false', result: NaN },
    { value: `${void 0}`, result: NaN },
    { value: 'null', result: NaN },
    { value: '0.1', result: NaN },
    { value: 'a', result: NaN },
    { value: 'e1', result: NaN },
    { value: '1e', result: NaN },
    { value: '1.', result: 1 },
    { value: '.1', result: NaN },
    { value: '1 000', result: NaN },
    { value: ' 1', result: 1 },
    { value: '1 ', result: 1 },
    { value: ' ', result: NaN },
    { value: '', result: NaN }
];

const commaBasedIntegers = [
    { value: 0, result: 0 },
    { value: 1, result: 1 },
    { value: -100000, result: -100000 },
    { value: 99999999999999999999999, result: 99999999999999999999999 },
    { value: 0.1, result: NaN },
    { value: Math.PI, result: NaN },
    { value: NaN, result: NaN },
    { value: Infinity, result: NaN },
    { value: -Infinity, result: NaN },
    { value: '10', result: 10 },
    { value: true, result: NaN },
    { value: false, result: NaN },
    { value: void 0, result: NaN },
    { value: null, result: NaN },
    { value: [1], result: NaN },
    { value: {}, result: NaN },
    { value: 5.0, result: 5 },
    { value: 5.0000000000000001, result: 5 },
    { value: '5,0', result: 5 },
    { value: '5,0000000000000001', result: 5 },
    { value: '0', result: 0 },
    { value: '1', result: 1 },
    { value: '-100000', result: -100000 },
    { value: '−100000', result: -100000 }, //'\u2212' minus
    { value: '100000−', result: NaN },
    { value: '-2.0', result: NaN },
    { value: '-2,0', result: -2 },
    { value: '-2,2', result: NaN },
    { value: '-2.5', result: NaN },
    { value: '99999999999999999999999', result: 99999999999999999999999 },
    { value: 'true', result: NaN },
    { value: 'false', result: NaN },
    { value: `${void 0}`, result: NaN },
    { value: 'null', result: NaN },
    { value: '0,1', result: NaN },
    { value: 'a', result: NaN },
    { value: 'e1', result: NaN },
    { value: '1e', result: NaN },
    { value: '1,', result: 1 },
    { value: ',1', result: NaN },
    { value: '1 1', result: NaN },
    { value: ' 1', result: 1 },
    { value: '1 000', result: NaN },
    { value: ' ', result: NaN },
    { value: '', result: NaN }
];

const dotBasedFloats = [
    { value: 0, result: 0 },
    { value: 1, result: 1 },
    { value: -100000, result: -100000 },
    { value: 99999999999999999999999, result: 99999999999999999999999 },
    { value: 0.1, result: 0.1 },
    { value: Math.PI, result: Math.PI },
    { value: NaN, result: NaN },
    { value: Infinity, result: Infinity },
    { value: -Infinity, result: -Infinity },
    { value: '10', result: 10 },
    { value: true, result: NaN },
    { value: false, result: NaN },
    { value: void 0, result: NaN },
    { value: null, result: NaN },
    { value: [1], result: NaN },
    { value: {}, result: NaN },
    { value: 5.0, result: 5.0 },
    { value: 5.000000000000001, result: 5.000000000000001 },
    { value: 5.0000000000000001, result: 5.0000000000000001 },
    { value: '5.0', result: 5.0 },
    { value: '5.000000000000001', result: 5.000000000000001 },
    { value: '5.0000000000000001', result: 5.0000000000000001 },
    { value: '0', result: 0 },
    { value: '1', result: 1 },
    { value: '-100000', result: -100000 },
    { value: '100000-', result: NaN },
    { value: '-2.0', result: -2.0 },
    { value: '-2,0', result: NaN },
    { value: '-2,2', result: NaN },
    { value: '-2.5', result: -2.5 },
    { value: '−2.5', result: -2.5 }, //'\u2212' minus
    { value: '99999999999999999999999', result: 99999999999999999999999 },
    { value: 'true', result: NaN },
    { value: 'false', result: NaN },
    { value: `${void 0}`, result: NaN },
    { value: 'null', result: NaN },
    { value: '0.1', result: 0.1 },
    { value: 'a', result: NaN },
    { value: 'e1', result: NaN },
    { value: '1e', result: NaN },
    { value: '1.', result: 1 },
    { value: '.1', result: 0.1 },
    { value: '1 000', result: NaN },
    { value: ' 1', result: 1 },
    { value: '1 ', result: 1 },
    { value: ' ', result: NaN },
    { value: '', result: NaN }
];

const commaBasedFloats = [
    { value: 0, result: 0 },
    { value: 1, result: 1 },
    { value: -100000, result: -100000 },
    { value: 99999999999999999999999, result: 99999999999999999999999 },
    { value: 0.1, result: 0.1 },
    { value: Math.PI, result: Math.PI },
    { value: NaN, result: NaN },
    { value: Infinity, result: Infinity },
    { value: -Infinity, result: -Infinity },
    { value: '10', result: 10 },
    { value: true, result: NaN },
    { value: false, result: NaN },
    { value: void 0, result: NaN },
    { value: null, result: NaN },
    { value: [1], result: NaN },
    { value: {}, result: NaN },
    { value: 5.000000000000001, result: 5.000000000000001 },
    { value: 5.0000000000000001, result: 5.0000000000000001 },
    { value: '5,0', result: 5.0 },
    { value: '5,000000000000001', result: 5.000000000000001 },
    { value: '5,0000000000000001', result: 5.0000000000000001 },
    { value: '0', result: 0 },
    { value: '1', result: 1 },
    { value: '-100000', result: -100000 },
    { value: '100000-', result: NaN },
    { value: '-2.0', result: NaN },
    { value: '-2,0', result: -2.0 },
    { value: '-2,2', result: -2.2 },
    { value: '−2,2', result: -2.2 }, //'\u2212' minus
    { value: '-2.5', result: NaN },
    { value: '99999999999999999999999', result: 99999999999999999999999 },
    { value: 'true', result: NaN },
    { value: 'false', result: NaN },
    { value: `${void 0}`, result: NaN },
    { value: 'null', result: NaN },
    { value: '0,1', result: 0.1 },
    { value: 'a', result: NaN },
    { value: 'e1', result: NaN },
    { value: '1e', result: NaN },
    { value: '1,', result: 1 },
    { value: ',1', result: 0.1 },
    { value: '1 000', result: NaN },
    { value: ' 1', result: 1 },
    { value: '1 ', result: 1 },
    { value: ' ', result: NaN },
    { value: '', result: NaN }
];
// examples for formatting numbers to localized strings
const dotBasedNumberToStringPairs = [
    { value: 0, result: '0' },
    { value: 1, result: '1' },
    { value: -100000, result: '-100000' },
    { value: 0.1, result: '0.1' },
    { value: 1.0, result: '1' },
    { value: 1234.1234, result: '1234.1234' },
    { value: -0.1, result: '-0.1' }
];

const commaBasedNumberToStringPairs = [
    { value: 0, result: '0' },
    { value: 1, result: '1' },
    { value: -100000, result: '-100000' },
    { value: 0.1, result: '0,1' },
    { value: 1.0, result: '1' },
    { value: 1234.1234, result: '1234,1234' },
    { value: -0.1, result: '-0,1' }
];

describe('integers and floats localization', () => {
    test.each([
        'en',
        'en-US',
        'en-GB',
        'it',
        'fr',
        'no',
        'nn',
        'nb-NO',
        'nn-NO',
        'sma-NO',
        'smj-NO',
        'se-NO',
        'xxx-NO',
        'lt-LT',
        'sv-SE'
    ])('parses integer value for %s language', lang => {
        const localeValuesRelation = {
            en: dotBasedIntegers,
            'en-US': dotBasedIntegers,
            'en-GB': dotBasedIntegers,
            it: commaBasedIntegers,
            fr: commaBasedIntegers,
            no: commaBasedIntegers,
            nn: commaBasedIntegers,
            'nb-NO': commaBasedIntegers,
            'nn-NO': commaBasedIntegers,
            'sma-NO': commaBasedIntegers,
            'smj-NO': commaBasedIntegers,
            'se-NO': commaBasedIntegers,
            'xxx-NO': commaBasedIntegers,
            'lt-LT': commaBasedIntegers,
            'sv-SE': commaBasedIntegers
        };
        const testableValues = localeValuesRelation[lang];
        const formatFactory = new NumberFormattingFactory(lang);
        if (testableValues) {
            testableValues.forEach(pair => {
                expect(formatFactory.parseIntValue(pair.value)).toEqual(pair.result);
            });
        }
    });
    test.each([
        'en',
        'en-US',
        'en-GB',
        'it',
        'fr',
        'no',
        'nn',
        'nb-NO',
        'nn-NO',
        'sma-NO',
        'smj-NO',
        'se-NO',
        'lt-LT',
        'sv-SE'
    ])('parses float value for %s language', lang => {
        const localeValuesRelation = {
            en: dotBasedFloats,
            'en-US': dotBasedFloats,
            'en-GB': dotBasedFloats,
            it: commaBasedFloats,
            fr: commaBasedFloats,
            no: commaBasedFloats,
            nn: commaBasedFloats,
            'nb-NO': commaBasedFloats,
            'nn-NO': commaBasedFloats,
            'sma-NO': commaBasedFloats,
            'smj-NO': commaBasedFloats,
            'se-NO': commaBasedFloats,
            'lt-LT': commaBasedFloats,
            'sv-SE': commaBasedFloats
        };
        const testableValues = localeValuesRelation[lang];
        const formatFactory = new NumberFormattingFactory(lang);
        if (testableValues) {
            testableValues.forEach(pair => {
                expect(formatFactory.parseFloatValue(pair.value)).toEqual(pair.result);
            });
        }
    });

    test.each([
        'en',
        'en-US',
        'en-GB',
        'it',
        'fr',
        'no',
        'nn',
        'nb-NO',
        'nn-NO',
        'sma-NO',
        'smj-NO',
        'se-NO',
        'xxx-NO',
        'lt-LT',
        'sv-SE'
    ])('formats number to string for %s language', lang => {
        const localeValuesRelation = {
            en: dotBasedNumberToStringPairs,
            'en-US': dotBasedNumberToStringPairs,
            'en-GB': dotBasedNumberToStringPairs,
            it: commaBasedNumberToStringPairs,
            fr: commaBasedNumberToStringPairs,
            no: commaBasedNumberToStringPairs,
            nn: commaBasedNumberToStringPairs,
            'nb-NO': commaBasedNumberToStringPairs,
            'nn-NO': commaBasedNumberToStringPairs,
            'sma-NO': commaBasedNumberToStringPairs,
            'smj-NO': commaBasedNumberToStringPairs,
            'se-NO': commaBasedNumberToStringPairs,
            'xxx-NO': commaBasedNumberToStringPairs,
            'lt-LT': commaBasedNumberToStringPairs,
            'sv-SE': commaBasedNumberToStringPairs
        };
        const testableValues = localeValuesRelation[lang];
        const formatFactory = new NumberFormattingFactory(lang);
        if (testableValues) {
            testableValues.forEach(pair => {
                expect(formatFactory.formatToString(pair.value)).toEqual(pair.result);
            });
        }
    });

    it('ar-ARB locale', () => {
        //in Chrome, separator is dot. In Node, comma-like-symbol. This test is just to check that `ar-ARB` locale doesn't throw errors.
        const lang = 'ar-ARB';
        const formatFactory = new NumberFormattingFactory(lang);
        expect(formatFactory.parseIntValue('-12')).toEqual(-12);
        expect(formatFactory.formatToString(-12.45)).toEqual('-12.45');
    });

    it('initialize formatting factory without params', () => {
        const formatFactory = new NumberFormattingFactory();
        expect(formatFactory.parseFloatValue('1.2')).toEqual(1.2);
        expect(formatFactory.parseFloatValue('1,2')).not.toEqual(1.2);
    });

    it('initialize formatting factory with wrong locale', () => {
        const formatFactory = new NumberFormattingFactory(null);
        expect(formatFactory.parseFloatValue('1.2')).toEqual(1.2);
        expect(formatFactory.parseFloatValue('1,2')).not.toEqual(1.2);
    });

    it('format wrong value to string', () => {
        const formatFactory = new NumberFormattingFactory();
        expect(formatFactory.formatToString(true)).toEqual('true');
    });
});
