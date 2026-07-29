// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import path from 'path';
import svelte from 'rollup-plugin-svelte';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import commonJs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';
import terser from '@rollup/plugin-terser';
import svg from 'rollup-plugin-svg';
import wildcardExternal from '@oat-sa/rollup-plugin-wildcard-external';
import sharedConfig from '../../rollup-shared.config.js';
import copy from 'rollup-plugin-copy';

const svelteConfig = require('../../svelte.config.js');
const postCssConfig = require('../../postcss.config.js');

const production = process.env.NODE_ENV === 'production';

const rootDir = path.join(__dirname, '..', '..');
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const sharedModulesDir = path.join(__dirname, '..', '..', 'node_modules');
const localModulesDir = path.join(__dirname, 'node_modules');

const external = ['module'];

export default [
    // AMD build
    {
        input: path.join(srcDir, 'all.js'),
        output: {
            format: 'amd',
            inlineDynamicImports: true,
            sourcemap: true,
            file: path.join(distDir, 'index.amd.js')
        },
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
            sharedConfig.plugins.find(plugin => plugin && plugin.name === 'node-resolve'),
            commonJs(),
            svelte(svelteConfig),
            babel({
                rootMode: 'upward',
                extensions: ['.js', '.mjs', '.html', '.svelte'],
                exclude: ['node_modules/mathjax/**'],
                babelHelpers: 'bundled'
            }),
            json(),
            svg(),
            postcss(postCssConfig),
            production &&
                terser({
                    ecma: 5,
                    compress: {
                        defaults: false
                    }
                }),
            copy({
                targets: [
                    {
                        src: [path.join(sharedModulesDir, 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')],
                        dest: distDir,
                        rename: () => 'pdf.worker.min.js'
                    }
                ]
            })
        ],
        onwarn: sharedConfig.onwarn
    }
];
