// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pageController from './page.js';
import { __ } from '@oat-sa-private/ui-core';
import TheEnd from '../component/TheEnd.svelte';
import { getErrorMessageFromError, guessMessageStructure } from '../core/error/messages.js';
import { getLocaleFallback } from '../util/locale.js';
import { saveErrorLog } from '../service/runner/saveErrorLog.js';

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
         * @param {string} [params.deliveryExecutionId] - optional context for any type of error
         * @param {Object} [params.jwtTokenHandler]
         */
        async start({
            internalError,
            lti_errormsg,
            lti_errorlog,
            lti_locale,
            exitUrl,
            deliveryExecutionId,
            jwtTokenHandler
        } = {}) {
            const container = this.container;

            let retry = false;
            let displayedErrorMessage;
            let errorMsg = lti_errormsg;
            let errorLog = lti_errorlog;

            const itemIdentifier = internalError?.itemIdentifier;
            const errorContext = getErrorContext(itemIdentifier, deliveryExecutionId);

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
                errorLog = `${internalError.message}\n${internalError.stack}`;

                this.logger.error(errorLog);
            } else {
                displayedErrorMessage = guessMessageStructure(errorMsg);

                if (errorLog) {
                    this.logger.error(errorLog);
                }
            }

            // recoverable errors and errors without return_url can stay within the app,
            // otherwise should redirect to external page
            const withExitUrlRedirect = Boolean(!retry && exitUrl);

            this.theEndComponent = new TheEnd({
                target: container,
                props: Object.assign({ retry, withExitUrlRedirect }, displayedErrorMessage)
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
                if (typeof maxLength === 'number') {
                    errorLog = errorLog.slice(0, maxLength - errorContext.length);
                }

                const exitUrlEntity = new URL(exitUrl);
                exitUrlEntity.searchParams.append('lti_errormsg', errorMsg);
                exitUrlEntity.searchParams.append('lti_errorlog', `${errorLog}\n${errorContext}`);

                // redirect to error page, if LTI return_url claim is defined and error is not recoverable
                window.location.replace(exitUrlEntity);
            }
        },

        stop() {
            if (this.theEndComponent) {
                this.theEndComponent.$destroy();
            }
        }
    });
