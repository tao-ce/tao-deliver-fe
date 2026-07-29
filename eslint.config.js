// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
const { defineConfig, globalIgnores } = require('eslint/config');
const { default: configs } = require('@oat-sa/eslint-config-tao/flat/svelte');
const pluginCypress = require('eslint-plugin-cypress/flat');
const eslintConfigPrettier = require('eslint-config-prettier');
const svelteConfig = require('./svelte.config.js');

// config is now "flat", the recommended format for ESLint 9+
module.exports = defineConfig([
    {
        name: 'cypress',
        files: ['cypress/**/*.js'],
        plugins: {
            cypress: pluginCypress
        },
        extends: ['cypress/recommended'],
        rules: {
            // cypress errors -> off; re-evaluate if we start using Cypress again
            'cypress/unsafe-to-chain-command': 'off' // 39x
        }
    },
    ...configs['flat/svelte-base'],
    {
        ...configs['flat/vitest'][0],
        files: ['packages/**/*.spec.js'],
        rules: {
            ...configs['flat/vitest'][0].rules,
            // vitest errors -> off; we could just change flat/vitest
            'vitest/no-conditional-expect': 'off', // 108x
            'vitest/expect-expect': 'off' // 85x
        }
    },
    eslintConfigPrettier,
    {
        rules: {
            // better to keep as error and comment to disable it every time?
            'svelte/no-at-html-tags': 'warn', // 17x
            'svelte/valid-compile': 'warn', // 111x - specific rules can be ignored in svelte.config.js#onwarn

            // jsdoc warnings -> off; could be turned off in flat/svelte-base
            'jsdoc/require-param-description': 'off', // 1398x
            'jsdoc/require-property-description': 'off', // 237x
            'jsdoc/no-undefined-types': 'off', // 160x
            'jsdoc/no-defaults': 'off', // 65x
            'jsdoc/check-tag-names': 'off' // 15x
        }
    },
    {
        files: ['**/*.svelte', '*.svelte'],
        languageOptions: {
            parserOptions: {
                svelteConfig: svelteConfig
            }
        }
    },
    globalIgnores(['**/node_modules/*', '**/dist/*', 'packages/*/sandbox/assets', '**/*.min.js', '**/*.snap', '**/.*']),
]);
