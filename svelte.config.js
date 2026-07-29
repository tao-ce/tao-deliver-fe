// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const sveltePreprocess = require('svelte-preprocess');

module.exports = {
    compilerOptions: {
        dev: process.env.NODE_ENV !== 'production',
        compatibility: {
            /**
             * Allows all the project's components to continue using Svelte 4 syntax:
             * - $on, $set, $destroy methods
             * - <slot>
             *
             * @see https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes
             * for when we are ready to delete this and move to Svelte 5 syntax
             */
            componentApi: 4
        }
    },
    onwarn: (warning, handler) => {
        // for debugging:
        // if (warning.code === 'a11y_consider_explicit_label') return;
        // if (warning.code === 'a11y_no_noninteractive_element_interactions') return;
        // if (warning.code === 'a11y_no_static_element_interactions') return;
        //if (warning.code === 'element_invalid_self_closing_tag') return;
        handler(warning);
    },
    preprocess: sveltePreprocess({
        postcss: true
    })
};
