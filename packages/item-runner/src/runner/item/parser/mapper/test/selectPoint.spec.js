// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import mapper from '../selectPoint.js';

describe('selectPoint mapper', () => {
    describe('mapProperties', () => {
        it('work with empty params', () => {
            expect(mapper.mapProperties({})).toEqual({});
        });

        it('maps object to imgObject', () => {
            const props = {
                object: {
                    foo: 'bar'
                }
            };
            const result = mapper.mapProperties(props);

            expect(result.imgObject).toStrictEqual({ foo: 'bar' });
            expect(result.object).toBeUndefined();
        });
    });
});
