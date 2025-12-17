// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import choiceMapper from '../choice.js';
import Img from '../../../../static/Img.svelte';

describe('Choice interaction properties mapper', () => {
    it('returns the input properties', () => {
        const sample = {
            foo: 'bar'
        };
        expect(choiceMapper.mapChoiceProperties(sample)).toEqual(sample);
    });

    it('the choice identifier is mapped to key, and content to label', () => {
        expect(
            choiceMapper.mapChoiceProperties({
                identifier: 'choice1',
                content: 'First choice'
            })
        ).toEqual({
            key: 'choice1',
            label: 'First choice'
        });
    });

    it('empty choice content is mapped to empty label', () => {
        expect(
            choiceMapper.mapChoiceProperties({
                identifier: 'choice1',
                content: ''
            })
        ).toEqual({
            key: 'choice1',
            label: ''
        });
    });

    it('keeps the blockTree after parsing', () => {
        expect(
            choiceMapper.mapChoiceProperties({
                content: 'First choice',
                blockTree: [
                    {
                        type: 'html',
                        content: '<strong>First choice</strong>'
                    }
                ]
            })
        ).toEqual({
            label: 'First choice',
            blockTree: [
                {
                    content: '<strong>First choice</strong>',
                    type: 'html'
                }
            ]
        });
    });

    it('extract images and replace the label', () => {
        const blockTree = [
            {
                type: 'element',
                content: 'img_12345',
                component: Img,
                props: {
                    attributes: {
                        src: 'foo.png',
                        alt: 'Foo'
                    }
                }
            }
        ];
        expect(
            choiceMapper.mapChoiceProperties({
                content: '<img src="foo.png" alt="Foo" />',
                blockTree
            })
        ).toEqual({
            label: false,
            image: {
                src: 'foo.png',
                alt: 'Foo'
            },
            blockTree
        });
    });

    it('extract one image, if surrunded by empty text', () => {
        const blockTree = [
            {
                type: 'text',
                content: '\n     '
            },
            {
                type: 'element',
                content: 'img_12345',
                component: Img,
                props: {
                    attributes: {
                        src: 'bar.png',
                        alt: 'Bar'
                    }
                }
            },
            {
                type: 'text',
                content: '\n    \n'
            }
        ];
        expect(
            choiceMapper.mapChoiceProperties({
                content: '<img src="bar.png" alt="Bar" />',
                blockTree
            })
        ).toEqual({
            label: false,
            image: {
                src: 'bar.png',
                alt: 'Bar'
            },
            blockTree
        });
    });

    it('extract one image and sibling text', () => {
        const blockTree = [
            {
                type: 'text',
                content: '\n     '
            },
            {
                type: 'element',
                content: 'img_12345',
                component: Img,
                props: {
                    attributes: {
                        src: 'yoo.png',
                        alt: 'Yoo'
                    }
                }
            },
            {
                type: 'text',
                content: 'Best yoo ever'
            }
        ];
        expect(
            choiceMapper.mapChoiceProperties({
                content: '<img src="yoo.png" alt="Yoo" />',
                blockTree
            })
        ).toEqual({
            label: 'Best yoo ever',
            image: {
                src: 'yoo.png',
                alt: 'Yoo'
            },
            blockTree
        });
    });

    it('extract one image and sibling texts', () => {
        const blockTree = [
            {
                type: 'text',
                content: 'Best'
            },
            {
                type: 'element',
                content: 'img_12345',
                component: Img,
                props: {
                    attributes: {
                        src: 'yoo2.png',
                        alt: 'Yoo2'
                    }
                }
            },
            {
                type: 'text',
                content: 'yoo2 ever'
            }
        ];
        expect(
            choiceMapper.mapChoiceProperties({
                content: '<img src="yoo2.png" alt="Yoo2" />',
                blockTree
            })
        ).toEqual({
            label: 'Best yoo2 ever',
            image: {
                src: 'yoo2.png',
                alt: 'Yoo2'
            },
            blockTree
        });
    });

    it('keeps the blockTree from complex tree', () => {
        const blockTree = [
            {
                type: 'container',
                content: 'p',
                children: [
                    {
                        type: 'element',
                        content: 'img_12345',
                        component: Img,
                        props: {
                            attributes: {
                                src: 'yoo.png',
                                alt: 'Yoo'
                            }
                        }
                    },
                    {
                        type: 'text',
                        content: 'yoo ever'
                    }
                ]
            }
        ];
        expect(
            choiceMapper.mapChoiceProperties({
                content: '<p><img src="yoo.png" alt="Yoo" /> yoo ever</p>',
                blockTree
            })
        ).toEqual({
            label: '<p><img src="yoo.png" alt="Yoo" /> yoo ever</p>',
            blockTree
        });
    });
});
