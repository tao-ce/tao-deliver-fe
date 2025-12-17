// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { inject } from 'vitest';
import { importModule } from '../loader.js';
import glob from 'glob';

describe('importModule', () => {
    it.each([
        ['taoQtiNuiPreviewer/runner/qtiPreviewer', 'qtiPreviewer'],
        ['taoQtiNuiPreviewer/runner/proxy/previewerProxy', 'qtiPreviewerProxy']
    ])(
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

    // This next test dynamically "discovers" all src plugins, and checks loadability.
    it('loads all test runner plugins', async () => {
        const previewerSrcPath = 'packages/previewer-app/src';
        const previewerSrcAlias = 'taoQtiNuiPreviewer';

        // glob works relative to command execution directory, not this file.
        const pluginPaths = glob
            .sync(`${previewerSrcPath}/runner/plugins/**/plugin.js`)
            .map(pluginPath => pluginPath.replace(previewerSrcPath, previewerSrcAlias).replace(/\.js$/, ''));

        const moduleFns = await Promise.all(pluginPaths.map(pluginPath => importModule(pluginPath))).then(modules =>
            modules.map(module => module.default)
        );

        expect(moduleFns.every(moduleFn => typeof moduleFn === 'function')).toBe(true);
    });

    it('cannot load non-existent module', async () =>
        await expect(importModule('taoQtiNuiPreviewer/runner/plugins/foo/bar/plugin')).rejects.toThrow());
});
