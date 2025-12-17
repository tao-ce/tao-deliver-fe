// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024-2025 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import RunnerController from '../runner.js';
import configurationLoader from '../../service/runner/configurationLoader.js';
import { __ } from '@oat-sa-private/ui-core';
import LanguageSelectionPage from '../../component/LanguageSelectionPage.svelte';
import urlBuilder from '../../core/urlBuilder.js';

vi.mock('../../component/LanguageSelectionPage.svelte', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(() => ({
        $on: vi.fn()
    }))
}));

vi.mock('../../service/runner/configurationLoader.js');
vi.mock('core/jwt/jwtTokenHandler');
vi.mock('core/jwt/jwtTokenRegistry');

describe('runner controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('locale', () => {
        beforeEach(() => {
            __.setDictionaryLoader(() => Promise.resolve({}));
        });
        const controllerConfig = {
            exitPageRoutes: { error: 'errorRoute123' },
            runnerConfiguration: { themes: {} },
            endpoints: {
                deliveryExecutionLocale: 'deliveryExecutionLocale',
                batteryDistributionLocale: 'batteryDistributionLocale'
            }
        };
        const controllerParams = { deliveryExecutionId: 'dx123', refreshTokenId: 'rt123' };

        it('sets locale from configuration request, caches it, uses it for errors', () =>
            new Promise(done => {
                const controller = RunnerController();
                controller.install(controllerConfig);

                const setLocaleSpy = vi.spyOn(__, 'setLocale');

                configurationLoader.mockResolvedValue({
                    providers: [],
                    options: {},
                    locale: 'conf-RESP'
                });
                controller.loadPlatformTheme = () => {
                    throw new Error('Fail after locale from configuration was set');
                };

                vi.spyOn(window.history, 'state', 'get').mockReturnValue({ foo: 'bar' });
                const historyReplaceStateSpy = vi.spyOn(window.history, 'replaceState');

                vi.spyOn(controller.router, 'dispatch').mockImplementationOnce((route, params) => {
                    expect(route).toBe(controllerConfig.exitPageRoutes.error);
                    expect(params.internalError?.message).toBe('Fail after locale from configuration was set');
                    expect(setLocaleSpy).toHaveBeenCalledWith('conf-RESP');
                    expect(historyReplaceStateSpy).toHaveBeenCalledWith({ foo: 'bar', initialLocale: 'conf-RESP' }, '');
                    expect(params.lti_locale).toBe(void 0); //'conf-RESP', but it was already set, so it's not passed explicitly

                    controller.stop();
                    done();
                });

                controller.start(controllerParams);
            }));

        it('renders locale selection page if multi-language delivery is provided', () =>
            new Promise(done => {
                const controller = RunnerController();
                controller.install(controllerConfig);
                configurationLoader.mockResolvedValue({
                    providers: [],
                    options: {
                        localization: {
                            supportedLocales: ['en_GB', 'ru_RU']
                        },
                        locale: 'ru_RU'
                    }
                });
                controller.start(controllerParams);
                vi.spyOn(urlBuilder, 'urlFromResourceConfig').mockImplementationOnce((id, endpoint) => {
                    expect(endpoint).toEqual(controllerConfig.endpoints.deliveryExecutionLocale);
                    return controllerConfig.deliveryExecutionLocale;
                });

                const originalShowLanguageSelection = controller.showLanguageSelection.bind(controller);

                vi.spyOn(controller, 'showLanguageSelection').mockImplementationOnce(() => {
                    originalShowLanguageSelection();
                    return Promise.resolve();
                });

                vi.spyOn(controller, 'startRunner').mockImplementationOnce(() => {
                    expect(LanguageSelectionPage).toHaveBeenCalledWith({
                        target: null,
                        props: {
                            submitSelectionEndpoint: controllerConfig.deliveryExecutionLocale,
                            supportedLocales: ['en_GB', 'ru_RU'],
                            defaultLocale: 'ru_RU',
                            jwtTokenHandler: void 0
                        }
                    });
                    controller.stop();
                    done();
                });
            }));

        it('maintains the default language selection endpoint if the battery distribution is empty', () =>
            new Promise(done => {
                const controller = RunnerController();
                controller.install(controllerConfig);
                configurationLoader.mockResolvedValue({
                    providers: [],
                    options: {
                        localization: {
                            supportedLocales: ['en_GB', 'ru_RU']
                        },
                        locale: 'ru_RU'
                    },
                    batteryContext: { batteryDistribution: {} }
                });
                controller.start(controllerParams);
                vi.spyOn(urlBuilder, 'urlFromResourceConfig').mockImplementationOnce((id, endpoint) => {
                    expect(endpoint).toEqual(controllerConfig.endpoints.deliveryExecutionLocale);
                    return controllerConfig.deliveryExecutionLocale;
                });

                const originalShowLanguageSelection = controller.showLanguageSelection.bind(controller);

                vi.spyOn(controller, 'showLanguageSelection').mockImplementationOnce(() => {
                    originalShowLanguageSelection();
                    return Promise.resolve();
                });

                vi.spyOn(controller, 'startRunner').mockImplementationOnce(() => {
                    expect(LanguageSelectionPage).toHaveBeenCalledWith({
                        target: null,
                        props: {
                            submitSelectionEndpoint: controllerConfig.deliveryExecutionLocale,
                            supportedLocales: ['en_GB', 'ru_RU'],
                            defaultLocale: 'ru_RU',
                            jwtTokenHandler: void 0
                        }
                    });
                    controller.stop();
                    done();
                });
            }));

        it('maintains the default language selection endpoint if the battery distribution ID is empty', () =>
            new Promise(done => {
                const controller = RunnerController();
                controller.install(controllerConfig);
                configurationLoader.mockResolvedValue({
                    providers: [],
                    options: {
                        localization: {
                            supportedLocales: ['en_GB', 'ru_RU']
                        },
                        locale: 'ru_RU'
                    },
                    batteryContext: { batteryDistribution: { id: null } }
                });
                controller.start(controllerParams);
                vi.spyOn(urlBuilder, 'urlFromResourceConfig').mockImplementationOnce((id, endpoint) => {
                    expect(endpoint).toEqual(controllerConfig.endpoints.deliveryExecutionLocale);
                    return controllerConfig.deliveryExecutionLocale;
                });

                const originalShowLanguageSelection = controller.showLanguageSelection.bind(controller);

                vi.spyOn(controller, 'showLanguageSelection').mockImplementationOnce(() => {
                    originalShowLanguageSelection();
                    return Promise.resolve();
                });

                vi.spyOn(controller, 'startRunner').mockImplementationOnce(() => {
                    expect(LanguageSelectionPage).toHaveBeenCalledWith({
                        target: null,
                        props: {
                            submitSelectionEndpoint: controllerConfig.deliveryExecutionLocale,
                            supportedLocales: ['en_GB', 'ru_RU'],
                            defaultLocale: 'ru_RU',
                            jwtTokenHandler: void 0
                        }
                    });
                    controller.stop();
                    done();
                });
            }));

        it('renders provides different language selection endpoint in battery context', () =>
            new Promise(done => {
                const controller = RunnerController();
                controller.install(controllerConfig);
                configurationLoader.mockResolvedValue({
                    providers: [],
                    options: {
                        localization: {
                            supportedLocales: ['en_GB', 'ru_RU']
                        },
                        locale: 'ru_RU'
                    },
                    batteryContext: { batteryDistribution: { id: '29226311-eb31-4b7b-9640-c4951232d426' } }
                });
                controller.start(controllerParams);
                vi.spyOn(urlBuilder, 'urlFromResourceConfig').mockImplementationOnce((id, endpoint) => {
                    expect(endpoint).toEqual(controllerConfig.endpoints.batteryDistributionLocale);
                    return controllerConfig.batteryDistributionLocale;
                });

                const originalShowLanguageSelection = controller.showLanguageSelection.bind(controller);

                vi.spyOn(controller, 'showLanguageSelection').mockImplementationOnce(() => {
                    originalShowLanguageSelection();
                    return Promise.resolve();
                });

                vi.spyOn(controller, 'startRunner').mockImplementationOnce(() => {
                    expect(LanguageSelectionPage).toHaveBeenCalledWith({
                        target: null,
                        props: {
                            submitSelectionEndpoint: controllerConfig.batteryDistributionLocale,
                            supportedLocales: ['en_GB', 'ru_RU'],
                            defaultLocale: 'ru_RU',
                            jwtTokenHandler: void 0
                        }
                    });
                    controller.stop();
                    done();
                });
            }));

        [
            ['is not set', null],
            ['is set', 'hist-STATE']
        ].forEach(([title, initialLocale]) => {
            it(`for error before configuration reponse, tries to use cached locale (it ${title})`, () =>
                new Promise(done => {
                    const controller = RunnerController();
                    controller.install(controllerConfig);

                    configurationLoader.mockRejectedValue(new Error('Fail configuration request'));

                    vi.spyOn(window.history, 'state', 'get').mockReturnValue(initialLocale ? { initialLocale } : null);

                    vi.spyOn(controller.router, 'dispatch').mockImplementationOnce((route, params) => {
                        expect(route).toBe(controllerConfig.exitPageRoutes.error);
                        expect(params.internalError?.message).toBe('Fail configuration request');
                        expect(params.lti_locale).toBe(initialLocale ? initialLocale : void 0);

                        controller.stop();
                        done();
                    });

                    controller.start(controllerParams);
                }));
        });
    });
});
