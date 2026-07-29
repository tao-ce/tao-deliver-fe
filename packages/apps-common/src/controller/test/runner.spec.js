// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024-2025 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const { endAssessmentMock, resetRunnerComponentState, runnerComponentFactoryMock, runnerComponentState } = vi.hoisted(
    () => {
        const hoistedRunnerComponentState = {
            runnerHandlers: {},
            componentHandlers: {},
            lastRunner: null,
            lastComponent: null
        };

        const resetHoistedRunnerComponentState = () => {
            hoistedRunnerComponentState.runnerHandlers = {};
            hoistedRunnerComponentState.componentHandlers = {};
            hoistedRunnerComponentState.lastRunner = null;
            hoistedRunnerComponentState.lastComponent = null;
        };

        const hoistedRunnerComponentFactoryMock = vi.fn().mockImplementation(() => {
            resetHoistedRunnerComponentState();

            const runner = {
                on: vi.fn((event, callback) => {
                    hoistedRunnerComponentState.runnerHandlers[event] = callback;
                    return runner;
                })
            };

            const component = {
                on: vi.fn((event, callback) => {
                    hoistedRunnerComponentState.componentHandlers[event] = callback;
                    if (event === 'ready') {
                        callback(runner);
                    }

                    return component;
                }),
                destroy: vi.fn()
            };

            hoistedRunnerComponentState.lastRunner = runner;
            hoistedRunnerComponentState.lastComponent = component;

            return component;
        });

        return {
            endAssessmentMock: vi.fn(),
            resetRunnerComponentState: resetHoistedRunnerComponentState,
            runnerComponentFactoryMock: hoistedRunnerComponentFactoryMock,
            runnerComponentState: hoistedRunnerComponentState
        };
    }
);

vi.mock('../../util/endAssessment.js', () => ({
    endAssessment: endAssessmentMock
}));

vi.mock('taoTests/runner/runnerComponentSimple', () => ({
    default: runnerComponentFactoryMock
}));

import RunnerController from '../runner.js';
import configurationLoader from '../../service/runner/configurationLoader.js';
import { __ } from '@oat-sa-private/ui-core';
import LanguageSelectionPage from '../../component/LanguageSelectionPage.svelte';
import urlBuilder from '../../core/urlBuilder.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import KioskError from '../../core/error/KioskError.js';
import { securityLog } from '../../service/runner/securityLog.js';
import kioskServiceFactory from '../../service/runner/kiosk.js';
import { afterEach, beforeEach } from 'vitest';

vi.mock('../../component/LanguageSelectionPage.svelte', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(() => ({
        $on: vi.fn()
    }))
}));

vi.mock('../../service/runner/configurationLoader.js');
vi.mock('core/jwt/jwtTokenHandler');
vi.mock('core/jwt/jwtTokenRegistry');

vi.mock('../../service/runner/kiosk.js', () => ({
    default: vi.fn().mockImplementation(() => ({
        validateMinVersion: vi.fn(),
        validateProcessDenyList: vi.fn()
    }))
}));

vi.mock('../../service/runner/securityLog.js', () => ({
    securityLog: vi.fn()
}));

