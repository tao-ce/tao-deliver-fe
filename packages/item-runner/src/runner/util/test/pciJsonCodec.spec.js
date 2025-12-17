// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Tests the encode/decode functionality of pciJsonCodec.js
 * using most known cardinalities and baseTypes
 *
 * isomorphicTestCases copied from IMS Global PCI specification
 * @see https://www.imsglobal.org/spec/pci/v1p0#baseTypes
 */
import codec from '../pciJsonCodec.js';

const isomorphicTestCases = [
    // eslint-disable-next-line no-undefined
    ['single null', { cardinality: 'single', baseType: null, value: undefined }, { base: null }],
    ['single boolean', { cardinality: 'single', baseType: 'boolean', value: true }, { base: { boolean: true } }],
    ['single integer', { cardinality: 'single', baseType: 'integer', value: 123 }, { base: { integer: 123 } }],
    ['single float', { cardinality: 'single', baseType: 'float', value: 23.23 }, { base: { float: 23.23 } }],
    ['single string', { cardinality: 'single', baseType: 'string', value: 'string' }, { base: { string: 'string' } }],
    ['single point', { cardinality: 'single', baseType: 'point', value: [10, 20] }, { base: { point: [10, 20] } }],
    ['single pair', { cardinality: 'single', baseType: 'pair', value: ['A', 'B'] }, { base: { pair: ['A', 'B'] } }],
    [
        'single directedPair',
        { cardinality: 'single', baseType: 'directedPair', value: ['a', 'b'] },
        { base: { directedPair: ['a', 'b'] } }
    ],
    [
        'single duration',
        { cardinality: 'single', baseType: 'duration', value: 'P10Y3M20DT4H30M25S' },
        { base: { duration: 'P10Y3M20DT4H30M25S' } }
    ],
    [
        'single file',
        {
            cardinality: 'single',
            baseType: 'file',
            value: { data: 'cGxlYXN1cmUu', mime: 'text/plain', name: 'helloworld.txt' }
        },
        { base: { file: { data: 'cGxlYXN1cmUu', mime: 'text/plain', name: 'helloworld.txt' } } }
    ],
    [
        'single uri',
        { cardinality: 'single', baseType: 'uri', value: 'file:///somewhere.txt' },
        { base: { uri: 'file:///somewhere.txt' } }
    ],
    [
        'single intOrIdentifier',
        { cardinality: 'single', baseType: 'intOrIdentifier', value: 123456 },
        { base: { intOrIdentifier: 123456 } }
    ],
    [
        'single identifier',
        { cardinality: 'single', baseType: 'identifier', value: '_identifier' },
        { base: { identifier: '_identifier' } }
    ],

    [
        'multiple booleans',
        { cardinality: 'multiple', baseType: 'boolean', value: [true, false, true] },
        { list: { boolean: [true, false, true] } }
    ],
    [
        'multiple integers',
        { cardinality: 'multiple', baseType: 'integer', value: [2, 3, 5, 7, 11, 13] },
        { list: { integer: [2, 3, 5, 7, 11, 13] } }
    ],
    [
        'multiple floats',
        { cardinality: 'multiple', baseType: 'float', value: [3.1415926, 12.34, 98.76] },
        { list: { float: [3.1415926, 12.34, 98.76] } }
    ],
    [
        'multiple strings',
        { cardinality: 'multiple', baseType: 'string', value: ['Another', 'And 1 more'] },
        { list: { string: ['Another', 'And 1 more'] } }
    ],
    [
        'multiple points',
        {
            cardinality: 'multiple',
            baseType: 'point',
            value: [
                [123, 456],
                [640, 480]
            ]
        },
        {
            list: {
                point: [
                    [123, 456],
                    [640, 480]
                ]
            }
        }
    ],
    [
        'multiple pairs',
        {
            cardinality: 'multiple',
            baseType: 'pair',
            value: [
                ['A', 'B'],
                ['D', 'C']
            ]
        },
        {
            list: {
                pair: [
                    ['A', 'B'],
                    ['D', 'C']
                ]
            }
        }
    ],
    [
        'multiple directedPairs',
        {
            cardinality: 'multiple',
            baseType: 'directedPair',
            value: [
                ['A', 'B'],
                ['C', 'D']
            ]
        },
        {
            list: {
                directedPair: [
                    ['A', 'B'],
                    ['C', 'D']
                ]
            }
        }
    ],
    [
        'multiple durations',
        { cardinality: 'multiple', baseType: 'duration', value: ['P10Y3M20DT4H30M25S'] },
        { list: { duration: ['P10Y3M20DT4H30M25S'] } }
    ],
    [
        'multiple files',
        { cardinality: 'multiple', baseType: 'file', value: [{ data: 'cGxlYXN1cmUu', mime: 'text/plain' }] },
        { list: { file: [{ data: 'cGxlYXN1cmUu', mime: 'text/plain' }] } }
    ],
    [
        'multiple uris',
        { cardinality: 'multiple', baseType: 'uri', value: ['file:///aFile.txt', 'file:///abc.txt'] },
        { list: { uri: ['file:///aFile.txt', 'file:///abc.txt'] } }
    ],
    [
        'multiple intOrIdentifiers',
        { cardinality: 'multiple', baseType: 'intOrIdentifier', value: [2, '_id'] },
        { list: { intOrIdentifier: [2, '_id'] } }
    ],
    [
        'multiple identifiers',
        { cardinality: 'multiple', baseType: 'identifier', value: ['_id1', 'id2', 'ID3'] },
        { list: { identifier: ['_id1', 'id2', 'ID3'] } }
    ]
];

