// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019-2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pageController from './page.js';
import TheEnd from '../component/TheEnd.svelte';
import { __ } from '@oat-sa-private/ui-core';

export default () =>
    pageController({
        name: 'thankyou',

        start({ lti_msg }) {
            this.theEndComponent = new TheEnd({
                target: this.container,
                props: {
                    title: __('Thank you'),
                    info: lti_msg || __('Your test has been submitted.'),
                    icon: 'finish-16'
                }
            });
        },

        stop() {
            if (this.theEndComponent) {
                this.theEndComponent.$destroy();
            }
        }
    });
