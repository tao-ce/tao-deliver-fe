// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { inject } from 'vitest';
import { importModule } from '../loader.js';

describe('importModule', () => {
    it.each([['taoQtiNuiItem/runner/qti', 'qtinui']])(
        'loads %s provider',
        (moduleName, expectedName) =>
            importModule(moduleName).then(module => {
                expect(module.default).toMatchObject({
                    name: expectedName,
                    init: expect.any(Function)
                });
            }),
        inject('LONG_TEST_TIMEOUT') // for slow-running test
    );

    it('cannot load non-existent module', async () =>
        await expect(importModule('taoQtiNuiItem/runner/foo/bar')).rejects.toThrow());
});
