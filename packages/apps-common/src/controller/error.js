// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pageController from './page.js';
import { __ } from '@oat-sa-private/ui-core';
import TheEnd from '../component/TheEnd.svelte';
import { getErrorMessageFromError, guessMessageStructure } from '../core/error/messages.js';
import { getLocaleFallback } from '../util/locale.js';
import { saveErrorLog } from '../service/runner/saveErrorLog.js';
import { endAssessment } from '../util/endAssessment.js';
import { notifyFactory } from '../util/notify.js';
import { mount, unmount } from 'svelte';
import KioskError from '../core/error/KioskError.js';

/**
 * Prepares error context string, for logging
 * @param {string?} itemIdentifier - optional context for any type of error
 * @param {string} deliveryExecutionId - optional context for any type of error
 * @returns {string}
 */
function getErrorContext(itemIdentifier, deliveryExecutionId) {
    let errorContext = '';
    errorContext += deliveryExecutionId ? `[${deliveryExecutionId}]` : '';
    errorContext += itemIdentifier ? `[${itemIdentifier}]` : '';
    return errorContext;
}

export default () =>
    pageController({
        name: 'error',

        /**
         * Setter for external application config, needed in controller
         * @param {Object} config
         */
        install(config = {}) {
            this.config = config;
        },

        /**
         * Error controller
         *
         * It can be called in 2 ways, either internally with a JavaScript Error (internalError)
         * or using LTI parameters
         *
         * @param {Object} params - parameters from the dispatched URL
         * @param {Error} [params.internalError] - thrown javascript error
         * @param {string} [params.internalError.itemIdentifier] - optional context for thrown error
         * @param {string} [params.lti_errormsg] - Error message to display
         * @param {string} [params.lti_errorlog] - Error message to log
         * @param {string} [params.lti_locale] - User locale
         * @param {string} [params.exitUrl] - Where to redirect the user
         * @param {string} [params.endAssessmentUrl] - Where to initiate the LtiEndAssessment flow
         * @param {string} [params.deliveryExecutionId] - optional context for any type of error
         * @param {Object} [params.jwtTokenHandler]
         * @param {Object} [params.kioskService]
         *
         * @returns {Promise<void>}
         */
        async start({
            internalError,
            lti_errormsg,
            lti_errorlog,
            lti_locale,
            exitUrl,
            endAssessmentUrl,
            deliveryExecutionId,
            jwtTokenHandler,
            kioskService
        } = {}) {
            const container = this.container;

            let retry = false;
            let displayedErrorMessage;
            let errorMsg = lti_errormsg;
            let errorLog = lti_errorlog;

            const itemIdentifier = internalError?.itemIdentifier;
            const errorContext = getErrorContext(itemIdentifier, deliveryExecutionId);

            let iframeParentOrigin;
            if (exitUrl) {
                try {
                    iframeParentOrigin = new URL(exitUrl).origin;
                    this.notify = notifyFactory(iframeParentOrigin);
                } catch (err) {
                    this.logger.error(err);
                    this.notify = () => {};
                }
            } else {
                this.notify = () => {};
            }

            if (lti_locale && lti_locale !== __.getLocale()) {
                await __.setLocale(lti_locale);
                await __.setFallbackLocale(getLocaleFallback(lti_locale));
                document.documentElement.lang = __.getLocale();
            }

            if (internalError && internalError instanceof Error) {
                displayedErrorMessage = getErrorMessageFromError(internalError);

                //if we can recover from the error (the double check is for backward compat)
                retry = internalError.recoverable === true || internalError.unrecoverable === false;

                errorMsg = Object.values(displayedErrorMessage).join('\n');

                if (internalError instanceof KioskError) {
                    // this string is used in tao-portal, to check that error is related to the kiosk validation
                    errorLog = 'Secure browser validation';
                } else {
                    errorLog = `${internalError.message}\n${internalError.stack}`;
                }
            } else {
                displayedErrorMessage = guessMessageStructure(errorMsg);
            }

            if (errorLog) {
                this.logger.error(errorLog);
            }
            this.notify('error', { errorMsg, errorLog, recoverable: retry });

            const withKioskExit = displayedErrorMessage?.withKioskExit;

            // recoverable errors and errors without return_url can stay within the app,
            // otherwise should redirect to external page
            const withExitUrlRedirect = Boolean(!retry && (exitUrl || endAssessmentUrl) && !withKioskExit);

            this.theEndComponent = mount(TheEnd, {
                target: container,
                props: Object.assign({ retry, withExitUrlRedirect }, displayedErrorMessage)
            });
            this.theEndComponent.$on('click', () => {
                if (withKioskExit) {
                    kioskService.exit();
                } else {
                    window.location.reload();
                }
            });

            if (errorLog && this.config?.errorLog?.saveEnabled) {
                await saveErrorLog({
                    errorLog,
                    error: internalError,
                    itemIdentifier,
                    retry,
                    deliveryExecutionId,
                    jwtTokenHandler,
                    config: this.config,
                    logger: this.logger
                });
            }

            if (withExitUrlRedirect) {
                // param length must be limited in case external page can't handle it
                const maxLength = this.config?.exitPageParams?.lti_errorlog?.maxLength;
                if (errorLog && typeof maxLength === 'number') {
                    errorLog = errorLog.slice(0, maxLength - errorContext.length);
                }

                const exitUrlEntity = new URL(exitUrl);
                exitUrlEntity.searchParams.append('lti_errormsg', errorMsg);
                exitUrlEntity.searchParams.append('lti_errorlog', `${errorLog}\n${errorContext}`);

                return endAssessment({ jwtTokenHandler, exitUrl: exitUrlEntity.toString(), endAssessmentUrl });
            }
        },

        stop() {
            if (this.theEndComponent) {
                unmount(this.theEndComponent);
                this.theEndComponent = null;
            }
        }
    });
