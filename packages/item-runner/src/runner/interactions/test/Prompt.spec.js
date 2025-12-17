// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import Prompt from '../Prompt.svelte';
import { SectionElement, ArticleElement } from '../../static';
import ContextWrapper from '../../static/test/ContextWrapper.svelte';

describe('Prompt', () => {
    it('renders correctly with no props', () => {
        const { container } = render(Prompt, { props: {} });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with id prop', () => {
        const { container } = render(Prompt, { props: { id: 'someId' } });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with basic text', () => {
        const { container } = render(Prompt, {
            props: {
                blockTree: [{ type: 'text', content: 'Question 1' }]
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with html', () => {
        const { container } = render(Prompt, {
            props: {
                blockTree: [{ type: 'html', content: '<strong>Question 1</strong>' }]
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with a complex tree', () => {
        const { container } = render(Prompt, {
            props: {
                blockTree: [
                    {
                        type: 'container',
                        content: 'section',
                        component: SectionElement,
                        children: [
                            {
                                type: 'container',
                                content: 'article',
                                component: ArticleElement,
                                children: [
                                    {
                                        type: 'text',
                                        content: 'Hello tree',
                                        children: [],
                                        props: {}
                                    }
                                ],
                                props: {}
                            }
                        ],
                        props: {
                            id: 'best-foo',
                            class: 'container feedback',
                            'data-foo': 'bar',
                            role: 'foo'
                        }
                    }
                ]
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('styles prompt as header, if stylePromptAsHeader is true in the context', () => {
        const { container } = render(ContextWrapper, {
            props: {
                testContextKey2: 'itemRunnerConfig',
                testContext2: {
                    options: {
                        stylePromptAsHeader: true
                    }
                },
                testComponent: Prompt,
                testComponentProps: { blockTree: [{ type: 'text', content: 'Question 1' }] }
            }
        });

        expect(container.querySelector('.ui-heading-l')).not.toBeNull();
    });
});
