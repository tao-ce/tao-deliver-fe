// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import router from 'taoDeliverAppsCommon/core/router.js';

/**
 * Routing override
 * @returns {Promise} resolves with an imported module
 */
router.importController = () => import('../controller/deepLinks.js');

export default router;