const encoderTestCases = [
    [
        'ordered booleans',
        { cardinality: 'ordered', baseType: 'boolean', value: [true, false, true] },
        { list: { boolean: [true, false, true] } }
    ],
    [
        'ordered integers',
        { cardinality: 'ordered', baseType: 'integer', value: [2, 3, 5, 7, 11, 13] },
        { list: { integer: [2, 3, 5, 7, 11, 13] } }
    ],
    [
        'ordered floats',
        { cardinality: 'ordered', baseType: 'float', value: [3.1415926, 12.34, 98.76] },
        { list: { float: [3.1415926, 12.34, 98.76] } }
    ],
    [
        'ordered strings',
        { cardinality: 'ordered', baseType: 'string', value: ['Another', 'And 1 more'] },
        { list: { string: ['Another', 'And 1 more'] } }
    ],

    [
        'single string - weird case',
        { cardinality: 'SINGLE', baseType: 'STRING', value: 'string' },
        { base: { string: 'string' } }
    ],
    [
        'single directedPair - weird case',
        { cardinality: 'Single', baseType: 'Directedpair', value: ['a', 'b'] },
        { base: { directedPair: ['a', 'b'] } }
    ],
    [
        'single boolean-as-string true',
        { cardinality: 'single', baseType: 'boolean', value: 'true' },
        { base: { boolean: true } }
    ],
    [
        'single boolean-as-string false',
        { cardinality: 'single', baseType: 'boolean', value: 'false' },
        { base: { boolean: false } }
    ],
    [
        'multiple booleans-as-strings mix',
        { cardinality: 'multiple', baseType: 'boolean', value: ['true', 'false', true] },
        { list: { boolean: [true, false, true] } }
    ],
    [
        'single pair misformatted',
        { cardinality: 'single', baseType: 'pair', value: 'A B' },
        { base: { pair: ['A', 'B'] } }
    ],
    [
        'single directedPair misformatted',
        { cardinality: 'single', baseType: 'directedPair', value: 'a b' },
        { base: { directedPair: ['a', 'b'] } }
    ],
    [
        'multiple booleans non-array',
        { cardinality: 'multiple', baseType: 'boolean', value: true },
        { list: { boolean: [true] } }
    ],
    [
        'ordered booleans non-array',
        { cardinality: 'ordered', baseType: 'boolean', value: true },
        { list: { boolean: [true] } }
    ],
    [
        'single identifier as an array',
        { cardinality: 'single', baseType: 'identifier', value: ['_identifier'] },
        { base: { identifier: '_identifier' } }
    ],
    [
        'single float as an array',
        { cardinality: 'single', baseType: 'float', value: [3.14] },
        { base: { float: 3.14 } }
    ],
    ['single identifier null', { cardinality: 'single', baseType: 'identifier', value: null }, { base: null }],
    ['single integer null', { cardinality: 'single', baseType: 'integer', value: null }, { base: null }],
    ['single point null', { cardinality: 'single', baseType: 'point', value: null }, { base: null }],
    [
        'multiple identifier null',
        { cardinality: 'multiple', baseType: 'identifier', value: null },
        { list: { identifier: [] } }
    ],
    ['multiple boolean null', { cardinality: 'multiple', baseType: 'boolean', value: null }, { list: { boolean: [] } }]
];

