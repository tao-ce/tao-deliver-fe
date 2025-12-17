// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Dynamic theming service
 * TODO the theming should be handled by generating the index.html and manifest
 *
 * @param {Object} [theme]
 * @param {string} [theme.title] - the page title
 * @param {Object} [theme.favicon] - the page favicon (with href and type)
 * @returns {Object} the theming service
 */
export default function themingServiceFactory({ title, favicon } = {}) {
    return {
        /**
         * Update the page title
         */
        updateTitle() {
            if (title && title.length) {
                document.title = title;
            }
        },

        /**
         * Update the page favicon
         */
        updateFavicon() {
            if (favicon && favicon.href) {
                const head = document.head;
                //remove all favicon first
                for (let currentIcon of head.querySelectorAll('link[rel=icon]')) {
                    head.removeChild(currentIcon);
                }
                const link = document.createElement('link');
                link.rel = 'shortcut icon';
                link.href = favicon.href;
                link.type = favicon.type || 'image/x-icon';
                head.appendChild(link);
            }
        },

        /**
         * Load the theme
         * @returns {Promise}
         */
        load() {
            this.updateTitle();
            this.updateFavicon();

            return Promise.resolve();
        }
    };
}
