// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import assetManagerFactory from 'taoItems/assets/manager';
import assetStrategies from 'taoItems/assets/strategies';
import request from 'core/fetchRequest';

const strategies = [
    assetStrategies.packedUrl,
    assetStrategies.external,
    assetStrategies.base64,
    assetStrategies.baseUrl
];

/**
 * Add a <link rel="prefetch"> to the current document's <head>
 * Triggers scheduling of a resource download.
 * (Prefetch: lowest priority request, for resources expected to be needed after next navigation)
 * @param {String} href
 * @param {String} as
 * @param {String} [crossOrigin] - should be aligned with corresponding component policy:
 * Because (e.g.) Video component renders a tag with CORS validation, here we also should set crossOrigin: 'anonymous'.
 * If crossorigin attribute differs between <link> tag and <img>|<audio>|<video> tag, browsers do not recognize prefetched file.
 */
function addPrefetchLink(href, as, crossOrigin) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = as;
    if (crossOrigin) {
        link.crossOrigin = crossOrigin;
    }
    document.head.appendChild(link);
}

/**
 * Prefetch all images defined in an item's assets
 * @param {String[]} urls - already resolved urls
 */
export function prefetchImages(urls) {
    for (const url of urls) {
        addPrefetchLink(url, 'image');
    }
}

/**
 * Prefetch all stylesheets defined in an item's assets
 * @param {String[]} urls - already resolved urls
 */
export function prefetchStylesheets(urls) {
    for (const url of urls) {
        addPrefetchLink(url, 'style', 'anonymous');
    }
}

/**
 * Prefetch all videos defined in an item's assets
 * @param {String[]} urls - already resolved urls
 * @param {PreloadConfig} config
 * @returns {Promise} resolves when done
 */
export function prefetchVideos(urls, config = { preloadStrategy: {} }) {
    const threshold = config.preloadStrategy.videosThreshold;

    if (threshold && typeof threshold === 'number' && threshold > 0) {
        const videoPrefetchConfig = {
            requestTimeout: config.requestTimeout,
            threshold
        };

        // Because of configured threshold, each asset's size must be checked before prefetching
        return Promise.all(
            urls.map(url =>
                validateFileSize(url, videoPrefetchConfig).then(valid => {
                    if (valid) {
                        addPrefetchLink(url, 'video', 'anonymous');
                    }
                })
            )
        );
    } else {
        // No size checks needed - synchronous
        for (const url of urls) {
            addPrefetchLink(url, 'video', 'anonymous');
        }
        return Promise.resolve();
    }
}

/**
 * Prefetch all audios defined in an item's assets
 * @param {String[]} urls - already resolved urls
 * @param {PreloadConfig} config
 * @returns {Promise} resolves when done
 */
export function prefetchAudios(urls, config = { preloadStrategy: {} }) {
    const threshold = config.preloadStrategy.audiosThreshold;

    if (threshold && typeof threshold === 'number' && threshold > 0) {
        const audioPrefetchConfig = {
            requestTimeout: config.requestTimeout,
            threshold
        };

        // Because of configured threshold, each asset's size must be checked before prefetching
        return Promise.all(
            urls.map(url =>
                validateFileSize(url, audioPrefetchConfig).then(valid => {
                    if (valid) {
                        addPrefetchLink(url, 'audio', 'anonymous');
                    }
                })
            )
        );
    } else {
        // No size checks needed - synchronous
        for (const url of urls) {
            addPrefetchLink(url, 'audio', 'anonymous');
        }
        return Promise.resolve();
    }
}

/**
 * Send HEAD request for one remote file URL; check content-length against configured threshold
 * @param {String} fileUrl
 * @param {Object} config
 * @param {Number} [config.requestTimeout]
 * @param {Number} [config.threshold]
 * @returns {Promise<Boolean>} resolves true if file size is known and below threshold
 */
export function validateFileSize(fileUrl, config = {}) {
    return getFileHeaders(fileUrl, config).then(headers => {
        const mediaSize = headers && headers.get('content-length') && parseInt(headers.get('content-length'), 10);

        return typeof mediaSize === 'number' && typeof config.threshold === 'number' && mediaSize < config.threshold;
    });
}

/**
 * Send HEAD request for one remote file URL
 * @param {String} url
 * @param {Object} [config]
 * @param {Number} [config.requestTimeout]
 * @returns {Promise<Headers>} - resolves to headers object
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response/headers
 */
function getFileHeaders(url, config = {}) {
    // HEAD request response should not be JSON-parsed like other responses
    const requestOptions = {
        method: 'HEAD',
        returnOriginalResponse: true
    };
    if (typeof config.requestTimeout === 'number') {
        requestOptions.timeout = config.requestTimeout;
    }
    // Return just the headers object.
    // If the fetch rejects for any reason, no big deal, just return an empty Headers
    return request(url, requestOptions)
        .then(response => response.headers)
        .catch(() => new Headers());
}

/**
 * @typedef {Object} Item - item definition as stored in local itemStore
 * @property {String} baseUrl
 * @property {String} itemIdentifier
 * @property {Object} itemData
 * @property {Object} [itemState]
 * @property {Object} [itemResponse]
 * @property {Object} [flags]
 */
/**
 * @typedef {Object} PreloadConfig
 * @property {Object} preloadStrategy
 * @property {Number} requestTimeout
 */
/**
 * Given an Item and preload strategy, check and start preloading item's defined assets
 * @param {Item} nextItem
 * @param {PreloadConfig} config
 * @returns {Promise} resolves when done (i.e. <link> tags added to document)
 */
export function preloadNextItemAssets(nextItem, config = {}) {
    const { preloadStrategy } = config;

    const prefetchPromises = [];

    if (preloadStrategy && nextItem && nextItem.itemData && nextItem.itemData.assets) {
        // URL resolution is handled by a temporary assetManager for the next item
        const assetManager = assetManagerFactory(strategies, { baseUrl: nextItem.baseUrl });

        const extractUrls = obj => Object.values(obj || {}).map(url => assetManager.resolve(url));

        if (preloadStrategy.stylesheets) {
            // synchronous
            prefetchStylesheets(extractUrls(nextItem.itemData.assets.css));
        }
        if (preloadStrategy.images) {
            // synchronous
            prefetchImages(extractUrls(nextItem.itemData.assets.img));
        }
        if (preloadStrategy.videos) {
            prefetchPromises.push(prefetchVideos(extractUrls(nextItem.itemData.assets.video), config));
        }
        if (preloadStrategy.audios) {
            prefetchPromises.push(prefetchAudios(extractUrls(nextItem.itemData.assets.audio), config));
        }
    }
    return Promise.all(prefetchPromises);
}