const decoderTestCases = [
    [
        'single string - weird case',
        { cardinality: 'single', baseType: 'string', value: 'string' },
        { BASE: { STRING: 'string' } }
    ],
    [
        'single directedPair - weird case',
        { cardinality: 'single', baseType: 'directedPair', value: ['a', 'b'] },
        { Base: { Directedpair: ['a', 'b'] } }
    ],

    [
        'single integer with intruder keys',
        { cardinality: 'single', baseType: 'integer', value: 123 },
        { foo: 'bar', base: { integer: 123 } }
    ],
    // eslint-disable-next-line no-undefined
    ['single null', { cardinality: 'single', baseType: null, value: undefined }, { base: null }]
];

const complexRecordValue = [
    {
        name: 'rock',
        base: {
            boolean: true
        }
    },
    {
        name: 'paper',
        list: {
            string: ['p', 'a', 'p', 'e', 'r']
        }
    },
    {
        name: 'scissors',
        list: {
            integer: [1, 2, 3, 4]
        }
    },
    {
        name: null
    }
];

const recordObject = {
    cardinality: 'record',
    baseType: null,
    value: complexRecordValue
};

const recordJson = {
    record: complexRecordValue
};

const badObjects = [
    ['bad cardinality', { cardinality: 'blah', baseType: 'boolean', value: true }],
    ['bad baseType', { cardinality: 'single', baseType: 'fooob', value: true }],
    ['missing cardinality', { baseType: 'boolean', value: true }],
    ['missing baseType', { cardinality: 'single', value: true }]
];

const badJsons = [
    ['bad cardinality', { quux: { boolean: true } }],
    ['bad baseType', { base: { baz: true } }],
    ['missing cardinality', {}],
    ['missing baseType', { base: {} }]
];

describe('PCI JSON Codec: encoder', () => {
    const cases = isomorphicTestCases.concat(encoderTestCases);
    test.each(cases)('encodes well a %s', (_, input, expected) => {
        const encoded = codec.encode(input);
        expect(encoded).toStrictEqual(expected);
    });

    it('encodes well a record', () => {
        const encoded = codec.encode(recordObject);
        expect(encoded).toStrictEqual(recordJson);
    });

    test.each(badObjects)('encoder throws on %s', (_, input) => {
        expect(() => codec.encode(input)).toThrow(TypeError);
    });
});

describe('PCI JSON Codec: decoder', () => {
    const cases = isomorphicTestCases.concat(decoderTestCases);
    test.each(cases)('decodes well a %s', (_, expected, input) => {
        const decoded = codec.decode(input);
        expect(decoded).toStrictEqual(expected);
    });

    it('decodes well a record', () => {
        const decoded = codec.decode(recordJson);
        expect(decoded).toStrictEqual(recordObject);
    });

    test.each(badJsons)('decoder throws on %s', (_, input) => {
        expect(() => codec.decode(input)).toThrow(TypeError);
    });
});
