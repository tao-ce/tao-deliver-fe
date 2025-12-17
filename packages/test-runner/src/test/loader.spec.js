// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { inject } from 'vitest';
import { importModule } from '../loader.js';
import glob from 'glob';

describe('importModule', () => {
    it.each([
        ['taoQtiNuiTest/runner/qti', 'qtinui'],
        ['taoQtiNuiTest/runner/qtiExport', 'qtinuiExport'],
        ['taoQtiNuiTest/runner/qtiReview', 'qtinui'],
        ['taoQtiNuiTest/runner/proxy/actionProxy', 'actions-proxy'],
        ['taoQtiNuiTest/runner/proxy/preloadProxy', 'preload-actions-proxy'],
        ['taoQtiNuiTest/runner/proxy/reviewProxy', 'review-proxy']
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
        const testRunnerSrcPath = 'packages/test-runner/src';
        const testRunnerSrcAlias = 'taoQtiNuiTest';

        // glob works relative to command execution directory, not this file.
        const pluginPaths = glob
            .sync(`${testRunnerSrcPath}/runner/plugins/**/plugin.js`)
            .map(pluginPath => pluginPath.replace(testRunnerSrcPath, testRunnerSrcAlias).replace(/\.js$/, ''));

        const moduleFns = await Promise.all(pluginPaths.map(pluginPath => importModule(pluginPath))).then(modules =>
            modules.map(module => module.default)
        );

        expect(moduleFns.every(moduleFn => typeof moduleFn === 'function')).toBe(true);
    });

    it('cannot load non-existent module', async () =>
        await expect(importModule('taoQtiNuiTest/runner/plugins/foo/bar/baz/qux/plugin')).rejects.toThrow());
});
