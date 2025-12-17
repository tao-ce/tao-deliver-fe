// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import path from 'path';
import copy from 'rollup-plugin-copy';
import alias from '@rollup/plugin-alias';
import del from 'rollup-plugin-delete';
import sharedConfig from '../../rollup-shared.config.js';

const rootDir = path.join(__dirname, '..', '..');
const mockDir = path.join(rootDir, '__mocks__');
const srcDir = path.join(__dirname, 'src');
const outputDir = path.join(__dirname, 'dist');
const appsCommonSrcDir = path.join(rootDir, 'packages', 'apps-common', 'src');
const sharedModulesDir = path.join(rootDir, 'node_modules');
const localModulesDir = path.join(__dirname, 'node_modules');

let extraPlugins = sharedConfig.plugins;

let plugins = [
    del({
        targets: [path.join(outputDir, '*.js*'), path.join(outputDir, 'chunks', '*.js*')]
    }),
    alias({
        resolve: ['.js', '.json', '.css', '.svelte'],
        entries: {
            async: path.join(localModulesDir, '@oat-sa-private', 'tao-test-runner-qtinui', 'node_modules', 'async'),
            'core/moduleLoader': path.join(appsCommonSrcDir, 'core', 'moduleLoader.js'),
            core: path.join(localModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'core'),
            util: path.join(localModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'util'),
            taoItems: path.join(localModulesDir, '@oat-sa', 'tao-item-runner', 'src'),
            'taoTests/runner': path.join(localModulesDir, '@oat-sa', 'tao-test-runner', 'src'),
            'taoQtiTest/runner': path.join(localModulesDir, '@oat-sa', 'tao-test-runner-qti', 'src'),
            taoDeliverAppsCommon: path.join(localModulesDir, '@oat-sa-private', 'tao-deliver-apps-common', 'src'),
            taoQtiNuiTest: path.join(localModulesDir, '@oat-sa-private', 'tao-test-runner-qtinui', 'src'),
            taoQtiNuiItem: path.join(localModulesDir, '@oat-sa-private', 'tao-item-runner-qtinui', 'src'),
            taoQtiNuiPreviewer: srcDir,

            // the dynamic modules entrypoint references all the overridable modules
            testRunnerDynamicModulesIndex: path.join(
                localModulesDir,
                '@oat-sa-private',
                'tao-test-runner-qtinui',
                'src',
                'dynamicModulesIndex.js'
            ),

            // replacement for module from tao-core js
            i18n: path.join(mockDir, 'i18n.js'),
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
                    path.join(srcDir, 'sw.js'),
                    path.join(sharedModulesDir, '@oat-sa-private', 'ui-identity', 'dist', 'fonts'),
                    path.join(sharedModulesDir, '@oat-sa-private', 'ui-identity', 'dist', 'main.css*'),
                    path.join(sharedModulesDir, 'mathlive', 'dist', 'fonts')
                ],
                dest: outputDir
            },
            {
                src: path.join(sharedModulesDir, 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
                dest: outputDir,
                rename: () => 'pdf.worker.min.js'
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
        chunkFileNames: 'chunks/chunk-[name].js',
        manualChunks(id) {
            // Goal is to create some chunks for lazy loading, but eliminate unnecessary chunks.

            // Don't chunk top-level dynamic imports
            if (!id.match(/node_modules/) || id.match(/@oat-sa\/tao/)) {
                return 'default';
            }
            // Don't chunk these specific modules either
            if (id.match(/core\/logger|runner\/plugins|previewerProxy|qtiPreviewer.js/)) {
                return 'default';
            }
            // Anything else here (dynamic imports we want to lazy load) will be chunked automatically
        },
        inlineDynamicImports: false,
        sourcemap: true
    },
    preserveEntrySignatures: false,
    watch: {
        clearScreen: false
    },
    plugins,
    onwarn: sharedConfig.onwarn
};
