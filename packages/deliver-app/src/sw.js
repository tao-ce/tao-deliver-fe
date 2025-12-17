// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

function getCacheKey(version) {
    return `tao-deliver-testrunner-nui_${version}`;
}

let CACHE = getCacheKey('{{{package_version}}}');
const offlineFallbackPage = '/';

// Install stage sets up the index page (home page) in the cache and opens a new cache
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            return cache.add(offlineFallbackPage);
        })
    );
});

// Delete all caches that aren't from current version
self.addEventListener('activate', function (event) {
    event.waitUntil(deleteObsoleteCaches());
});

// If any fetch fails, it will look for the request in the cache and serve it from there first.
//
// Note: matching against '/assets/' anywhere in the url.pathname rather than at the beginning,
// this solution could be improved but for now the assets path may be under a subfolder, depending on infrastructure design.
self.addEventListener('fetch', function (event) {
    const requestUrl = new URL(event.request.url);
    if (
        event.request.method !== 'GET' ||
        /^\/api\/v[0-9]*\//.test(requestUrl.pathname) ||
        /\/assets\//.test(requestUrl.pathname) ||
        requestUrl.pathname.indexOf('sockjs-node') !== -1
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(function (response) {
                // If package version changes, change cache to which this and following responses will be saved
                // (This header is expected to exist either only on index.html, or on index.html and all static assets)
                const versionHeader = response.headers.get('X-TestRunner-Version');
                if (versionHeader) {
                    CACHE = getCacheKey(versionHeader);
                }

                // If request was success, add or update it in the cache
                // Bypass 206 'Partial response' (media range request), because SW cache refuses to store it
                const doNotCacheCodes = [206];
                if (!doNotCacheCodes.includes(response.status)) {
                    event.waitUntil(updateCache(event.request, response.clone()));
                }

                return response;
            })
            .catch(function () {
                return fromCache(event.request);
            })
    );
});

function fromCache(request) {
    return caches.open(CACHE).then(function (cache) {
        return cache.match(request).then(function (matching) {
            if (!matching || matching.status === 404) {
                return Promise.reject('no-match');
            }

            return matching;
        });
    });
}

function updateCache(request, response) {
    return caches.open(CACHE).then(function (cache) {
        return cache.put(request, response);
    });
}

function deleteObsoleteCaches() {
    return caches.keys().then(function (cacheNames) {
        return Promise.all(
            cacheNames.map(function (cacheName) {
                if (cacheName !== CACHE) {
                    return caches.delete(cacheName);
                }
            })
        );
    });
}
