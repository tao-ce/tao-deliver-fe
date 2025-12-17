// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import tableMapper from '../table.js';

describe('Table element mapper', () => {
    it('wraps body with placeholders into a table element', () => {
        const element = {
            qtiClass: 'table',
            attributes: {
                foo: true
            },
            body: {
                body: '<tbody><tr><td>foo</td><td>{{i5f55dfe2b800e}}</td></tr></tbody>'
            }
        };
        expect(tableMapper.mapElement(element)).toMatchObject({
            qtiClass: 'table',
            attributes: {
                foo: true
            },
            body: {
                body: '<table><tbody><tr><td>foo</td><td>{{i5f55dfe2b800e}}</td></tr></tbody></table>'
            }
        });
    });

    it('wraps body without placeholders into a table element', () => {
        const element = {
            qtiClass: 'table',
            attributes: {
                value: 12
            },
            body: {
                body: '<tbody><tr><td>foo</td><td>bar</td></tr></tbody>'
            }
        };
        expect(tableMapper.mapElement(element)).toMatchObject({
            qtiClass: 'table',
            attributes: {
                value: 12
            },
            body: {
                body: '<table><tbody><tr><td>foo</td><td>bar</td></tr></tbody></table>'
            }
        });
    });

    it('unwraps the blockTree if wrapped in a table', () => {
        const children = [
            {
                type: 'html',
                content: '<tbody><tr><td>foo</td><td>bar</td></tr></tbody>'
            }
        ];
        const properties = {
            blockTree: [
                {
                    type: 'container',
                    content: 'table',
                    children
                }
            ]
        };
        expect(tableMapper.mapProperties(properties)).toMatchObject({
            blockTree: children
        });
    });
});
