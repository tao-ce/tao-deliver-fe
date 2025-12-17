// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import '@oat-sa-private/ui-core/polyfills.js';
import { __ } from '@oat-sa-private/ui-core';
import router from './core/router';
import config from './config.js';

if (window.env) {
    window.console.info(`tao-deep-linking-app v${window.env.PACKAGE_VERSION || '?'} (build: ${window.env.VERSION || '?'})`);
}

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
        .catch(() => loadDictionary(config.locale))
        .then(dictionaryModule => dictionaryModule.default)
);

router.start();
