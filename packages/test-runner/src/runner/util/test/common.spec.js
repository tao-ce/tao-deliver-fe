// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { defaultsDeepNoArrayMerge } from '../common.js';

describe('defaultsDeepNoArrayMerge', () => {
    const d = defaultsDeepNoArrayMerge;

    it('returns an object and mutates destination param', () => {
        expect(d(null)).toEqual({});
        expect(d(void 0, null)).toEqual({});
        expect(d(void 0, { a: 5 })).toEqual({ a: 5 });
        expect(d(null, { a: 5 })).toEqual({ a: 5 });
        expect(d({ a: 5 }, null, void 0)).toEqual({ a: 5 });
        expect(d({ a: 5 }, null, { b: 5 }, void 0)).toEqual({ a: 5, b: 5 });

        const destination1 = { a: 5 };
        const source1 = { a: 9, b: 10 };
        expect(d(destination1, source1, { c: 11 })).toEqual({ a: 5, b: 10, c: 11 });
        expect(destination1).toEqual({ a: 5, b: 10, c: 11 });
        expect(source1).toEqual({ a: 9, b: 10 });

        //weird cases, doesn't really matter how it behaves here
        expect(d({ a: 5 }, 8)).toEqual({ a: 5 });
        expect(d(8, { a: 5 })).toEqual(8);
        expect(d({ a: 5 }, 'abc')).toEqual({ a: 5 });
        expect(d('abc', { a: 5 })).toEqual('abc');
        expect(d({ a: 5 }, false)).toEqual({ a: 5 });
        expect(d(false, { a: 5 })).toEqual(false);
        expect(d([5], [6])).toEqual([5]);
        expect(d([], [5])).toEqual([]);
    });

    it('recursively assigns source properties to destination if undefined there', () => {
        expect(
            d(
                { a: 5 },
                { a: 8 },
                { b: { c: { d: 9 }, f: { g: 14 }, h: 15 } },
                { b: { e: 10, c: { d: 12 }, f: 13, h: { g: 15 } } }
            )
        ).toEqual({
            a: 5,
            b: { c: { d: 9 }, f: { g: 14 }, h: 15, e: 10 }
        });

        expect(
            d(
                {
                    enabled: false,
                    min: 0,
                    name: '',
                    value: null,
                    inner: { enabled: false, min: 0, name: '', value: null }
                },
                {
                    enabled: true,
                    min: 5,
                    name: 'abc',
                    value: { foo: 'bar' },
                    inner: { enabled: true, min: 5, name: 'abc', value: { foo: 'bar' } }
                }
            )
        ).toEqual({
            enabled: false,
            min: 0,
            name: '',
            value: null,
            inner: { enabled: false, min: 0, name: '', value: null }
        });
    });

    it('does not merge array properties', () => {
        expect(
            d({ a: [1, 2, 3], aa: [] }, { a: [4, 5, 6], c: { b: ['x', 'y'] } }, { aa: [88], c: { b: ['z'] } })
        ).toEqual({
            a: [1, 2, 3],
            aa: [],
            c: { b: ['x', 'y'] }
        });
    });
});
