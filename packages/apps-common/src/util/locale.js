// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// values must be paths in app's locale folder
const localeFallbacks = {
    'ar': 'ar-arb',
    'ca': 'val-ES',
    'de': 'de-DE',
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'nl': 'nl-NL',
    'pt': 'pt-BR',
    'val': 'es-ES',
};

/**
 * Get a fallback locale for a given locale
 * Useful for filling missing or partial locale dictionaries in i18n module
 * @example getLocaleFallback('es-MX') // => 'es-ES'
 *
 * @param {string} locale in BCP47 format
 * @returns {string} another locale
 */
export function getLocaleFallback(locale = 'en-US') {
    const localePrefix = locale.split('-')[0];
    return localeFallbacks[localePrefix] || 'en-US';
}
