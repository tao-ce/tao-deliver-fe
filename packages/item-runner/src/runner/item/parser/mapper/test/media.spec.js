// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import mediaMapper from '../media.js';

describe('Media element properties mapper', () => {
    it('returns the input properties', () => {
        const properties = {
            foo: 'bar'
        };
        expect(mediaMapper.mapProperties(properties)).toMatchObject(properties);
    });

    it('extends properties with object.attributes', () => {
        const properties = {
            foo: 'bar'
        };
        const attributes = {
            data: 'media.mp4',
            width: 123
        };
        expect(mediaMapper.mapProperties(properties, { object: { attributes } })).toMatchObject(
            Object.assign({}, properties, attributes)
        );
    });

    it('it keeps properties if attributes is not defined', () => {
        const properties = { id: 12 };
        expect(mediaMapper.mapProperties(properties, { object: {} })).toMatchObject(properties);
    });

    it('does not fail on wrongly serialized empty PHP object', () => {
        const properties = []; // PHP serializes empty named array to empty array
        const attributes = { data: 'video.mp4' };
        expect(mediaMapper.mapProperties(properties, { object: { attributes } })).toMatchObject(attributes);
    });
});
