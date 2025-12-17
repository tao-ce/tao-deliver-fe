// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { formatResponseValue, convertDimensionToCss } from '../responseType.js';

describe('response type helper', () => {
    describe('formatResponseValue method', () => {
        it('should return with string by default', () => {
            expect(formatResponseValue('123')).toBe('123');
        });

        it('should trim leading and trailing whitespace only for numeric baseTypes', () => {
            expect(formatResponseValue('  answer  ')).toBe('  answer  ');
            expect(formatResponseValue('\tanswer \n')).toBe('\tanswer \n');
            expect(formatResponseValue('\t 987 \n', 'integer')).toBe(987);
            expect(formatResponseValue('\t 123.45 \n', 'float')).toBe(123.45);
        });

        test.each([
            ['123', 123, void 0],
            ['101', 5, 2],
            ['001234', 1234, 10],
            ['abc', 2748, 16]
        ])('should convert %s text to %d on base %s', (originalValue, expectedResult, base) => {
            expect(formatResponseValue(originalValue, 'integer', base)).toBe(expectedResult);
        });

        it('should convert string to float correctly', () => {
            expect(formatResponseValue('889.2', 'float')).toBe(889.2);
            expect(formatResponseValue('4.0', 'float')).toBe(4);
            expect(formatResponseValue('', 'float')).toBe(null);
            expect(formatResponseValue('   ', 'float')).toBe(null);
        });

        test.each([
            ['100a', 'integer', void 0],
            ['12', 'integer', 2],
            ['fgh', 'integer', 16],
            ['123.3x', 'float', void 0]
        ])('should throw TypeError for %s if baseType is %s and base is %s', (originalValue, baseType, base = 10) => {
            try {
                formatResponseValue(originalValue, baseType, base);
            } catch (e) {
                expect(e).toBeInstanceOf(TypeError);
            }
        });

        it('should throw RangeError if baseType is integer and value is too big', () => {
            expect(() => formatResponseValue('-2147483649', 'integer', 10)).toThrowError(RangeError);
            expect(() => formatResponseValue('2147483648', 'integer', 10)).toThrowError(RangeError);
            expect(() => formatResponseValue('80000000', 'integer', 16)).toThrowError(RangeError);
            expect(() => formatResponseValue('10000000000', 'integer', 10)).toThrowError(RangeError);
        });

        it('should not throw RangeError if baseType is float or if value fits range', () => {
            expect(() => formatResponseValue('-2147483647', 'integer', 10)).not.toThrowError();
            expect(() => formatResponseValue('2147483647', 'integer', 10)).not.toThrowError();
            expect(() => formatResponseValue('7FFFFFFF', 'integer', 16)).not.toThrowError();
            expect(() => formatResponseValue('100000000', 'integer', 10)).not.toThrowError();
            expect(() => formatResponseValue('10000000000', 'float', 10)).not.toThrowError();
        });
    });
    describe('convertDimensionToCss method', () => {
        it('should convert a number to a pixel value string', () => {
            expect(convertDimensionToCss(100)).toBe('100px');
            expect(convertDimensionToCss(0)).toBe('0px');
        });

        it('should return the string value as is', () => {
            expect(convertDimensionToCss('50%')).toBe('50%');
            expect(convertDimensionToCss('auto')).toBe('auto');
            expect(convertDimensionToCss('calc(100% - 10px)')).toBe('calc(100% - 10px)');
        });

        it('should return the default value if the input is neither a number nor a string', () => {
            expect(convertDimensionToCss(null)).toBe('auto');
            expect(convertDimensionToCss(void 0)).toBe('auto');
            expect(convertDimensionToCss({})).toBe('auto');
            expect(convertDimensionToCss([])).toBe('auto');
        });

        it('should use a custom default value if provided', () => {
            expect(convertDimensionToCss(null, 'default')).toBe('default');
            expect(convertDimensionToCss(void 0, 'default')).toBe('default');
            expect(convertDimensionToCss({}, 'default')).toBe('default');
        });
    });
});
