// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pageController from './page.js';
import Splash from '../component/Splash.svelte';

export default () =>
    pageController({
        name: 'splash',

        /**
         * Splash page controller
         */
        start() {
            const container = this.container.querySelector('#page-main');

            this.theEndComponent = new Splash({
                target: container
            });
        },

        stop() {
            if (this.theEndComponent) {
                this.theEndComponent.$destroy();
            }
        }
    });
