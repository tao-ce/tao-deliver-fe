// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { compareResponseValues } from '../responseFileFormatHelper.js';

describe('storeFileFormatHelper', () => {
    const file1 = new File(['foo'], 'foo.txt', {
        type: 'text/plain'
    });
    const file2 = new File(['foo'], 'foo2.txt', {
        type: 'text/plain'
    });
    const file3 = new File(['foobar'], 'foo.txt', {
        type: 'text/plain'
    });
    // Test basic cases first
    it('should handle null values', () => {
        expect(compareResponseValues(null, null)).toBe(true);
        expect(compareResponseValues({}, null)).toBe(false);
        expect(compareResponseValues({}, {})).toBe(true);
    });

    it('should handle simple object comparisons', () => {
        expect(compareResponseValues({ foo: 'bar' }, { baz: 2 })).toBe(true);
        expect(compareResponseValues({ name: 'foo' }, { name: 'bar' })).toBe(false);
        expect(compareResponseValues({ mime: 'foo' }, { mime: 'bar' })).toBe(false);
        expect(compareResponseValues({ name: 'foo', mime: 'foo' }, { name: 'foo', mime: 'foo' })).toBe(true);
        expect(compareResponseValues({ name: 'foo', mime: 'foo' }, { name: 'foo', mime: 'foo/*' })).toBe(false);
    });

    it('should handle file comparisons', () => {
        expect(
            compareResponseValues({ name: 'foo', mime: 'foo', data: file1 }, { name: 'foo', mime: 'foo', data: file1 })
        ).toBe(true);

        expect(
            compareResponseValues(
                { name: 'foo', mime: 'text/plain', data: file1 },
                { name: 'foo', mime: 'text/plain', data: file2 }
            )
        ).toBe(false);

        expect(
            compareResponseValues(
                { name: 'foo', mime: 'text/plain', data: file1 },
                { name: 'foo', mime: 'text/plain', data: file3 }
            )
        ).toBe(false);
    });
});
