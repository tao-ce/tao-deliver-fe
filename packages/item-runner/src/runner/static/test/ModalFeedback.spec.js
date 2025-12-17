// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { render } from '@testing-library/svelte';
import ModalFeedback from '../ModalFeedback.svelte';
import { DivElement } from '../index.js';

describe('ModalFeedback', () => {
    it('renders positive style; title and no content', () => {
        const { container } = render(ModalFeedback, {
            props: {
                attributes: {
                    title: 'Good title',
                    styleClass: 'x-tao-modalFeedback-positive',
                    blockTree: [
                        {
                            type: 'html',
                            content: '<div class="x-tao-wrapper x-tao-relatedOutcome-RESPONSE_1"></div>'
                        }
                    ]
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders negative style; no title and text content', () => {
        const { container } = render(ModalFeedback, {
            props: {
                attributes: {
                    title: '',
                    styleClass: 'x-tao-modalFeedback-negative',
                    blockTree: [
                        {
                            type: 'html',
                            content:
                                '<div class="x-tao-wrapper x-tao-modalFeedback-positive x-tao-relatedOutcome-RESPONSE_1">Bad content</div>'
                        }
                    ]
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders neutral style; title and complex content', () => {
        const { container } = render(ModalFeedback, {
            props: {
                attributes: {
                    title: 'Neutral title',
                    styleClass: void 0,
                    blockTree: [
                        {
                            type: 'container',
                            content: 'div',
                            component: DivElement,
                            children: [
                                {
                                    type: 'text',
                                    content: 'Neutral content'
                                }
                            ],
                            props: {
                                attributes: {
                                    class: 'x-tao-wrapper x-tao-relatedOutcome-RESPONSE'
                                },
                                itemIdentifier: 'item-1'
                            }
                        }
                    ]
                }
            }
        });
        expect(container).toMatchSnapshot();
    });
});
