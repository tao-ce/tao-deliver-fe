// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import '@oat-sa-private/ui-core/polyfills.js';
import router from './core/router';
import { __ } from '@oat-sa-private/ui-core';
import './index.css';

if (window.env) {
    window.console.info(`tao-deliver-app v${window.env.PACKAGE_VERSION || '?'} (build: ${window.env.VERSION || '?'})`);
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const pathPrefix = window.env.PATH_PREFIX.replace(/\/+$/, '');
        const path = `${window.location.origin}/${pathPrefix}/sw.js`;
        navigator.serviceWorker.register(path.replace(/([^:]\/)\/+/g, "$1"));
    });
}

const localeFallback = 'en-US';
/**
 * Dynamically import a dictionary from a locale
 * @param {string} locale - the locale to load
 * @returns {Promise<Object>} resolves with the dictionary
 */
function loadDictionary(locale) {
    //if the locale use the underscore separator, replace it
    if (locale && /^[a-z]{2}_[A-Z]{2}/.test(locale)) {
        locale = locale.replace(/_/g, '-');
    }
    return import(`../locale/${locale}/messages.json`);
}

//register the dictionary loader
__.setDictionaryLoader(locale =>
    loadDictionary(locale)
        .catch(() => loadDictionary(localeFallback))
        .then(dictionaryModule => dictionaryModule.default)
);

router.start();
