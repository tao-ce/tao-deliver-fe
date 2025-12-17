// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import prettyPrint from '../prettyPrint.js';

describe('prettyPrint', () => {
    it.each([
        {
            response: {
                base: {
                    identifier: 'foo'
                }
            },
            expected: '(identifier) foo'
        },
        {
            response: {
                base: {
                    float: 0.5
                }
            },
            expected: '(float) 0.5'
        },
        {
            response: {
                base: {
                    integer: 2
                }
            },
            expected: '(integer) 2'
        },
        {
            response: {
                base: {
                    integer: 0
                }
            },
            expected: '(integer) 0'
        },
        {
            response: {
                base: {
                    integer: -6
                }
            },
            expected: '(integer) -6'
        },
        {
            response: {
                list: {
                    directedPair: [['choice_2', 'gap_1']]
                }
            },
            expected: '(directedPair) [[choice_2, gap_1]]'
        },
        {
            response: {
                record: {
                    foo: 'foo',
                    bar: 'bar'
                }
            },
            expected: '(record) {"foo":"foo","bar":"bar"}'
        }
    ])('test prettyPrint %o', ({ response, expected }) => {
        expect(prettyPrint(response)).toEqual(expected);
    });

    it('throws error if no data', () => {
        const response = {};

        expect(() => prettyPrint(response)).toThrowError();
        expect(() => prettyPrint(response)).toThrow('Not a valid PCI JSON Response');
    });
});
