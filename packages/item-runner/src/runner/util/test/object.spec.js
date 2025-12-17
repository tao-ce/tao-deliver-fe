// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { get } from '../object';

describe('get', () => {
    const obj = {
        a: {
            b: {
                c: {
                    d: 42
                }
            }
        }
    };

    it('returns value of nested object', () => {
        expect(get(obj, 'a.b.c.d')).toEqual(42);
    });

    it('will not throw an error, if path is wrong', () => {
        expect(() => get(obj, 'a.b.wrongProperty.d')).not.toThrowError();
    });

    it('returns undefined if path is wrong', () => {
        expect(get(obj, 'a.b.wrongProperty.d')).toEqual(void 0);
    });

    it('returns default value if path is wrong', () => {
        const defaultValue = 1234;
        expect(get(obj, 'a.b.wrongProperty.d', defaultValue)).toEqual(defaultValue);
    });
});
