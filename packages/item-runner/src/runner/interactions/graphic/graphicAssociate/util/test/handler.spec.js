// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { handlersFactory } from '../handler.js';

describe('handlers', () => {
    it('test returns passed function by default', () => {
        const handler = handlersFactory();
        const fn = vi.fn();
        expect(handler(fn)).toEqual(fn);
    });
    it('test returns false if disabled param', () => {
        const handler = handlersFactory(true);
        const fn = vi.fn();
        expect(handler(fn)).toEqual(false);
    });
});
