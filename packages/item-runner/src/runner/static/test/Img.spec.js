// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import Img from '../Img.svelte';
import ContextWrapper from './ContextWrapper.svelte';

describe('Img', () => {
    it('renders correctly with no props', () => {
        const { container } = render(Img, { props: {} });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with src and alt and data-serial', () => {
        const { container } = render(Img, {
            props: {
                attributes: {
                    src: 'assets/cat.png',
                    alt: 'cute cate',
                    dataAttrs: {
                        'data-serial': '123'
                    }
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('loads the item context', () => {
        const getAssetManager = vi.fn();
        const registerLoadingElement = vi.fn();
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item2',
                testContext: {
                    getAssetManager,
                    registerLoadingElement,
                    getWritingMode: vi.fn()
                },
                testComponent: Img,
                testComponentProps: {
                    itemIdentifier: 'item2',
                    attributes: {
                        src: 'assets/hamster.png',
                        alt: 'cute hamster'
                    }
                }
            }
        });
        expect(getAssetManager).toHaveBeenCalled();
        expect(registerLoadingElement).toHaveBeenCalled();
        expect(container).toMatchSnapshot();
    });

    it('resolves image src through the asset manager', () => {
        const getAssetManager = vi.fn(() => ({
            resolve() {
                return 'http://localhost/assets/pig.png';
            }
        }));
        const registerLoadingElement = vi.fn();
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item3',
                testContext: {
                    getAssetManager,
                    registerLoadingElement,
                    getWritingMode: vi.fn()
                },
                testComponent: Img,
                testComponentProps: {
                    itemIdentifier: 'item3',
                    attributes: {
                        src: 'pig.png'
                    }
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('registers a loading promise function that resolves on image load', () => {
        const getAssetManager = vi.fn();
        let loading;
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item4',
                testContext: {
                    getAssetManager,
                    registerLoadingElement(loadingPromise) {
                        loading = loadingPromise;
                    },
                    getWritingMode: vi.fn()
                },
                testComponent: Img,
                testComponentProps: {
                    itemIdentifier: 'item4',
                    attributes: {
                        src: 'owl.png'
                    }
                }
            }
        });

        expect(typeof loading).toBe('function');
        const loadingPromise = loading();
        expect(loadingPromise).toBeInstanceOf(Promise);

        //the loading promise will resolve only on load
        fireEvent.load(container.querySelector('img'));

        return loadingPromise;
    });

    it('registers a loading promise function that resolves on image error', () => {
        const getAssetManager = vi.fn();
        let loading;
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item5',
                testContext: {
                    getAssetManager,
                    registerLoadingElement(loadingPromise) {
                        loading = loadingPromise;
                    },
                    getWritingMode: vi.fn()
                },
                testComponent: Img,
                testComponentProps: {
                    itemIdentifier: 'item5',
                    attributes: {
                        src: 'bat.png'
                    }
                }
            }
        });

        expect(typeof loading).toBe('function');
        const loadingPromise = loading();
        expect(loadingPromise).toBeInstanceOf(Promise);

        //the loading promise will resolve only on load
        fireEvent.error(container.querySelector('img'));

        return loadingPromise;
    });

    test.each([
        ['', { w: '100%', h: void 0 }, { w: '100%', h: null }],
        ['', { w: '50px', h: '30px' }, { w: '50px', h: '30px' }],
        ['vertical-rl', { w: '100%', h: void 0 }, { w: null, h: '100%' }],
        ['vertical-rl', { w: '50px', h: '30px' }, { w: '50px', h: '30px' }],
        ['vertical-rl', { w: '100%', h: '30px' }, { w: '100%', h: '30px' }]
    ])('applies width and height attributes, if writing-mode %s', (writingMode, sizeAttrs, sizeStyle) => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey: 'item2',
                testContext: {
                    getAssetManager: vi.fn(),
                    registerLoadingElement: vi.fn(),
                    getWritingMode: vi.fn().mockReturnValue(writingMode)
                },
                testComponent: Img,
                testComponentProps: {
                    itemIdentifier: 'item2',
                    attributes: {
                        src: 'assets/hamster.png',
                        alt: 'cute hamster',
                        width: sizeAttrs.w,
                        height: sizeAttrs.h
                    }
                }
            }
        });
        expect(container.querySelector('img').getAttribute('width')).toBe(sizeStyle.w);
        expect(container.querySelector('img').getAttribute('height')).toBe(sizeStyle.h);
    });
});
