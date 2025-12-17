// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import path from 'path';
import alias from '@rollup/plugin-alias';
import copy from 'rollup-plugin-copy';
import wildcardExternal from '@oat-sa/rollup-plugin-wildcard-external';
import sharedConfig from '../../rollup-shared.config.js';

const rootDir = path.join(__dirname, '..', '..');
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const localModulesDir = path.join(__dirname, 'node_modules');

const external = ['module'];

export default [
    // ESM build
    {
        input: path.join(srcDir, 'index.js'),
        output: {
            dir: distDir,
            name: 'taoTestRunnerQtiNUI',
            format: 'es',
            entryFileNames: '[name].js',
            chunkFileNames: 'chunks/chunk-[name].js',
            inlineDynamicImports: false,
            sourcemap: true,
            globals: {
                'taoTests/runner/proxy': 'proxyFactory',
                'taoItems/runner/api/itemRunner': 'itemRunnerFactory',
                'core/timer': 'timer'
            }
        },
        preserveEntrySignatures: false,
        external,
        plugins: [
            wildcardExternal(['core/**', 'util/**', 'taoItems/**', 'taoTests/**']),
            alias({
                resolve: ['.js', '.json', '.css'],
                entries: {
                    taoDeliverAppsCommon: path.join(rootDir, 'packages', 'apps-common', 'src'),
                    taoQtiNuiItem: path.join(localModulesDir, '@oat-sa-private', 'tao-item-runner-qtinui', 'src'),
                    testRunnerDynamicModulesIndex: path.join(srcDir, 'dynamicModulesIndex.js')
                }
            }),
            copy({
                targets: [
                    {
                        src: [path.join(srcDir, 'runner', 'plugins', 'panel', 'a11y', 'themes')],
                        dest: distDir
                    }
                ]
            }),
            ...sharedConfig.plugins
        ],
        onwarn: sharedConfig.onwarn
    }
];
