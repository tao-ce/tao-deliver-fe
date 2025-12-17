// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pageController from './page.js';
import runnerComponentFactory from 'taoTests/runner/runnerComponentSimple';
import urlBuilder from 'taoDeliverAppsCommon/core/urlBuilder.js';
import staticConfig from '../config.js';
import themingServiceFactory from 'taoDeliverAppsCommon/service/theming.js';
import LaunchError from 'taoDeliverAppsCommon/core/error/LaunchError.js';
import ActionError from 'taoDeliverAppsCommon/core/error/ActionError';
import router from 'taoDeliverAppsCommon/core/router.js';

export default () =>
    // eslint-disable-next-line implicit-arrow-linebreak
    pageController({
        name: 'previewerRunner',
        runnerComponent: null,
        runnerConfiguration: null,

        /**
         * Creates a runner component and start test running
         */
        startRunner() {
            const target = this.container.querySelector('#page-main');
            const configuration = this.runnerConfiguration;

            // fake serviceCallId for now, as unique deliveryExecutionId concept doesn't apply
            configuration.serviceCallId = 'previewer';

            this.runnerComponent = runnerComponentFactory(target, configuration)
                .after('hide.previewer', () => {
                    if (this.runnerComponent) {
                        this.runnerComponent.off('hide.previewer');
                        //to show loading indicator while waiting for 'init' response
                        this.runnerComponent.show();
                    }
                })
                .on('ready', runner => {
                    this.logger.info('The test runner is ready to serve the test');
                    if (this.runnerComponent) {
                        this.runnerComponent.off('hide.previewer');
                    }
                    runner.on('previewer-move', itemPosition => {
                        //keep current item ref in query string, and record it in browser history
                        const url = new URL(window.location);
                        url.searchParams.set('item', itemPosition + 1);
                        router.inject(url);
                    });
                })
                .on('error', err => {
                    if (this.runnerComponent) {
                        this.runnerComponent.off('hide.previewer');
                    }
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
         * Stop controller
         */
        stop() {
            this.destroyRunnerComponent();
        },

        /**
         * Start controller, setup configuration and start test runner
         * @param {Object} params - parameters from the dispatched URL
         * @param {String} params.unitId - the identifier of the test to preview
         * @param {String} [params.requestId] - request id which lets backend fetch data from alternative storage
         * @param {String} [params.locale] - the locale of the test to preview. If omitted, API should assume default
         * @param {String} [params.item] - the ref of the item to preview (`item.position+1`). If omitted, first item will be rendered
         * @param {String} [params.jwt] - . Autheticatin jwt token used
         * @param {String} [params.uiEngine] - the representation of uiEngine metadata used with technical requestId units
         * @param {String} [params.bookletInteractive] - for bookletExport route, to set bookletExport plugin config
         * @param {String} [params.bookletStart] - for bookletExport route, to set bookletExport plugin config
         * @param {String} [params.bookletEnd] - for bookletExport route, to set bookletExport plugin config
         * @param {String} [params.bookletRenderDelay] - - for bookletExport route, to set bookletExport plugin config
         * @returns {void}
         */
        start({
            unitId,
            requestId,
            locale,
            item,
            jwt,
            uiEngine,
            bookletInteractive,
            bookletStart,
            bookletEnd,
            bookletRenderDelay
        } = {}) {
            if (!unitId) {
                return this.handleError(new LaunchError('No unitId provided.'));
            }

            const configurationLoader = config =>
                Promise.resolve(
                    Object.assign({}, config && config.runnerConfiguration, {
                        proxy: {
                            urls: {
                                unit: urlBuilder.urlFromResourceConfig(void 0, config.endpoints.unit),
                                init: urlBuilder.urlFromResourceConfig(void 0, config.endpoints.init),
                                getItem: urlBuilder.urlFromResourceConfig(void 0, config.endpoints.getItem)
                            }
                        },
                        params: {
                            unitId,
                            requestId,
                            locale,
                            item,
                            uiEngine,
                            jwt
                        },
                        getLaunchUrlForLocale: lc => {
                            const url = new URL(window.location.href);
                            url.searchParams.set('locale', lc);
                            url.searchParams.delete('requestId');
                            url.searchParams.delete('uiEngine');
                            return url.toString();
                        }
                    })
                );

            configurationLoader(staticConfig)
                .then(configuration => {
                    if (!configuration || !configuration.providers) {
                        return this.handleError(new LaunchError('The test runner configuration is not available.'));
                    }

                    const isBookletExportMode = window.location.pathname === staticConfig.routes.bookletExport;
                    if (isBookletExportMode) {
                        const intBookletStart = parseInt(bookletStart);
                        const intBookletEnd = parseInt(bookletEnd);
                        const intBookletRenderDelay = parseInt(bookletRenderDelay);

                        configuration.options.plugins.bookletExport = {
                            interactive: bookletInteractive === 'true',
                            start: intBookletStart >= 0 ? intBookletStart : void 0,
                            end: intBookletEnd >= 0 ? intBookletEnd : void 0,
                            renderDelay: intBookletRenderDelay >= 0 ? intBookletRenderDelay : void 0
                        };
                    } else if (Array.isArray(configuration.providers.plugins)) {
                        configuration.providers = Object.assign({}, configuration.providers, {
                            plugins: configuration.providers.plugins.filter(p => p.id !== 'bookletExport')
                        });
                    }

                    this.runnerConfiguration = configuration;

                    const platformTheme = Object.assign(
                        {},
                        this.runnerConfiguration.themes && this.runnerConfiguration.themes.platform
                    );
                    return this.loadPlatformTheme(platformTheme);
                })
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
            this.stop();
            this.router.dispatch(staticConfig.routes.error, {
                internalError: err,
                exitUrl: this.runnerConfiguration && this.runnerConfiguration.options.exitUrl
            });
        }
    });
