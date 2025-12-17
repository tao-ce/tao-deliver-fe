// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2024 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pageController from './page.js';
import TheEnd from '../component/TheEnd.svelte';
import {getErrorDetailsFromError, getErrorMessageFromError, getIsRetriableFromError} from '../core/errorMessages.js';
import { errorMessages } from 'taoDeliverAppsCommon/core/error/messages.js';

export default () =>
    pageController({
        name: 'error',

        /**
         * Error controller
         * @param {Object} params - parameters from the dispatched URL
         * @param {Error} [params.internalError] - thrown javascript error
         * @param {string} [params.exitUrl] - Where to redirect the user if not recoverable
         */
        start({ internalError, exitUrl } = {}) {
            const container = this.container.querySelector('#page-main');

            let retry = false;
            let displayedErrorMessage = errorMessages.unexpected;
            let detailsPromise;

            if (internalError && internalError instanceof Error) {
                displayedErrorMessage = getErrorMessageFromError(internalError);
                retry = getIsRetriableFromError(internalError);
                detailsPromise = getErrorDetailsFromError(internalError);

                this.logger.error(internalError);
            }

            if (!retry && exitUrl) {
                window.location.replace(exitUrl);
            } else if (detailsPromise instanceof Promise) {
                detailsPromise.then((details) => {
                    this.theEndComponent = new TheEnd({
                        target: container,
                        props: Object.assign({ retry, details }, displayedErrorMessage)
                    });
                });
            } else {
                this.theEndComponent = new TheEnd({
                    target: container,
                    props: Object.assign({ retry }, displayedErrorMessage)
                });
            }
        },

        stop() {
            if (this.theEndComponent) {
                this.theEndComponent.$destroy();
            }
        }
    });
