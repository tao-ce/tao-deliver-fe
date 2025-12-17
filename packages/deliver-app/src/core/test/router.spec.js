// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { inject } from 'vitest';
import router from '../router.js';

describe('router', () => {
    it('returns config', () => {
        expect(router.getConfig()).toMatchObject({
            locale: 'en-US',
            endpoints: expect.any(Object),
            runnerConfiguration: expect.any(Object)
        });
    });

    it.each(['/', '/error', '/thank-you'])(
        'imports route: %s',
        async route => {
            await expect(router.importController(route)).resolves.toBeDefined();
        },
        inject('LONG_TEST_TIMEOUT')
    ); // for slow-running test
});
