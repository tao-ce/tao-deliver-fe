// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import Include from '../Include.svelte';
import itemsStateStore from '../../itemsStateStore.js';
import { EmElement, PElement, ImgElement } from '../index.js';
import IncludeWrapper from './IncludeWrapper.svelte';
import ContextWrapper from './ContextWrapper.svelte';

describe('Include', () => {
    afterEach(() => itemsStateStore.clear());

    it('renders without any content', () => {
        const { container } = render(Include, {
            props: {
                attributes: {}
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders with data-href', () => {
        const href = 'taomedia://mediamanager/http_2_tao12_0_local_1_first_0_rdf_3_i1550672688604730';
        const { container } = render(Include, {
            props: {
                attributes: {
                    href
                }
            }
        });
        expect(container.querySelector('article').dataset.href).toBe(href);
    });

    it('renders no data-href if href already present in itemContext hrefs', () => {
        const itemIdentifier = 'abc123';
        const hrefsInItem = ['taomedia://mediamanager/http_2_tao12_0_local_1_first_0_rdf_3_i1550672688604730'];
        const { container } = render(ContextWrapper, {
            props: {
                testComponent: Include,
                testComponentProps: {
                    itemIdentifier,
                    attributes: {
                        href: hrefsInItem[0]
                    }
                },
                testContextKey: itemIdentifier,
                testContext: {
                    getXIncludeHrefs: () => hrefsInItem
                }
            }
        });
        expect(container.querySelector('article').dataset).not.toHaveProperty('href');
    });

    it('renders with some content', () => {
        const { container } = render(Include, {
            props: {
                attributes: {
                    blockTree: [
                        {
                            type: 'container',
                            content: 'p',
                            component: PElement,
                            children: [
                                {
                                    type: 'container',
                                    content: 'em',
                                    component: EmElement,
                                    children: [
                                        {
                                            type: 'text',
                                            content: 'Hello here',
                                            children: [],
                                            props: {}
                                        },
                                        {
                                            type: 'element',
                                            content: 'img',
                                            component: ImgElement,
                                            children: [],
                                            props: {
                                                attributes: {
                                                    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                                                    alt: 'dummy'
                                                }
                                            }
                                        }
                                    ],
                                    props: {}
                                }
                            ],
                            props: {}
                        }
                    ]
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders with a scrollable content', () => {
        const { container } = render(Include, {
            props: {
                attributes: {
                    blockTree: [
                        {
                            type: 'html',
                            content: '<div>This <em>is</em> some much much longer content.</div>'
                        }
                    ],
                    class: 'tao-overflow-y'
                }
            }
        });
        expect(container).toMatchSnapshot();
        expect(container.querySelector('article').classList.contains('tao-overflow-y')).toBe(true);
    });

    it('restore scroll position content', () =>
        new Promise(done => {
            const { container } = render(IncludeWrapper, {
                props: {
                    testComponentProps: {
                        itemIdentifier: 'item2',
                        attributes: {
                            content: '<div><h1>One</h1><h2>Two</h2><p>some much much longer content.</p></div>',
                            href: 'passage123'
                        }
                    }
                }
            });
            itemsStateStore.set({
                passageScroll: {
                    passage123: 15
                }
            });
            const articleScrollParent = container.querySelector('.tao-overflow-y');
            articleScrollParent.scrollTo = vi.fn();
            expect(articleScrollParent.scrollTop).toBe(0);
            setTimeout(() => {
                expect(articleScrollParent.scrollTo).toHaveBeenCalledWith({
                    top: 15,
                    behavior: 'smooth'
                });
                done();
            }, 610);
        }));

    it('saves scroll position content', () =>
        new Promise(done => {
            const { container } = render(IncludeWrapper, {
                props: {
                    testComponentProps: {
                        itemIdentifier: 'item2',
                        attributes: {
                            content: '<div><h1>One</h1><h2>Two</h2><p>some much much longer content.</p></div>',
                            href: 'passage456'
                        }
                    }
                }
            });
            itemsStateStore.set({
                passageScroll: {}
            });
            const articleScrollParent = container.querySelector('.tao-overflow-y');

            const onChange = vi.fn();
            const unsubscribe = itemsStateStore.subscribe(onChange);

            articleScrollParent.scrollTo = vi.fn();

            setTimeout(() => {
                articleScrollParent.scrollTop = 7;
                articleScrollParent.dispatchEvent(new CustomEvent('scroll'));
                setTimeout(() => {
                    expect(onChange).toHaveBeenCalledWith({
                        passageScroll: {
                            passage456: 7
                        }
                    });
                    unsubscribe();
                    done();
                }, 510);
            }, 610);
        }));
});
