// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const vitestSnapshotClassName = 'vitest-snapshot';

export default defineConfig(async () => {
    // Dynamic import for ESM-only package
    const { svelte } = await import('@sveltejs/vite-plugin-svelte');
    const { svelteTesting } = await import('@testing-library/svelte/vite');
    const { default: sveltePreprocess } = await import('svelte-preprocess');

    // Load your existing svelte config
    const svelteConfig = {
        compilerOptions: {
            dev: process.env.NODE_ENV !== 'production'
        },
        preprocess: sveltePreprocess({
            postcss: true
        })
    };

    return {
        plugins: [
            svelte({
                ...svelteConfig,
                // override svelte's compilerOptions.cssHash for cleaner test snapshots
                dynamicCompileOptions() {
                    return (
                        process.env.VITEST && {
                            cssHash: () => vitestSnapshotClassName
                        }
                    );
                },
                onwarn: (warning, handler) => {
                    if (warning.code === 'vite-plugin-svelte-preprocess-many-dependencies') return;
                    // let vite handle all other warnings normally
                    handler(warning);
                }
            }),
            svelteTesting()
        ],
        test: {
            globals: true,
            watch: process.env.VITEST_WATCH === 'true',
            environment: 'jsdom',
            setupFiles: [
                path.resolve(__dirname, './vitest.setup.js'),
                'jsdom-worker' // provides URL.createObjectURL implementation
            ],
            include: ['src/**/*.spec.js'],
            pool: 'threads',
            sequence: {
                hooks: 'list' // makes beforeAll, beforeEach, afterEach, afterAll hooks run in sequence not in parallel
            },
            exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**'],
            server: {
                deps: {
                    inline: [/lodash/, /@oat-sa-private/],
                    external: ['module']
                }
            },
            expect: {
                requireAssertions: true
            },
            passWithNoTests: true,
            reporters: ['default'], // also nice: default, verbose, dot
            deps: {
                moduleDirectories: ['/node_modules/', 'core/store']
            },
            coverage: {
                reportsDirectory: '.coverage',
                all: false,
                exclude: ['**/dist/**', '**/sandbox/**', '__mocks__', ...coverageConfigDefaults.exclude]
            },
            provide: {
                LONG_TEST_TIMEOUT: process.env.LONG_TEST_TIMEOUT ? parseInt(process.env.LONG_TEST_TIMEOUT) : 30000
            },
            snapshotSerializers: [path.resolve(__dirname, './vitest-custom-domelement-serializer.js')]
        },
        resolve: {
            // prettier-ignore
            alias: [
                { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, './src/$1') },
                { find: /^lodash\/(.*)$/, replacement: path.resolve(__dirname, './node_modules/lodash/$1.js') },
                { find: 'lodash', replacement: path.resolve(__dirname, './node_modules/lodash/index.js') },
                { find: /^@oat-sa-private\/ui-core\/(.*)$/, replacement: path.resolve(__dirname, './node_modules/@oat-sa-private/ui-core/$1') },
                { find: /^@oat-sa-private\/ui-components\/(.*)$/, replacement: path.resolve(__dirname, './node_modules/@oat-sa-private/ui-components/$1') },
                { find: '@oat-sa-private/ui-core', replacement: path.resolve(__dirname, './node_modules/@oat-sa-private/ui-core/index.js') },
                { find: '@oat-sa-private/ui-components', replacement: path.resolve(__dirname, './node_modules/@oat-sa-private/ui-components/index.js') },

                // Mocks
                { find: 'context', replacement: path.resolve(__dirname, './__mocks__/context.js') },
                { find: 'module', replacement: path.resolve(__dirname, './__mocks__/module.js') },
                { find: 'config', replacement: path.resolve(__dirname, './__mocks__/config.js') },
                { find: 'core/digest', replacement: path.resolve(__dirname, './__mocks__/core/digest.js') },

                // TAO aliases
                { find: /^taoTests\/runner\/(.*)$/, replacement: path.resolve(__dirname, './packages/test-runner/node_modules/@oat-sa/tao-test-runner/src/$1') },
                { find: /^taoItems\/(.*)$/, replacement: path.resolve(__dirname, './packages/item-runner/node_modules/@oat-sa/tao-item-runner/src/$1') },
                { find: /^taoDeliverAppsCommon\/(.*)$/, replacement: path.resolve(__dirname, './packages/apps-common/src/$1') },
                { find: /^taoQtiNuiTest\/(.*)$/, replacement: path.resolve(__dirname, './packages/test-runner/src/$1') },
                { find: /^taoQtiNuiItem\/(.*)$/, replacement: path.resolve(__dirname, './packages/item-runner/src/$1') },
                { find: 'testRunnerDynamicModulesIndex', replacement: path.resolve(__dirname, './packages/test-runner/src/dynamicModulesIndex.js') },
                { find: /^taoQtiNuiPreviewer\/(.*)$/, replacement: path.resolve(__dirname, './packages/previewer-app/src/$1') },
                { find: /^core\/(.*)$/, replacement: path.resolve(__dirname, './node_modules/@oat-sa/tao-core-sdk/src/core/$1') },
                { find: /^util\/(.*)$/, replacement: path.resolve(__dirname, './node_modules/@oat-sa/tao-core-sdk/src/util/$1') },
                { find: 'jquery', replacement: path.resolve(__dirname, './packages/test-runner/node_modules/jquery/dist/jquery.js') }
            ],
            conditions: ['svelte', 'browser']
        },
        css: {
            postcss: path.resolve(__dirname, './postcss.config.js')
        },
        server: {
            fs: {
                allow: ['.']
            }
        }
    };
});
