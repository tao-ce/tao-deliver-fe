// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Get the configured asset manager factory
 *
 */
import assetManagerFactory from '@oat-sa-private/tao-item-runner-qtinui/src/runner/asset/assetManager.js';

//keep reference per test id
const assetManagers = {};

/**
 * Gives access to a configured assetManagerFactory
 * @param {string} testId - a unique identifier for the test instance
 * @param {Object} [options] - options for the asset manager
 * @param {string} [options.staticUrl] - URL where static bundles are
 * @returns {assetManagerFactory}
 */
export default function getAssetManager(testId, options = {}) {
    let assetManager;

    if (typeof assetManagers[testId] !== 'undefined') {
        assetManager = assetManagers[testId];
    } else {
        assetManager = assetManagerFactory({ baseUrl: '', workerBase: options.staticUrl || '' });
        assetManagers[testId] = assetManager;
    }

    return assetManager;
}
