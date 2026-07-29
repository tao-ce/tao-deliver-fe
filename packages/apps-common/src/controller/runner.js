// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2019-2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pageController from './page.js';
import jwtTokenHandlerFactory from 'core/jwt/jwtTokenHandler';
import jwtTokenRegistry from 'core/jwt/jwtTokenRegistry';
import runnerComponentFactory from 'taoTests/runner/runnerComponentSimple';
import configurationLoader from '../service/runner/configurationLoader.js';
import urlBuilder from '../core/urlBuilder.js';
import themingServiceFactory from '../service/theming.js';
import kioskServiceFactory from '../service/runner/kiosk.js';
import LaunchError from '../core/error/LaunchError.js';
import ActionError from '../core/error/ActionError';
import KioskError from '../core/error/KioskError.js';
import { __, getLocaleDirection, setLanguageDirectionMapping } from '@oat-sa-private/ui-core';
import WaitingPage from '../component/WaitingPage.svelte';
import PasswordPage from '../component/PasswordPage.svelte';
import LanguageSelectionPage from '../component/LanguageSelectionPage.svelte';
import request from 'core/fetchRequest';
import { getLocaleFallback } from '../util/locale.js';
import { saveErrorLog } from '../service/runner/saveErrorLog.js';
import { securityLog } from '../service/runner/securityLog.js';
import { endAssessment } from '../util/endAssessment.js';
import { notifyFactory } from '../util/notify.js';
import { mount, unmount } from 'svelte';

function createThankYouReturnUrl(returnUrl, returnUrlParameters = {}) {
    try {
        const url = new URL(returnUrl);

        for (const [parameter, value] of Object.entries(returnUrlParameters)) {
            url.searchParams.append(parameter, value);
        }

        return url.toString();
    } catch {
        return returnUrl;
    }
}

function createThankYouUrl(path, returnUrl, returnUrlParameters = {}, locale) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set('returnUrl', createThankYouReturnUrl(returnUrl, returnUrlParameters));

    if (locale) {
        url.searchParams.set('lti_locale', locale);
    }

    return url.toString();
}

