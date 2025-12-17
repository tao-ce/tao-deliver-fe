// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import path from 'path';
import alias from '@rollup/plugin-alias';
import sharedConfig from '../../rollup-shared.config.js';

const rootDir = path.join(__dirname, '..', '..');
const mockDir = path.join(rootDir, '__mocks__');
const srcDir = path.join(__dirname, 'src');
const nodeModulesDir = path.join(__dirname, 'node_modules');

export default {
    input: path.join(srcDir, 'index.js'),
    output: {
        dir: path.join(__dirname, 'dist'),
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/chunk-[name].js',
        name: 'taoItemRunnerQtiNUI',
        inlineDynamicImports: false,
        sourcemap: true
    },
    external: ['module', 'core/moduleLoader'],
    plugins: [
        alias({
            resolve: ['.js', '.json', '.css'],
            entries: {
                context: path.join(mockDir, 'context.js'),
                core: path.join(nodeModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'core'),
                util: path.join(nodeModulesDir, '@oat-sa', 'tao-core-sdk', 'src', 'util'),
                taoItems: path.join(nodeModulesDir, '@oat-sa', 'tao-item-runner', 'src'),
                taoDeliverAppsCommon: path.join(rootDir, 'packages', 'apps-common', 'src'),
                testRunnerDynamicModulesIndex: path.join(
                    nodeModulesDir,
                    '@oat-sa-private',
                    'tao-test-runner-qtinui',
                    'src',
                    'dynamicModulesIndex.js'
                )
            }
        }),
        ...sharedConfig.plugins
    ],
    onwarn: sharedConfig.onwarn
};
