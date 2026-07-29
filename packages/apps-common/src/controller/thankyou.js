// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019-2026 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pageController from './page.js';
import TheEnd from '../component/TheEnd.svelte';
import { __ } from '@oat-sa-private/ui-core';
import { getLocaleFallback } from '../util/locale.js';
import { mount, unmount } from 'svelte';

function getInitialLocale() {
    return window.history.state?.initialLocale;
}

function getLtiMsgFromReturnUrl(returnUrl) {
    if (!returnUrl) {
        return null;
    }

    try {
        return new URL(returnUrl).searchParams.get('lti_msg');
    } catch {
        return null;
    }
}

async function applyLocale(locale) {
    if (!locale || locale === __.getLocale()) {
        return;
    }

    await __.setLocale(locale);
    await __.setFallbackLocale(getLocaleFallback(locale));
    document.documentElement.lang = __.getLocale();
}

function getProceedAction(returnUrl) {
    try {
        const url = new URL(returnUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return null;
        }

        return {
            actionHref: url.toString(),
            actionLabel: __('Proceed'),
            actionTarget: '_top'
        };
    } catch {
        return null;
    }
}

export default () =>
    pageController({
        name: 'thankyou',

        /**
         * @param {Object} params - parameters from the dispatched URL
         * @param {string} [params.lti_msg] - optional informational message
         * @param {string} [params.returnUrl] - URL for the proceed action
         * @param {string} [params.lti_locale] - user locale
         * @returns {Promise<void>}
         */
        async start({ lti_msg, returnUrl, lti_locale } = {}) {
            try {
                await applyLocale(lti_locale || getInitialLocale());
            } catch (err) {
                this.logger.error(err);
            }

            const proceedAction = getProceedAction(returnUrl);
            const info = lti_msg || getLtiMsgFromReturnUrl(returnUrl) || __('Your test has been submitted.');
            this.theEndComponent = mount(TheEnd, {
                target: this.container,
                props: {
                    title: __('Thank you'),
                    info,
                    icon: 'finish-16',
                    ...(proceedAction || {})
                }
            });
        },

        stop() {
            if (this.theEndComponent) {
                unmount(this.theEndComponent);
                this.theEndComponent = null;
            }
        }
    });
