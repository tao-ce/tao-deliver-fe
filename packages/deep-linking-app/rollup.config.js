// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import path from 'path';
import copy from 'rollup-plugin-copy';
import alias from '@rollup/plugin-alias';
import i18n from '@oat-sa/tao-i18n-tools/src/rollup/i18n';
import del from 'rollup-plugin-delete';
import sharedConfig, { parsingPlugins, compilingPlugins } from '../../rollup-shared.config.js';

const rootDir = path.join(__dirname, '..', '..');
const mockDir = path.join(rootDir, '__mocks__');
const srcDir = path.join(__dirname, 'src');
const outputDir = path.join(__dirname, 'dist');
const appsCommonSrcDir = path.join(rootDir, 'packages', 'apps-common', 'src');
const sharedModulesDir = path.join(rootDir, 'node_modules');
const localModulesDir = path.join(__dirname, 'node_modules');

let extraPlugins = sharedConfig.plugins;

if (typeof process.env.EXTRACT_TRANSLATION_KEYS !== 'undefined') {
    const i18nTool = i18n({
        exclude: ['**/node_modules/**'],
        output: path.join(__dirname, 'locale', 'messages.pot')
    });
    //important that translation was inserted before any file compilation plugin
    extraPlugins = [...parsingPlugins, i18nTool, ...compilingPlugins];
}

let plugins = [
    del({
        targets: [path.join(outputDir, '*.js*'), path.join(outputDir, 'chunks', '*.js*')]
    }),
    alias({
        resolve: ['.js', '.json', '.css', '.svelte'],
        entries: {
            'core/moduleLoader': path.join(appsCommonSrcDir, 'core', 'moduleLoader.js'),
            core: path.join(localModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'core'),
            util: path.join(localModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'util'),
            taoDeliverAppsCommon: path.join(localModulesDir, '@oat-sa-private', 'tao-deliver-apps-common', 'src'),

            // these modules are required, but they won't be called, so they can be replaced with empty module
            module: path.join(mockDir, 'module.js'),
            moment: path.join(mockDir, 'module.js'),
            context: path.join(mockDir, 'module.js')
        }
    }),
    ...extraPlugins,
    copy({
        targets: [
            {
                src: [
                    path.join(appsCommonSrcDir, 'asset/*'),
                    path.join(srcDir, 'manifest.json'),
                    path.join(sharedModulesDir, '@oat-sa-private', 'ui-identity', 'dist', 'fonts'),
                    path.join(sharedModulesDir, '@oat-sa-private', 'ui-identity', 'dist', 'main.css*')
                ],
                dest: outputDir
            }
        ]
    })
];

export default {
    input: path.join(srcDir, 'index.js'),
    output: {
        dir: outputDir,
        format: 'es',
        entryFileNames: 'bundle.js',
        inlineDynamicImports: false,
        sourcemap: true
    },
    external: id => id.match(/^(ui\/|taoItems|taoTests|taoQtiNui|testRunnerDynamicModulesIndex)/),
    preserveEntrySignatures: false,
    watch: {
        clearScreen: false
    },
    plugins,
    onwarn: sharedConfig.onwarn
};
