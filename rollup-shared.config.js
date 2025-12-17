// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import fs from 'fs';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import commonJs from '@rollup/plugin-commonjs';
import dynamicImportVariables from '@rollup/plugin-dynamic-import-vars';
import { terser } from 'rollup-plugin-terser';
import svg from 'rollup-plugin-svg';
import visualizer from 'rollup-plugin-visualizer';

/**
 * Expose shared configuration for packages builds
 */
const rootPath = process.env.LERNA_ROOT_PATH || path.resolve('../../');
const svelteConfig = require(path.join(rootPath, 'svelte.config.js'));
const postCssConfig = require(path.join(rootPath, 'postcss.config.js'));

const production = process.env.NODE_ENV === 'production';
const buildReport = process.env.BUILDREPORT;

const ckModules = fs
    .readdirSync(path.join(rootPath, 'node_modules', '@ckeditor'))
    .map(moduleName => `@ckeditor/${moduleName}`);

//resolves and collect files for bundling
export const parsingPlugins = [
    resolve({
        exportConditions: ['svelte'],
        mainFields: ['svelte', 'module', 'main', 'browser'],
        extensions: ['.svelte', '.js', '.css'],
        dedupe: [
            'svelte',
            'lodash',
            '@oat-sa-private/ui-core',
            '@oat-sa-private/ui-identity',
            '@oat-sa-private/ui-elements',
            '@oat-sa-private/ui-components',
            ...ckModules
        ]
    }),
    commonJs(),
    postcss(postCssConfig)
];

//compile into bundle
export const compilingPlugins = [
    svelte(svelteConfig),
    babel({
        rootMode: 'upward',
        extensions: ['.js', '.mjs', '.html', '.svelte'],
        exclude: /node_modules[/\\](?!(svelte|@ckeditor|@oat-sa|@oat-sa-private|pdfjs-dist)[/\\]).*/,
        babelHelpers: 'bundled'
    }),
    json({
        namedExports: false
    }),
    svg(),
    dynamicImportVariables({
        exclude: ['**/node_modules/pdfjs-dist/**']
    }),
    production && terser(),
    buildReport &&
        visualizer({
            open: true,
            gzipSize: true,
            filename: 'stats.html'
        })
];

/**
 * Rollup configuration shared by all build configs
 */
export default {
    //shared plugins (be careful, aliasing should be done first)
    plugins: [...parsingPlugins, ...compilingPlugins],
    //shared warning handler
    onwarn(warning, next) {
        // Silence circular dependency warning for ckeditor package
        if (
            warning.code === 'CIRCULAR_DEPENDENCY' &&
            (warning.importer.includes(path.normalize('node_modules/@ckeditor')) ||
                warning.importer.includes(path.normalize('node_modules/@svgdotjs')))
        ) {
            return;
        }
        // Silence flatpickr warning: "`this` has been rewritten to `undefined`"
        if (warning.code === 'THIS_IS_UNDEFINED' && warning.id.includes('flatpickr')) {
            return;
        }
        // Silence pdf.js warning: "Use of eval is strongly discouraged"
        if (warning.code === 'EVAL' && warning.id.includes('pdf.js')) {
            return;
        }

        // keep original warning handle
        next(warning);
    }
};
