// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import blockPreRender from '../blockPreRender.js';
import { DivElement, SpanElement } from '../../../static';
import { decommentify } from '@/test-utils/helpers.js';

describe('Pre render a block tree', () => {
    it('Outputs HTML for simple block tree', () => {
        const output = blockPreRender([
            {
                type: 'html',
                content: '<div><span>foo</span></div>'
            }
        ]);
        expect(decommentify(output)).toMatchSnapshot();
    });

    it('Outputs text for simple block tree', () => {
        const output = blockPreRender([
            {
                type: 'text',
                content: 'Some text content'
            }
        ]);
        expect(decommentify(output)).toMatchSnapshot();
    });

    it('Outputs HTML for multi level block tree', () => {
        const output = blockPreRender([
            {
                type: 'container',
                content: 'div',
                component: DivElement,
                children: [
                    {
                        type: 'container',
                        content: 'span',
                        component: SpanElement,
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
                    attributes: {
                        id: 'best-foo',
                        class: 'container feedback',
                        'data-foo': 'bar',
                        role: 'foo'
                    }
                }
            }
        ]);
        expect(decommentify(output)).toMatchSnapshot();
    });
});
