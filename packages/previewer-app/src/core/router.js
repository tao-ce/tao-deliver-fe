// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import config from '../config.js';
import router from 'taoDeliverAppsCommon/core/router.js';

/**
 * Routing override
 * @param {String} route
 * @returns {Promise} resolves with an imported module
 */
router.importController = route => {
    const { routes } = config;

    switch (route) {
        case routes.error:
            return import('../controller/error.js');

        case routes.testPreview:
        case routes.bookletExport:
            return import('../controller/previewerRunner.js');

        case routes.splash:
        case routes.exit:
        // fall through
        default:
            return import('../controller/splash.js');
    }
};

/**
 * Routing override
 * @returns {Object} config, specific to this application, needed in common router + controllers
 */
router.getConfig = () => config;

export default router;