export default () =>
    pageController({
        name: 'runner',
        runnerComponent: null,
        runnerConfiguration: null,

        /**
         * Setter for external application config, needed in controller
         * @param {Object} config
         */
        install(config = {}) {
            this.config = config;
        },

        /**
         * Creates a token handler and setup tokens
         * @param {object} params
         * @param {string} [params.deliveryExecutionId]
         * @param {string} [params.refreshTokenId]
         * @returns {TokenHandler}
         */
        createJWTTokenHandler({ deliveryExecutionId, refreshTokenId }) {
            // JWT setup
            const jwtTokenHandler = jwtTokenHandlerFactory({
                serviceName: 'tao-deliver',
                refreshTokenUrl: urlBuilder.urlFromConfig(this.config.endpoints.refreshToken),
                useCredentials: true,
                accessTokenTTL: this.config.accessTokenTTL,
                usePerTokenTTL: true,
                refreshTokenParameters: { deliveryExecutionId, refreshTokenId }
            });

            jwtTokenRegistry.register(jwtTokenHandler);

            return jwtTokenHandler;
        },

        /**
         * Creates a runner component and start test running
         */
        startRunner() {
            const configuration = this.runnerConfiguration;
            this.runnerComponent = runnerComponentFactory(this.container, configuration)
                .on('ready', runner => {
                    this.logger.info('The test runner is ready to serve the test');
                    this.notify('ready', { location: window.location.href });

                    runner
                        .on('testfinished', context => {
                            if (!configuration.options) {
                                configuration.options = {};
                            }

                            configuration.options.nextStepUrl = context.nextDeliveryExecutionUrl;
                        })

                        .on('finish', () => {
                            if (configuration.options.nextStepUrl) {
                                return request(configuration.options.nextStepUrl, {
                                    jwtTokenHandler: configuration.jwtTokenHandler
                                })
                                    .then(response => {
                                        if (!response.redirectionURL) {
                                            throw new Error('No redirection received from the server!');
                                        }
                                        // support potential redirects to external services, such as TAO Proctoring
                                        window.location.replace(response.redirectionURL);
                                    })
                                    .catch(err => this.handleError(err));
                            }
                            //here just a placeholder for success message display
                            const ltiMessageParameters = {
                                lti_msg: __('Test is finished'), //message to be displayed to test taker
                                lti_log: 'Test taker finished the test' //log entry (new in LTI 1.3)
                            };
                            if (configuration.options?.exitUrl || configuration.options?.endAssessmentUrl) {
                                const successUrl =
                                    configuration.options?.showThankYouPageBeforeRedirect && configuration.options?.exitUrl
                                        ? createThankYouUrl(
                                              this.config.exitPageRoutes.thankYou,
                                              configuration.options.exitUrl,
                                              ltiMessageParameters,
                                              __.getLocale()
                                          )
                                        : undefined;

                                return endAssessment({
                                    ...configuration.options,
                                    jwtTokenHandler: configuration.jwtTokenHandler,
                                    exitUrlParameters: ltiMessageParameters,
                                    successUrl
                                });
                            } else {
                                // switch to local Thank You page with defaults
                                this.notify('exit');
                                const thankYouUrl = new URL(this.config.exitPageRoutes.thankYou, window.location.origin);
                                const locale = __.getLocale();
                                if (locale) {
                                    thankYouUrl.searchParams.set('lti_locale', locale);
                                }
                                this.router.replace(thankYouUrl.pathname + thankYouUrl.search);
                            }
                        })

                        .on('testreset', () => {
                            window.location.reload();
                        });
                })
                .on('error', err => {
                    if (err?.logOnly) {
                        this.logError(err);
                    } else {
                        // check whether error related to an action
                        const actionError =
                            err.response &&
                            err.response.responses &&
                            err.response.responses.find(
                                response => response[0] && response[0].success === false && response[0].errorCode
                            );
                        if (actionError) {
                            err = new ActionError(err.message, actionError[0].errorCode);
                        }
                        this.handleError(err);
                    }
                });
        },

        /**
         * Destroy test runner component
         */
        destroyRunnerComponent() {
            if (this.runnerComponent) {
                this.runnerComponent.destroy();
                this.runnerComponent = null;
            }
        },

        /**
         * Load the platform theme
         * @param {Object} platformTheme - the theme data to load
         * @returns {Promise|void} once the theme is loaded
         */
        loadPlatformTheme(platformTheme) {
            if (platformTheme) {
                const themingService = themingServiceFactory(platformTheme);
                return themingService.load();
            }
        },

        /**
         * Renders waiting page for test taker if waitTimeRemaining option is bigger than 0.
         * @returns {Promise<void>} Waiting timeout, test can started
         */
        startWaiting() {
            const configuration = this.runnerConfiguration;
            const { options, jwtTokenHandler, testTaker, themes } = configuration;
            const { waitTimeRemaining, testTitle, exitUrl, endAssessmentUrl, startsAt, endsAt } = options || {};
            const { name: testTakerName } = testTaker || {};
            const theme = themes?.testRunner;

            let logoutUrl;

            if (exitUrl) {
                const url = new URL(exitUrl);
                // this indicates it was a log out from waiting page
                url.searchParams.append('lti_log', '[LOGOUT]');
                logoutUrl = url.toString();
            }

            if (waitTimeRemaining) {
                let waitingPromiseResolve;
                const waitingPromise = new Promise(resolve => {
                    waitingPromiseResolve = resolve;
                });
                const waitingPage = mount(WaitingPage, {
                    target: this.container,
                    props: {
                        waitTimeRemaining,
                        testTitle,
                        exitUrl: logoutUrl,
                        endAssessmentUrl,
                        jwtTokenHandler,
                        testTakerName,
                        theme,
                        startsAt,
                        endsAt,
                        locale: __.getLocale()
                    }
                });

                waitingPage.$on('timeout', () => {
                    unmount(waitingPage);
                    waitingPromiseResolve();
                });
                return waitingPromise;
            }

            return Promise.resolve();
        },

        /**
         * Renders password page for test taker if the test is password protected.
         * @returns {Promise<void>} Waiting for test-taker to input the password,
         * if password is correct test can be started
         */
        showPassword() {
            let waitingPromiseResolve;
            const configuration = this.runnerConfiguration;
            const { options, jwtTokenHandler } = configuration;
            const isPasswordProtected = options?.passwordProtection?.delivery?.isProtected;
            if (!isPasswordProtected) {
                return Promise.resolve();
            }
            const waitingPromise = new Promise(resolve => {
                waitingPromiseResolve = resolve;
            });

            const passwordPage = mount(PasswordPage, {
                target: this.container,
                props: {
                    validationEndpoint: options.passwordProtection.validationEndpoint,
                    deliveryId: options.passwordProtection.delivery.id,
                    jwtTokenHandler
                }
            });
            passwordPage.$on('success', () => {
                unmount(passwordPage);
                waitingPromiseResolve();
            });
            return waitingPromise;
        },

        /**
         * If configured to run in lockdown (kiosk) browser, check that app runs in it.
         * @throws {KioskError} if didn't pass validation
         * @returns {Promise<void>} test can be started
         */
        async validateKiosk() {
            const configuration = this.runnerConfiguration;
            const { options } = configuration;

            if (options?.kiosk?.enabled) {
                this.kioskService = kioskServiceFactory(options.kiosk);

                try {
                    await this.kioskService.validateMinVersion();
                    await this.kioskService.validateProcessDenyList();
                } catch (err) {
                    if (err instanceof KioskError) {
                        let reason, details;
                        if (err.denyProcesses) {
                            reason = 'lockdown-processes-on-launch';
                            details = { processes: err.denyProcesses.map(i => i.name).join(', ') };
                        } else if (err.detectedVersion) {
                            reason = 'lockdown-version';
                            details = { required: err.requiredVersion, detected: err.detectedVersion };
                        } else {
                            reason = 'lockdown-missing';
                            details = {};
                        }
                        this.logSecurityError(reason, details);
                    }
                    throw err;
                }
            }
        },

        /**
         * Sets locale to the provided locale
         * @param {string} locale
         * @returns {Promise}
         */
        setLocale(locale) {
            return Promise.all([__.setLocale(locale), __.setFallbackLocale(getLocaleFallback(locale))]);
        },

        /**
         * Renders language selection page if delivery contains test translations
         * and language is not chosen yet
         * @returns {Promise<void>} Waiting for test-taker to choose the language
         */
        showLanguageSelection() {
            let waitingPromiseResolve;
            let submitSelectionEndpoint;
            let supportedLocales;
            const { jwtTokenHandler } = this.runnerConfiguration;
            const waitingPromise = new Promise(resolve => {
                waitingPromiseResolve = resolve;
            });

            //we are rather in battery context or in regular delivery
            //url to submit the selected locale is different for these cases
            if (this.runnerConfiguration.batteryContext?.batteryDistribution?.id) {
                const { id } = this.runnerConfiguration.batteryContext.batteryDistribution;
                submitSelectionEndpoint = urlBuilder.urlFromResourceConfig(
                    encodeURIComponent(id),
                    this.config.endpoints.batteryDistributionLocale
                );
            } else {
                const id = this.runnerConfiguration.deliveryExecutionId;
                submitSelectionEndpoint = urlBuilder.urlFromResourceConfig(
                    encodeURIComponent(id),
                    this.config.endpoints.deliveryExecutionLocale
                );
            }

            const { localization } = this.runnerConfiguration.options;
            if (
                !localization ||
                localization.locale ||
                !localization.supportedLocales ||
                !localization.supportedLocales.length
            ) {
                return Promise.resolve();
            }

            supportedLocales = localization.supportedLocales;

            const languageSelectionPage = mount(LanguageSelectionPage, {
                target: this.container,
                props: {
                    submitSelectionEndpoint,
                    supportedLocales,
                    defaultLocale: this.runnerConfiguration.options.locale,
                    jwtTokenHandler
                }
            });

            languageSelectionPage.$on('selected', ({ detail }) => {
                unmount(languageSelectionPage);
                //set the localization.locale to the selected one
                //set default testRunner locale to selected one as well
                //then it will be used by proxy to init the items
                const locale = detail.selectedLocale;
                this.runnerConfiguration.options.localization.locale = locale;
                this.setLocale(locale).then(waitingPromiseResolve);
            });

            return waitingPromise;
        },

        /**
         * Stop controller
         */
        stop() {
            this.destroyRunnerComponent();

            delete this.deliveryExecutionId;
            delete this.jwtTokenHandler;
        },

        /**
         * Start controller, request and setup configuration and start test runner
         * @param {Object} params - parameters from the dispatched URL
         * @param {String} [params.deliveryExecutionId] - the id of the delivery execution to start
         * @param {String} [params.refreshTokenId] - the id of the refresh token
         * @returns {void}
         */
        start({ deliveryExecutionId, refreshTokenId } = {}) {
            if (!deliveryExecutionId && !refreshTokenId) {
                return this.handleError(new LaunchError('No delivery execution id and refresh token id provided.'));
            }
            this.deliveryExecutionId = deliveryExecutionId;
            this.initialLocale = this.getInitialLocale();

            this.jwtTokenHandler = this.createJWTTokenHandler({ deliveryExecutionId, refreshTokenId });

            configurationLoader(
                deliveryExecutionId,
                this.config,
                Object.assign({ jwtTokenHandler: this.jwtTokenHandler }, this.config.endpoints.configuration)
            )
                .then(configuration => {
                    if (!configuration || !configuration.providers) {
                        return this.handleError(new LaunchError('The test runner configuration is not available.'));
                    }
                    // Technical Debt: This proxy ID assignment logic is currently outside the configuration object.
                    // TODO: Consider refactoring this into the configuration.
                    if (configuration.providers.proxy) {
                        const proxyModuleToId = {
                            'taoQtiNuiTest/runner/proxy/actionProxy': 'actions-proxy',
                            'taoQtiNuiTest/runner/proxy/preloadProxy': 'preload-actions-proxy',
                            'taoQtiNuiTest/runner/proxy/reviewProxy': 'review-proxy'
                        };

                        const proxy = configuration.providers.proxy;
                        configuration.providers.proxy.id = proxyModuleToId[proxy.module] || proxy.id;
                    }

                    // set accessToken TTL based on provided configuration
                    if (configuration.options && configuration.options.accessTokenTTL) {
                        this.jwtTokenHandler.setAccessTokenTTL(configuration.options.accessTokenTTL);
                    }

                    // set language direction overrides if any
                    if (configuration.options && configuration.options.languageDirectionMapping) {
                        setLanguageDirectionMapping(configuration.options.languageDirectionMapping);
                    }

                    if (configuration.options?.exitUrl) {
                        try {
                            configuration.options.iframeParentOrigin = new URL(configuration.options.exitUrl).origin;
                            this.notify = notifyFactory(configuration.options.iframeParentOrigin);
                        } catch (err) {
                            this.logger.error(err);
                            this.notify = () => {};
                        }
                    } else {
                        this.notify = () => {};
                    }

                    this.runnerConfiguration = configuration;
                    const locale = this.runnerConfiguration.locale || this.config.locale;
                    return this.setLocale(locale);
                })
                .then(() => {
                    const locale = __.getLocale();
                    delete this.initialLocale;
                    this.persistInitialLocale(locale);

                    const dir = getLocaleDirection();
                    this.runnerConfiguration.dir = dir;
                    document.documentElement.dir = dir;
                    document.documentElement.lang = locale;

                    // Each property in the external themes.platform
                    // must have a fallback in the default config.runnerConfiguration.themes.platform
                    const platformTheme = Object.assign(
                        {},
                        this.config.runnerConfiguration.themes.platform,
                        this.runnerConfiguration.themes && this.runnerConfiguration.themes.platform
                    );
                    return this.loadPlatformTheme(platformTheme);
                })
                .then(() => this.validateKiosk())
                .then(() => this.showPassword())
                .then(() => this.startWaiting())
                .then(() => this.showLanguageSelection())
                .then(() => {
                    this.startRunner();
                })
                .catch(err => this.handleError(err));
        },

        /**
         * Handles error and redirect to exit page
         * @param {Error} err - an error or a type of error message
         */
        handleError(err) {
            this.router.dispatch(this.config.exitPageRoutes.error, {
                internalError: err,
                endAssessmentUrl: this.runnerConfiguration?.options.endAssessmentUrl,
                exitUrl: this.runnerConfiguration?.options.exitUrl,
                deliveryExecutionId: this.deliveryExecutionId,
                lti_locale: this.initialLocale,
                jwtTokenHandler: this.jwtTokenHandler,
                kioskService: this.kioskService
            });
        },

        /**
         * Logs error silently without redirect
         * @param {Error} err -  an error or a type of error message
         */
        logError(err) {
            if (err && this.config?.errorLog?.saveEnabled) {
                const internalError = err instanceof Error ? err : null;
                const errorLog = internalError ? `${internalError.message}\n${internalError.stack}` : err;
                const retry =
                    internalError && (internalError.recoverable === true || internalError.unrecoverable === false);
                if (errorLog)
                    saveErrorLog({
                        errorLog: `[logger-only]${errorLog}`,
                        error: internalError,
                        itemIdentifier: internalError?.itemIdentifier,
                        retry,
                        deliveryExecutionId: this.deliveryExecutionId,
                        jwtTokenHandler: this.jwtTokenHandler,
                        config: this.config,
                        logger: this.logger
                    });
            }
        },

        /**
         * Logs security issue in the security log
         * @param {string} reason
         * @param {object?} details
         */
        logSecurityError(reason, details) {
            securityLog({
                reason,
                details,
                deliveryExecutionId: this.runnerConfiguration.deliveryExecutionId,
                jwtTokenHandler: this.jwtTokenHandler,
                config: this.config
            });
        },

        /**
         * Initial locale to use if error happens before we get actual locale from configuration response
         * @returns {String}
         */
        getInitialLocale() {
            const historyState = window.history.state;
            return historyState?.initialLocale;
        },

        /**
         * Save locale received from configuration response, so that it can be used as initial locale after page refresh
         * @param {String} locale
         */
        persistInitialLocale(locale) {
            const historyState = window.history.state || {};
            historyState.initialLocale = locale;
            window.history.replaceState(historyState, '');
        }
    });
