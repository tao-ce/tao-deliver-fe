// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Dynamically import any plugin belonging to this package
 *
 * The resolution of imports during bundling is handled by @rollup/plugin-dynamic-import-vars
 * which makes some restrictions on the use of aliases, subpaths and file extensions
 * @see https://www.npmjs.com/package/@rollup/plugin-dynamic-import-vars
 *
 * @param {String} moduleName - the identifier that tells what module is to be imported
 * @returns {Promise} resolves with the imported module
 */
function importPlugin(moduleName) {
    const subdirMatches = moduleName.match(
        /^taoQtiNuiPreviewer\/runner\/plugins\/([a-zA-Z0-9/]+)\/plugin$/
    );

    if (subdirMatches) {
        const subdirs = subdirMatches[1].split('/');
        if (subdirs.length === 1) {
            return import(
                `./runner/plugins/${subdirs[0]}/plugin.js`
            );
        }
    }

    return Promise.reject(new Error(`Plugin "${moduleName}" not found`));
}

/**
 * Dynamically import certain modules of this package
 *
 * @param {String} moduleName - the identifier that tells what module is to be imported
 * @returns {Promise} resolves with the imported module
 */
export function importModule(moduleName) {
    if (moduleName.startsWith('taoQtiNuiPreviewer/runner/plugins/')) {
        return importPlugin(moduleName);
    }

    switch (moduleName) {
        case 'taoQtiNuiPreviewer/runner/qtiPreviewer':
            return import('./runner/qtiPreviewer.js');

        case 'taoQtiNuiPreviewer/runner/proxy/previewerProxy':
            return import('./runner/proxy/previewerProxy.js');
    }

    return Promise.reject(new Error(`Module "${moduleName}" not found`));
}
