// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import mathMapper from '../math.js';

describe('Math element properties mapper', () => {
    it('returns the input properties', () => {
        const properties = {
            foo: 'bar'
        };
        expect(mathMapper.mapProperties(properties)).toMatchObject(properties);
    });

    it('extends properties with mathML', () => {
        const properties = {
            foo: 'bar'
        };
        const mathML = '<mrow></mrow>';
        expect(mathMapper.mapProperties(properties, { mathML })).toMatchObject(
            Object.assign({}, properties, { mathML })
        );
    });

    it('does not fail on wrongly serialized empty PHP object', () => {
        const properties = []; // PHP serializes empty named array to empty array
        const mathML = '<m></m>';
        expect(mathMapper.mapProperties(properties, { mathML })).toMatchObject({ mathML });
    });
});
