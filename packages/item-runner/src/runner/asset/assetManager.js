// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import assetManagerFactory from 'taoItems/assets/manager';
import assetStrategies from 'taoItems/assets/strategies';
import urlUtil from 'util/url';

/**
 * Asset strategy to load web worker
 */
const webWorkerStrategy = {
    name: 'worker',

    /**
     * Web worker asset strategy handler
     * @param {Object} url - the url object
     * @param {Object} [data]
     * @param {string} [data.workerBase] - the baseUrl for the web worker
     * @returns {string|void} the final URL
     */
    handle(url, data = {}) {
        if (url && urlUtil.isRelative(url) && /worker(\.min)?\.(js|mjs)$/.test(url.file)) {
            if (data.workerBase) {
                return `${data.workerBase.replace(/\/$/, '')}/${encodeURIComponent(url.file.replace(/^\.?\//, ''))}`;
            }
            return url.toString();
        }
    }
};

/**
 * Get a preconfigured asset manager for the Solar Item Runner
 * @param {Object} [data] - initial data
 * @returns {Object} the asset manager
 */
export default function getAssetManager(data = {}) {
    return assetManagerFactory(
        [
            webWorkerStrategy,
            assetStrategies.packedUrl,
            assetStrategies.baseUrl,
            assetStrategies.base64,
            assetStrategies.external
        ],
        data
    );
}
