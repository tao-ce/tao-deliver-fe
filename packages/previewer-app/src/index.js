// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import '@oat-sa-private/ui-core/polyfills.js';
import router from './core/router.js';
import './index.css';

if (window.env) {
    window.console.info(`${window.env.PACKAGE_NAME} v${window.env.PACKAGE_VERSION}`);
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${window.location.origin}/sw.js`);
    });
}

router.start();
