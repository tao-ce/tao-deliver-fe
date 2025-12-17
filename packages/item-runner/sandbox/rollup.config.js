// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import path from 'path';
import wildcardExternal from '@oat-sa/rollup-plugin-wildcard-external';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import copy from 'rollup-plugin-copy';
import livereload from 'rollup-plugin-livereload';
import sharedConfig from '../../../rollup-shared.config.js';

const production = process.env.NODE_ENV === 'production';

const rootDir = path.join(__dirname, '..', '..', '..');
const mockDir = path.join(rootDir, '__mocks__');
const srcDir = path.join(__dirname, '..', 'src');
const outputDir = path.join(__dirname, 'dist');
const appsCommonSrcDir = path.join(rootDir, 'packages', 'apps-common', 'src');
const sharedModulesDir = path.join(rootDir, 'node_modules');
const localeModulesDir = path.join(__dirname, '..', 'node_modules');

export default {
    input: path.join(__dirname, 'app.js'),
    output: {
        dir: outputDir,
        name: 'taoItemRunnerQtiNUISandbox',
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/chunk-[name].js',
        manualChunks(id) {
            // For every messages.json, include locale name in chunk filename
            const langMatch = /locale[/|\\](.+)[/|\\]messages\.json/.exec(id);
            if (langMatch) {
                const language = langMatch[1] || 'unknown';
                return `messages-${language}`;
            }
            // Anything else here (dynamic imports we want to lazy load) will be chunked automatically
        },
        inlineDynamicImports: false,
        sourcemap: true
    },
    watch: {
        clearScreen: false
    },
    preserveEntrySignatures: false,
    plugins: [
        wildcardExternal([
            // Externalise some modules which are guaranteed not to be called
            'taoQtiNuiTest/**',
            'taoQtiNuiPreviewer/**'
        ]),
        alias({
            resolve: ['.js', '.json', '.css'],
            entries: {
                module: path.join(mockDir, 'module.js'),
                'core/moduleLoader': path.join(appsCommonSrcDir, 'core', 'moduleLoader.js'),
                context: path.join(mockDir, 'context.js'),
                core: path.join(localeModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'core'),
                util: path.join(localeModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'util'),
                taoDeliverAppsCommon: path.join(appsCommonSrcDir),
                taoItems: path.join(localeModulesDir, '@oat-sa', 'tao-item-runner', 'src'),
                taoQtiNuiItem: srcDir
            }
        }),
        ...sharedConfig.plugins,
        copy({
            targets: [
                {
                    src: [
                        path.join(sharedModulesDir, '@oat-sa-private', 'ui-identity', 'dist', 'fonts'),
                        path.join(sharedModulesDir, 'mathlive', 'dist', 'fonts'),
                        path.join(__dirname, '..', 'samples', 'assets')
                    ],
                    dest: __dirname
                },
                {
                    src: path.join(sharedModulesDir, 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
                    dest: outputDir,
                    rename: () => 'pdf.worker.min.js'
                }
            ]
        }),
        replace({
            preventAssignment: true,
            values: {
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
            }
        }),
        !production && livereload(outputDir)
    ],
    onwarn: sharedConfig.onwarn
};
