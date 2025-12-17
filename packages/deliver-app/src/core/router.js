// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA
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
    const { exitPageRoutes } = config;

    switch (route) {
        case exitPageRoutes.error:
            return import('taoDeliverAppsCommon/controller/error.js');

        case exitPageRoutes.thankYou:
            return import('taoDeliverAppsCommon/controller/thankyou.js');

        default:
            return import('taoDeliverAppsCommon/controller/runner.js');
    }
};

/**
 * Routing override
 * @returns {Object} config, specific to this application, needed in common router + controllers
 */
router.getConfig = () => config;

export default router;
