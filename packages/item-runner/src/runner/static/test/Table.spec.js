// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import Table from '../Table.svelte';
import TableUsingSlot from './TableUsingSlot.svelte';

describe('Table', () => {
    it('renders the provided table from blockTree', () => {
        const { container } = render(Table, {
            props: {
                attributes: {
                    blockTree: [
                        {
                            type: 'html',
                            content: '<caption>Sample</caption>'
                        },
                        {
                            type: 'html',
                            content: '<thead><tr><th>Col 1</th><th>Col 2</th></thead>'
                        },
                        {
                            type: 'html',
                            content: '<tbody><tr><td>Col 1</td><td>Col 2</td></tbody>'
                        }
                    ]
                }
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders without a blockTree by using its slot', () => {
        const { container } = render(TableUsingSlot, {
            props: {
                testComponentProps: {
                    attributes: {
                        class: 'funky-monkey'
                    }
                }
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders with "with-dropdown" class when has InlineChoice child', () => {
        const { container } = render(Table, {
            props: {
                attributes: {
                    blockTree: [
                        {
                            type: 'container',
                            content: 'tbody',
                            children: [
                                {
                                    type: 'container',
                                    content: 'tr',
                                    children: [
                                        {
                                            type: 'container',
                                            content: 'td',
                                            children: [
                                                {
                                                    type: 'element',
                                                    content: 'i5f55dfe2b8375',
                                                    children: [],
                                                    props: {
                                                        itemIdentifier: 'magicSquare',
                                                        responseIdentifier: 'RESPONSE_3',
                                                        shuffle: false,
                                                        required: false,
                                                        baseType: 'identifier',
                                                        cardinality: 'single',
                                                        choices: [
                                                            {
                                                                fixed: false,
                                                                showHide: 'show',
                                                                key: 'choice_1',
                                                                label: '27'
                                                            },
                                                            {
                                                                fixed: false,
                                                                showHide: 'show',
                                                                key: 'choice_2',
                                                                label: '29'
                                                            }
                                                        ],
                                                        dataAttrs: {
                                                            'data-qti-class': 'inlineChoiceInteraction',
                                                            'data-response-id': 'RESPONSE_3'
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        });

        expect(container.querySelector('.table-wrapper')).toHaveClass('with-dropdown');
    });
});
