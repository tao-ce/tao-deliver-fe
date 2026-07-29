// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2026 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Tests the functionality of the exported helper methods in attributes.js
 */
import {
    hasClass,
    removeClass,
    extractFromClasses,
    extractLastMatchingClass,
    extractAllFromClasses,
    extractDataValueList,
    extractDataValueBoolean
} from '../attributes.js';

describe('attributes API', () => {
    it('has expected API', () => {
        expect(typeof hasClass).toEqual('function');
        expect(typeof extractFromClasses).toEqual('function');
        expect(typeof extractAllFromClasses).toEqual('function');
        expect(typeof extractLastMatchingClass).toEqual('function');
    });

    it('returns expected types', () => {
        expect(typeof hasClass()).toEqual('boolean');
        expect(typeof extractFromClasses()).toEqual('object');
    });
});

describe('attributes: hasClass', () => {
    it('correctly determines presence or absence of exact className', () => {
        expect(hasClass('qti-foo', 'qti-foo')).toEqual(true);
        expect(hasClass('qti-bar qti-foo', 'qti-foo')).toEqual(true);
        expect(hasClass('qti-foo qti-bar', 'qti-foo')).toEqual(true);
        expect(hasClass(' qti-foo ', 'qti-foo')).toEqual(true);
        expect(hasClass('qti-barqti-foo', 'qti-foo')).toEqual(false);
        expect(hasClass('qti-food', 'qti-foo')).toEqual(false);
        expect(hasClass('', 'qti-foo')).toEqual(false);
    });
});

describe('attributes: removeClass', () => {
    it('correctly removes passed className', () => {
        expect(removeClass('qti-foo qti-bar', 'qti-foo')).toEqual('qti-bar');
        expect(removeClass('qti-foo qti-bar', 'qti-abc')).toEqual('qti-foo qti-bar');
        expect(removeClass('qti-foo', 'qti-foo')).toEqual('');
    });
});

describe('attributes: extractFromClasses', () => {
    it('correctly extracts stacking number', () => {
        expect(extractFromClasses('qti-stacking', 'qti-stacking-')).toEqual(null);
        expect(extractFromClasses('qti-stacking-0', 'qti-stacking-')).toEqual('0');
        expect(extractFromClasses('qti-stacking-0', 'qti-stacking-', parseInt)).toEqual(0);
        expect(extractFromClasses('qti-stacking-1', 'qti-stacking-', parseInt)).toEqual(1);
        expect(extractFromClasses('qti-stacking-2', 'qti-stacking-', parseInt)).toEqual(2);
        expect(extractFromClasses('qti-stacking-3', 'qti-stacking-', parseInt)).toEqual(3);
        expect(extractFromClasses('qti-stacking-4', 'qti-stacking-', parseInt)).toEqual(4);
        expect(extractFromClasses('qti-stacking-5', 'qti-stacking-', parseInt)).toEqual(5);
        expect(extractFromClasses('qti-stacking-cool', 'qti-stacking-', parseInt)).toEqual(NaN);
        expect(extractFromClasses('qti-stacking', 'qti-stacking-', void 0, '')).toEqual('');
        expect(extractFromClasses('foo bar baz', 'qti-stacking-', void 0, 'defaultValue')).toEqual('defaultValue');
    });

    it('extracts last match', () => {
        expect(extractFromClasses('qti-first qti-middle qti-last', 'qti-')).toEqual('last');
    });

    it('extracts first match', () => {
        expect(extractFromClasses('qti-first qti-middle qti-last', 'qti-', void 0, null, false)).toEqual('first');
    });
});

describe('attributes: extractAllFromClasses', () => {
    it('correctly extracts specifiers', () => {
        expect(extractAllFromClasses('qti-stacking', 'qti-stacking-')).toEqual([]);
        expect(extractAllFromClasses('qti-stacking-0', 'qti-stacking-')).toEqual(['0']);
        expect(extractAllFromClasses('qti-stacking-0', 'qti-stacking-', parseInt)).toEqual([0]);
        expect(extractAllFromClasses('qti-stacking-1 qti-stacking-2', 'qti-stacking-', parseInt)).toEqual([1, 2]);
        expect(extractAllFromClasses('qti-stacking-cool', 'qti-stacking-', parseInt)).toEqual([NaN]);
        expect(extractAllFromClasses('qti-choices-top', 'qti-choices-', void 0)).toEqual(['top']);
        expect(extractAllFromClasses('qti-choices-top', 'qti-choices-', true)).toEqual(['top']);
        expect(
            extractAllFromClasses(
                'qti-choices-top qti-orientation-horizontal qti-choices-top qti-choices-left',
                'qti-choices-'
            )
        ).toEqual(['top', 'left']);
    });
});

describe('attributes: extractLastMatchingClass', () => {
    it('correctly extracts last matching class', () => {
        expect(extractLastMatchingClass('first middle last', ['first', 'middle'])).toEqual('middle');
        expect(extractLastMatchingClass('first middle last', ['first', 'last'])).toEqual('last');
        expect(extractLastMatchingClass('first middle last', ['middle', 'last'])).toEqual('last');
        expect(extractLastMatchingClass('first middle last', ['first'])).toEqual('first');
        expect(extractLastMatchingClass('first middle last', ['ultimate'])).toEqual(null);
        expect(extractLastMatchingClass('first middle last', [])).toEqual(null);
        expect(extractLastMatchingClass('', ['ultimate'])).toEqual(null);
    });
});

describe('attributes: extractDataValueList', () => {
    it('correctly extracts list of strings', () => {
        expect(extractDataValueList('first, middle,last')).toEqual(['first', 'middle', 'last']);
    });
    it('correctly extracts single strings', () => {
        expect(extractDataValueList('first')).toEqual(['first']);
    });
    it('correctly extracts from empty input', () => {
        expect(extractDataValueList('')).toEqual([]);
    });
    it('correctly extracts from undefined input', () => {
        expect(extractDataValueList(void 0)).toEqual([]);
    });
});

describe('attributes: extractDataValueBoolean', () => {
    it('correctly extracts falsy values', () => {
        expect(extractDataValueBoolean(void 0)).toBe(false);
        expect(extractDataValueBoolean(null)).toBe(false);
        expect(extractDataValueBoolean(false)).toBe(false);
        expect(extractDataValueBoolean('')).toBe(false);
        expect(extractDataValueBoolean('false')).toBe(false);
    });
    it('correctly extracts truthy values', () => {
        expect(extractDataValueBoolean(true)).toBe(true);
        expect(extractDataValueBoolean('true')).toBe(true);
    });
    it('correctly extracts undefined values using default provided', () => {
        expect(extractDataValueBoolean(void 0, false)).toBe(false);
        expect(extractDataValueBoolean(void 0, true)).toBe(true);
    });
});
