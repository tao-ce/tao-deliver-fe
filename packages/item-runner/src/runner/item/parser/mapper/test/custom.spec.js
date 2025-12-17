// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import customMapper from '../custom.js';

describe('Custom interaction properties mapper', () => {
    it('returns the input properties', () => {
        const properties = {
            foo: 'bar'
        };
        expect(customMapper.mapProperties(properties)).toMatchObject(properties);
    });

    it('extends properties', () => {
        const properties = {
            foo: 'bar'
        };
        expect(
            customMapper.mapProperties(properties, {
                typeIdentifier: 'fooPCI',
                version: '1.2.3',
                properties: { foo: 'bar', baz: 12 },
                markup: '<div class="foo"></div>'
            })
        ).toMatchObject({
            foo: 'bar',
            typeIdentifier: 'fooPCI',
            version: '1.2.3',
            properties: { foo: 'bar', baz: 12 },
            markup: '<div class="foo"></div>'
        });
    });

    it('does not fail on wrongly serialized empty PHP object', () => {
        const properties = []; // PHP serializes empty named array to empty array
        const typeIdentifier = 'foo';
        expect(customMapper.mapProperties(properties, { typeIdentifier })).toMatchObject({ typeIdentifier });
    });
});
