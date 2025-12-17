// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
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
const localeModulesDir = path.join(__dirname, 'node_modules');

let extraPlugins = sharedConfig.plugins;

if (typeof process.env.EXTRACT_TRANSLATION_KEYS !== 'undefined') {
    const i18nTool = i18n({
        exclude: ['**/node_modules/**'],
        include: ['**/@oat-sa-private/*/!(node_modules)/**', '**/@oat-sa/**'],
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
            async: path.join(localeModulesDir, '@oat-sa-private', 'tao-test-runner-qtinui', 'node_modules', 'async'),
            'core/moduleLoader': path.join(appsCommonSrcDir, 'core', 'moduleLoader.js'),
            core: path.join(localeModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'core'),
            util: path.join(localeModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'util'),
            taoItems: path.join(localeModulesDir, '@oat-sa', 'tao-item-runner', 'src'),
            'taoTests/runner': path.join(localeModulesDir, '@oat-sa', 'tao-test-runner', 'src'),
            taoDeliverAppsCommon: path.join(localeModulesDir, '@oat-sa-private', 'tao-deliver-apps-common', 'src'),
            taoQtiNuiPreviewer: path.join(rootDir, 'packages', 'previewer-app', 'src'),
            taoQtiNuiTest: path.join(localeModulesDir, '@oat-sa-private', 'tao-test-runner-qtinui', 'src'),
            taoQtiNuiItem: path.join(localeModulesDir, '@oat-sa-private', 'tao-item-runner-qtinui', 'src'),
            // the dynamic modules entrypoint references all the overridable modules
            testRunnerDynamicModulesIndex: path.join(
                localeModulesDir,
                '@oat-sa-private',
                'tao-test-runner-qtinui',
                'src',
                'dynamicModulesIndex.js'
            ),

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
                    path.join(
                        localeModulesDir,
                        '@oat-sa-private',
                        'tao-test-runner-qtinui',
                        'src',
                        'runner',
                        'plugins',
                        'panel',
                        'a11y',
                        'themes'
                    ),
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
            const matchPathList = pathes => id.match(new RegExp(pathes.join('|').replaceAll('/', '[/|\\\\]')));

            // A separate chunk for every messages.json
            const langMatch = /locale\/(.+)\/messages\.json/.exec(id);
            if (langMatch) {
                const language = langMatch[1] || 'unknown';
                return `messages-${language}`;
            }

            //Export mode launch chunk
            if (matchPathList(['qtiExport.js', 'runner/plugins/export/', 'node_modules/html-docx-js-typescript/'])) {
                return 'export';
            }

            // Don't chunk top-level dynamic imports
            if (!id.match(/node_modules/) || id.match(/@oat-sa\/tao/)) {
                return 'default';
            }
            // Don't chunk these specific modules either
            if (matchPathList(['core/logger', 'runner/plugins/', 'actionProxy', 'preloadProxy', 'qti.js'])) {
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
