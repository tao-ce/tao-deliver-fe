// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { htmlAttributes } from '../attributes.js';

describe('getRenderedAttributes', () => {
    test.each([
        [{}, void 0, {}],
        [{ foo: 'bar' }, [], {}],
        [{ foo: 'bar', id: '123' }, [], { id: '123' }],
        [
            { foo: 'bar', id: '123', class: 'container foo', role: 'application' },
            [],
            { id: '123', class: 'container foo', role: 'application' }
        ],
        [{ foo: 'bar', 'aria-label': 'foo', 'data-foo': 12 }, [], { 'aria-label': 'foo', 'data-foo': 12 }],
        [{ 'aria-hidden': true, style: 'visibility: hidden' }, [], { 'aria-hidden': true }],
        [{ 'data-hidden': true, data: 'foo' }, [], { 'data-hidden': true }],
        [
            { foo: 'bar', id: '123', class: 'container foo', dir: 'rtl', lang: 'ar-AR' },
            ['class', 'id'],
            { dir: 'rtl', lang: 'ar-AR' }
        ]
    ])('filters out non HTML attributes', (attributes, excludes, expected) => {
        expect(htmlAttributes(attributes, excludes)).toEqual(expected);
    });
});
