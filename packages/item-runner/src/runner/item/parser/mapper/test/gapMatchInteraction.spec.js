// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import gapMatchMapper from '../gapMatchInteraction.js';

describe('Gap match interaction choice properties mapper', () => {
    it('replaces MathML expressions placeholders', () => {
        const result = gapMatchMapper.mapProperties({
            choices: [
                {
                    blockTree: [
                        {
                            props: {
                                attributes: {
                                    mathML: '<semantics><mstyle displaystyle="true" scriptlevel…RD"><mi>π</mi></mrow></mrow></mstyle></semantics>'
                                }
                            },
                            content: 'i620287464277e'
                        }
                    ],
                    content: '{{i620287464277e}}'
                }
            ]
        });

        expect(result.choices[0].content).toMatchSnapshot();
    });

    it('replaces multiple math expressions placeholders within content', () => {
        const result = gapMatchMapper.mapProperties({
            choices: [
                {
                    blockTree: [
                        {
                            props: {
                                attributes: {
                                    mathML: '<semantics><mstyle displaystyle="true" scriptlevel…RD"><mi>π</mi></mrow></mrow></mstyle></semantics>'
                                }
                            },
                            content: 'i620287464277e'
                        },
                        {
                            props: {
                                attributes: {
                                    mathML: '<semantics><mstyle displaystyle="true" scriptlevel…RD"><mi>π</mi></mrow></mrow></mstyle></semantics>'
                                }
                            },
                            content: 'i620287464277f'
                        }
                    ],
                    content: '{{i620287464277e}} and {{i620287464277f}}'
                }
            ]
        });

        expect(result.choices[0].content).toMatchSnapshot();
    });

    it('adds gaps found in elements', () => {
        const properties = {
            foo: 'bar'
        };
        const body = {
            elements: {
                i65cf232ada173: {
                    identifier: 'gap_1',
                    serial: 'i65cf232ada173',
                    qtiClass: 'gap',
                    attributes: {
                        identifier: 'gap_1',
                        fixed: false,
                        required: false
                    }
                },
                i65cf232ada174: {
                    identifier: 'gap_1',
                    serial: 'i65cf232ada174',
                    qtiClass: 'img',
                    attributes: {
                        src: 'http://example.com/image.png',
                        alt: 'image',
                        width: '200',
                        height: '200'
                    }
                },
                i65cf232ada175: {
                    identifier: 'gap_2',
                    serial: 'i65cf232ada175',
                    qtiClass: 'gap',
                    attributes: {
                        identifier: 'gap_2',
                        fixed: false,
                        required: true
                    }
                },
            }
        };
        expect(gapMatchMapper.mapProperties(properties, { body })).toMatchSnapshot();
    });
});

describe('Calculate cardinality', () => {
    it('returns the input properties', () => {
        const properties = {
            foo: 'bar'
        };
        expect(gapMatchMapper.mapProperties(properties)).toMatchObject(properties);
    });

    it('avoid cardinality calculation if properties contains it', () => {
        const properties = {
            foo: 'bar',
            cardinality: 'multiple'
        };
        const body = {
            elements: {
                gap_1: {}
            }
        };
        expect(gapMatchMapper.mapProperties(properties, { body })).toMatchObject(properties);
    });

    it('extends properties by single cardinality', () => {
        const properties = {
            foo: 'bar'
        };
        const body = {
            elements: {
                gap_1: {}
            }
        };
        expect(gapMatchMapper.mapProperties(properties, { body })).toMatchObject(
            Object.assign({}, properties, { cardinality: 'single' })
        );
    });

    it('extends properties by multiple cardinality', () => {
        const properties = {
            foo: 'bar'
        };
        const body = {
            elements: {
                gap_1: {},
                gap_2: {}
            }
        };
        expect(gapMatchMapper.mapProperties(properties, { body })).toMatchObject(
            Object.assign({}, properties, { cardinality: 'multiple' })
        );
    });

    it('does not fail on empty body', () => {
        const properties = {
            foo: 'bar'
        };
        const body = {};
        expect(gapMatchMapper.mapProperties(properties, { body })).toMatchObject(
            Object.assign({}, properties, { cardinality: 'single' })
        );
    });
});
