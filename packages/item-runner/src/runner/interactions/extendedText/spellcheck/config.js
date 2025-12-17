// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
export const spellCheckConfigs = {
    wproofreader: {
        /**
         * @param {Object} receivedConfig
         * @param {string} receivedConfig.srcUrl
         * @param {string} receivedConfig.serviceId
         * @param {string} [receivedConfig.lang]
         * @returns {Object}
         */
        getEditorConfig(receivedConfig) {
            // prettier-ignore
            // https://webspellchecker.com/docs/api/wscbundle/Options.html
            return Object.assign({
                // tenant must override:
                srcUrl: 'https://svc.webspellchecker.net/spellcheck31/wscbundle/wscbundle.js',
                serviceId: '', // license key

                // tenant or LTI claim can override:
                lang: 'auto',
                minWordLength: 3,
                autocorrect: false,
                enableGrammar: false,
                disableStyleGuide: true,
                spellingSuggestions: true,
                grammarSuggestions: false,
                styleGuideSuggestions: false,
                settingsSections: ['languages'],
                detectLocalizationLanguage: true,
                ignoreAllCapsWords: true,
                enableBadgeButton: false,
                requestTokensCount: 3,
                disableDialog: true,
                disableOptionsStorage: ['lang'],
                actionItems: ['ignoreAll', 'settings'],
                cache: true,
                onErrorRequest: function (data) {
                    console.error('[wproofreader]', data); // eslint-disable-line no-console
                }
            }, receivedConfig);
        }
    }
};
