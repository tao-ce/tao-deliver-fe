// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Dynamically import certain modules of this package
 *
 * @param {String} moduleName - the identifier that tells what module is to be imported
 * @returns {Promise} resolves with the imported module
 */
export function importModule(moduleName) {
    if (moduleName === 'taoQtiNuiItem/runner/qti') {
        return import('./runner/qti.js');
    }

    return Promise.reject(new Error(`Module "${moduleName}" not found`));
}
