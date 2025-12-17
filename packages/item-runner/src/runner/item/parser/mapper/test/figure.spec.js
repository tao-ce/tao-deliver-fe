// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import figureMapper from '../figure.js';

describe('Figure element mapper', () => {
    it('returns input properties unchanged if no blockTree specified', () => {
        const properties = {
            content: '',
            class: 'foo'
        };
        const result = figureMapper.mapProperties(properties);
        expect(result).toMatchObject(properties);
    });

    it('returns input properties unchanged if no image in blockTree', () => {
        const properties = {
            content: '<figcaption>Deep sea fish</figcaption>',
            blockTree: [
                {
                    type: 'html',
                    content: '<figcaption>Deep sea fish</figcaption>'
                }
            ]
        };
        const element = {
            qtiClass: 'figure',
            attributes: {
            },
            body: {
                body: '<figcaption>Deep sea fish</figcaption>',
                elements: {}
            }
        };

        const result = figureMapper.mapProperties(properties, element);
        expect(result).toMatchObject(properties);
    });

    test.each([
        ['percent', '%', '%'],
        ['pixel', 'px', 'px'],
        ['absolute', '', 'px']
    ])('sets correct units width style of figure when child img has %s width', (title, xmlUnit, styleUnit) => {
        const properties = {
            content: '{{img_6e787172a58cf363394732f}}<figcaption>Deep sea fish</figcaption>',
            blockTree: [
                {
                    type: 'element',
                    content: 'img_6e787172a58cf363394732f',
                    children: [],
                    props: {
                        itemIdentifier: 'item-7',
                        attributes: {
                            src: 'Dagon2.jpg',
                            alt: 'A man facing Dagon',
                            width: `50${xmlUnit}`,
                            height: `20${xmlUnit}`,
                            type: 'image/jpeg'
                        }
                    }
                },
                {
                    type: 'html',
                    content: '<figcaption>Deep sea fish</figcaption>'
                }
            ],
            class: 'wrap-right'
        };
        const element = {
            qtiClass: 'figure',
            attributes: {
                classes: 'wrap-right'
            },
            body: {
                body: '{{img_6e787172a58cf363394732f}}<figcaption>Deep sea fish</figcaption>',
                elements: {
                    img_6e787172a58cf363394732f: {
                        serial: 'img_6e787172a58cf363394732f',
                        qtiClass: 'img',
                        attributes: {
                            src: 'Dagon2.jpg',
                            alt: 'A man facing Dagon',
                            width: `50${xmlUnit}`,
                            height: `20${xmlUnit}`,
                            type: 'image/jpeg'
                        }
                    }
                }
            }
        };

        const result = figureMapper.mapProperties(properties, element);

        expect(result.class).toBe('wrap-right');
        expect(result.imageElementWidth).toBe(`50${styleUnit}`);
        expect(result.imageElementHeight).toBe(`20${styleUnit}`);
        expect(result.blockTree[0].props.attributes.width).toBe('100%');
        expect(element.body.elements.img_6e787172a58cf363394732f.attributes.height).toBe(`20${xmlUnit}`);
    });

    it('sets auto-width class of figure when child img has no width', () => {
        const properties = {
            content: '{{img_6e787172a58cf363394732f}}<figcaption>Deep sea fish</figcaption>',
            blockTree: [
                {
                    type: 'element',
                    content: 'img_6e787172a58cf363394732f',
                    children: [],
                    props: {
                        itemIdentifier: 'item-7',
                        attributes: {
                            src: 'Dagon2.jpg',
                            alt: 'A man facing Dagon',
                            type: 'image/jpeg'
                        }
                    }
                },
                {
                    type: 'html',
                    content: '<figcaption>Deep sea fish</figcaption>'
                }
            ],
            class: 'wrap-left'
        };
        const element = {
            qtiClass: 'figure',
            attributes: {
                classes: 'wrap-left'
            },
            body: {
                body: '{{img_6e787172a58cf363394732f}}<figcaption>Deep sea fish</figcaption>',
                elements: {
                    img_6e787172a58cf363394732f: {
                        serial: 'img_6e787172a58cf363394732f',
                        qtiClass: 'img',
                        attributes: {
                            src: 'Dagon2.jpg',
                            alt: 'A man facing Dagon',
                            type: 'image/jpeg'
                        }
                    }
                }
            }
        };

        const result = figureMapper.mapProperties(properties, element);

        expect(result.class).toBe('wrap-left auto-width');
    });
});