describe('runner controller', () => {
    beforeEach(() => {
        resetRunnerComponentState();
        vi.clearAllMocks();
    });

    describe('successful finish', () => {
        let getLocaleSpy;

        beforeEach(() => {
            getLocaleSpy = vi.spyOn(__, 'getLocale').mockReturnValue('en');
        });

        afterEach(() => {
            getLocaleSpy.mockRestore();
        });

        function createController(options = {}) {
            document.body.innerHTML = '<div id="page"></div>';

            const controller = RunnerController();
            controller.install({
                exitPageRoutes: { thankYou: '/thank-you', error: '/error' },
                runnerConfiguration: { themes: {} },
                endpoints: {}
            });
            Object.defineProperty(controller, 'logger', {
                value: {
                    info: vi.fn(),
                    error: vi.fn()
                },
                configurable: true
            });
            controller.notify = vi.fn();
            controller.runnerConfiguration = {
                jwtTokenHandler: { getToken: vi.fn() },
                options
            };

            return controller;
        }

        function createExpectedThankYouUrl(returnUrl, returnUrlParameters = {}, locale = 'en') {
            const returnUrlEntity = new URL(returnUrl);

            for (const [parameter, value] of Object.entries(returnUrlParameters)) {
                returnUrlEntity.searchParams.append(parameter, value);
            }

            const url = new URL('/thank-you', window.location.origin);
            url.searchParams.set('returnUrl', returnUrlEntity.toString());

            if (locale) {
                url.searchParams.set('lti_locale', locale);
            }

            return url.toString();
        }

        const ltiMessageParameters = {
            lti_msg: 'Test is finished',
            lti_log: 'Test taker finished the test'
        };

        it('keeps the existing redirect flow when the thank-you toggle is disabled', async () => {
            const controller = createController({
                exitUrl: 'https://portal.example.com/my-sessions'
            });

            controller.startRunner();
            await runnerComponentState.runnerHandlers.finish();

            expect(endAssessmentMock).toHaveBeenCalledWith({
                exitUrl: 'https://portal.example.com/my-sessions',
                jwtTokenHandler: controller.runnerConfiguration.jwtTokenHandler,
                exitUrlParameters: ltiMessageParameters
            });
        });

        it('redirects successful submissions through the thank-you page when the toggle is enabled', async () => {
            const exitUrl = 'https://portal.example.com/my-sessions?tab=scheduled';
            const controller = createController({
                exitUrl,
                showThankYouPageBeforeRedirect: true
            });

            controller.startRunner();
            await runnerComponentState.runnerHandlers.finish();

            expect(endAssessmentMock).toHaveBeenCalledWith({
                exitUrl,
                jwtTokenHandler: controller.runnerConfiguration.jwtTokenHandler,
                exitUrlParameters: ltiMessageParameters,
                showThankYouPageBeforeRedirect: true,
                successUrl: createExpectedThankYouUrl(exitUrl, ltiMessageParameters)
            });
        });

        it('uses the thank-you page as the proctoring end-assessment return URL when the toggle is enabled', async () => {
            const exitUrl = 'https://portal.example.com/my-sessions';
            const endAssessmentUrl = 'https://deliver.example.com/end-assessment';
            const controller = createController({
                exitUrl,
                endAssessmentUrl,
                showThankYouPageBeforeRedirect: true
            });

            controller.startRunner();
            await runnerComponentState.runnerHandlers.finish();

            expect(endAssessmentMock).toHaveBeenCalledWith({
                endAssessmentUrl,
                exitUrl,
                jwtTokenHandler: controller.runnerConfiguration.jwtTokenHandler,
                exitUrlParameters: ltiMessageParameters,
                showThankYouPageBeforeRedirect: true,
                successUrl: createExpectedThankYouUrl(exitUrl, ltiMessageParameters)
            });
        });
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
        const exitUrl = 'https://exiturl.test';

        it('sets locale from configuration request, caches it, uses it for errors', () =>
            new Promise(done => {
                const controller = RunnerController();
                controller.install(controllerConfig);

                const setLocaleSpy = vi.spyOn(__, 'setLocale');

                configurationLoader.mockResolvedValue({
                    providers: [],
                    options: { exitUrl },
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

        it('renders locale selection page if multi-language delivery is provided', () => {
            const controller = RunnerController();
            controller.install(controllerConfig);
            controller.runnerConfiguration = {
                deliveryExecutionId: controllerParams.deliveryExecutionId,
                options: {
                    exitUrl,
                    localization: {
                        supportedLocales: ['en_GB', 'ru_RU']
                    },
                    locale: 'ru_RU'
                }
            };

            vi.spyOn(urlBuilder, 'urlFromResourceConfig').mockImplementationOnce((id, endpoint) => {
                expect(endpoint).toEqual(controllerConfig.endpoints.deliveryExecutionLocale);
                return controllerConfig.deliveryExecutionLocale;
            });

            controller.showLanguageSelection();

            const props = LanguageSelectionPage.mock.calls[0][1];

            expect(props).toEqual({
                submitSelectionEndpoint: controllerConfig.deliveryExecutionLocale,
                supportedLocales: ['en_GB', 'ru_RU'],
                defaultLocale: 'ru_RU',
                jwtTokenHandler: void 0
            });
        });

        it('maintains the default language selection endpoint if the battery distribution is empty', () => {
            const controller = RunnerController();
            controller.install(controllerConfig);
            controller.runnerConfiguration = {
                deliveryExecutionId: controllerParams.deliveryExecutionId,
                options: {
                    exitUrl,
                    localization: {
                        supportedLocales: ['en_GB', 'ru_RU']
                    },
                    locale: 'ru_RU'
                },
                batteryContext: { batteryDistribution: {} }
            };

            vi.spyOn(urlBuilder, 'urlFromResourceConfig').mockImplementationOnce((id, endpoint) => {
                expect(endpoint).toEqual(controllerConfig.endpoints.deliveryExecutionLocale);
                return controllerConfig.deliveryExecutionLocale;
            });

            controller.showLanguageSelection();

            const props = LanguageSelectionPage.mock.calls[0][1];

            expect(props).toEqual({
                submitSelectionEndpoint: controllerConfig.deliveryExecutionLocale,
                supportedLocales: ['en_GB', 'ru_RU'],
                defaultLocale: 'ru_RU',
                jwtTokenHandler: void 0
            });
        });

        it('maintains the default language selection endpoint if the battery distribution ID is empty', () => {
            const controller = RunnerController();
            controller.install(controllerConfig);
            controller.runnerConfiguration = {
                deliveryExecutionId: controllerParams.deliveryExecutionId,
                options: {
                    exitUrl,
                    localization: {
                        supportedLocales: ['en_GB', 'ru_RU']
                    },
                    locale: 'ru_RU'
                },
                batteryContext: { batteryDistribution: { id: null } }
            };

            vi.spyOn(urlBuilder, 'urlFromResourceConfig').mockImplementationOnce((id, endpoint) => {
                expect(endpoint).toEqual(controllerConfig.endpoints.deliveryExecutionLocale);
                return controllerConfig.deliveryExecutionLocale;
            });

            controller.showLanguageSelection();

            const props = LanguageSelectionPage.mock.calls[0][1];

            expect(props).toEqual({
                submitSelectionEndpoint: controllerConfig.deliveryExecutionLocale,
                supportedLocales: ['en_GB', 'ru_RU'],
                defaultLocale: 'ru_RU',
                jwtTokenHandler: void 0
            });
        });

        it('renders provides different language selection endpoint in battery context', () => {
            const controller = RunnerController();
            controller.install(controllerConfig);
            controller.runnerConfiguration = {
                deliveryExecutionId: controllerParams.deliveryExecutionId,
                options: {
                    exitUrl,
                    localization: {
                        supportedLocales: ['en_GB', 'ru_RU']
                    },
                    locale: 'ru_RU'
                },
                batteryContext: { batteryDistribution: { id: '29226311-eb31-4b7b-9640-c4951232d426' } }
            };

            vi.spyOn(urlBuilder, 'urlFromResourceConfig').mockImplementationOnce((id, endpoint) => {
                expect(endpoint).toEqual(controllerConfig.endpoints.batteryDistributionLocale);
                return controllerConfig.batteryDistributionLocale;
            });

            controller.showLanguageSelection();

            const props = LanguageSelectionPage.mock.calls[0][1];

            expect(props).toEqual({
                submitSelectionEndpoint: controllerConfig.batteryDistributionLocale,
                supportedLocales: ['en_GB', 'ru_RU'],
                defaultLocale: 'ru_RU',
                jwtTokenHandler: void 0
            });
        });

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

    describe('kiosk', () => {
        let controller;

        const startControllerParams = { deliveryExecutionId: 'dx123', refreshTokenId: 'rt123' };

        const createController = () => {
            controller = RunnerController();

            controller.logger = { info: () => {} };
            controller.install({
                exitPageRoutes: { error: 'errorRoute123' },
                runnerConfiguration: { themes: {} },
                endpoints: {}
            });
            configurationLoader.mockResolvedValue({
                providers: [],
                options: {
                    kiosk: { enabled: true, minVersion: '1.2.3' },
                    exitUrl: 'https://exiturl.test'
                },
                serviceCallId: 'sc123'
            });
            vi.spyOn(controller, 'showLanguageSelection').mockResolvedValue();
        };

        const mockTestRunner = () => {
            document.body.innerHTML = '<div id="page"></div>';
            testRunnerFactory.registerProvider('foo', {
                loadAreaBroker() {
                    return {};
                },
                install() {},
                init() {}
            });
        };

        beforeEach(() => {
            mockTestRunner();
            createController();
        });

        afterEach(() => {
            document.body.innerHTML = '';
            controller = null;
        });

        it('validates on controller-start: success case', () =>
            new Promise((done, fail) => {
                vi.spyOn(controller, 'handleError').mockImplementation(fail);
                controller.start(startControllerParams);

                vi.waitFor(async () => {
                    expect(controller.kioskService).toBeTruthy();
                    expect(controller.kioskService.validateMinVersion).toHaveBeenCalled();
                    expect(controller.kioskService.validateProcessDenyList).toHaveBeenCalled();
                }).then(() => {
                    controller.stop();
                    done();
                });
            }));

        it.each([
            [
                'usage',
                {
                    reason: 'lockdown-missing',
                    details: {},
                    getError: () => {},
                    validationFuncName: 'validateMinVersion'
                }
            ],
            [
                'minVersion',
                {
                    reason: 'lockdown-version',
                    details: { required: '1.2.3', detected: '1.0.0' },
                    getError: kioskErr => {
                        kioskErr.requiredVersion = '1.2.3';
                        kioskErr.detectedVersion = '1.0.0';
                    },
                    validationFuncName: 'validateMinVersion'
                }
            ],
            [
                'processDenyList',
                {
                    reason: 'lockdown-processes-on-launch',
                    details: { processes: 'pr-a, pr-b' },
                    getError: kioskErr => {
                        kioskErr.denyProcesses = [
                            { name: 'pr-a', label: 'Process A' },
                            { name: 'pr-b', label: 'Process B' }
                        ];
                    },
                    validationFuncName: 'validateProcessDenyList'
                }
            ]
        ])(
            'validates %s on controller-start: handles and logs error',
            (name, { reason, details, getError, validationFuncName }) =>
                new Promise(done => {
                    const kioskErr = new KioskError('oh no');
                    getError(kioskErr);
                    const mockKioskService = {
                        validateMinVersion: vi.fn(),
                        validateProcessDenyList: vi.fn()
                    };
                    kioskServiceFactory.mockReturnValue(mockKioskService);

                    mockKioskService[validationFuncName].mockRejectedValue(kioskErr);

                    vi.spyOn(controller, 'handleError').mockImplementation(err => {
                        expect(controller.kioskService).toBeTruthy();
                        expect(controller.kioskService[validationFuncName]).toHaveBeenCalled();
                        expect(err).toBe(kioskErr);
                        expect(securityLog).toHaveBeenCalledWith(
                            expect.objectContaining({
                                reason,
                                details
                            })
                        );
                        controller.stop();
                        done();
                    });

                    controller.start(startControllerParams);
                })
        );
    });
});