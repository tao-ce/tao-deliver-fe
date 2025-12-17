// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2024 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import previewerController from '../previewerRunner.js';
import LaunchError from 'taoDeliverAppsCommon/core/error/LaunchError.js';

let mockContainer = document;

vi.mock('../page.js', () => ({
    __esModule: true,
    default: controller =>
        Object.assign(controller, {
            container: mockContainer,
            logger: {
                info: vi.fn()
            },
            router: {
                dispatch: vi.fn()
            }
        })
}));

const mockRunner = {
    on: vi.fn()
};
const mockRunnerComponent = {
    listeners: { on: { ready: [], error: [] } },
    trigger(eventName) {
        mockRunnerComponent.listeners.on[eventName].forEach(cb => cb(mockRunner));
    },
    on: vi.fn().mockImplementation((eventName, cb) => {
        mockRunnerComponent.listeners.on[eventName].push(cb);
        return mockRunnerComponent;
    }),
    after: vi.fn().mockImplementation(() => mockRunnerComponent),
    off: vi.fn(),
    show: vi.fn(),
    destroy: vi.fn()
};

vi.mock('taoTests/runner/runnerComponentSimple', () => ({
    __esModule: true,
    default: () => mockRunnerComponent
}));
// eslint-disable-next-line
import runnerComponentFactory from 'taoTests/runner/runnerComponentSimple';

function mockLocation(locationInstance) {
    const originalWindow = { ...window };
    const windowSpy = vi.spyOn(global, 'window', 'get');
    windowSpy.mockImplementation(() => ({
        ...originalWindow,
        location: {
            get pathname() {
                return locationInstance.pathname;
            }
        }
    }));
}

describe('PreviewerRunner controller', () => {
    let controller;
    let locationInstance = {};

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="page">
                <div id="page-main"></div>
            </div>
        `;
        controller = previewerController();

        locationInstance.pathname = '/test-preview/';
        mockLocation(locationInstance);
    });

    afterEach(() => {
        controller.stop();
        document.body.innerHTML = '';
        delete locationInstance.pathname;
        vi.clearAllMocks();
    });

    it('stops and dispatches error if no unitId', () => {
        vi.spyOn(controller, 'stop');
        controller.start();
        expect(controller.stop).toHaveBeenCalledTimes(1);
        expect(controller.router.dispatch).toHaveBeenCalledTimes(1);
        expect(controller.router.dispatch.mock.calls[0][0]).toBe('/error');
        expect(controller.router.dispatch.mock.calls[0][1]).toMatchObject({
            internalError: expect.any(LaunchError)
        });
    });

    it('loads the configuration', () =>
        new Promise(done => {
            vi.spyOn(controller, 'startRunner').mockImplementation(() => {
                expect(controller.router.dispatch).toHaveBeenCalledTimes(0);
                expect(controller.runnerConfiguration).toBeTypeOf('object');
                expect(Object.keys(controller.runnerConfiguration)).toEqual(
                    expect.arrayContaining(['staticUrl', 'providers', 'proxy', 'options', 'themes', 'params'])
                );

                expect(controller.runnerConfiguration.providers.plugins).toBeInstanceOf(Array);
                expect(controller.runnerConfiguration.providers.plugins).not.toEqual(
                    expect.arrayContaining([
                        {
                            id: 'bookletExport',
                            module: 'taoQtiNuiTest/runner/plugins/export/bookletExport/plugin',
                            category: 'content'
                        }
                    ])
                );
                done();
            });

            const params = {
                unitId: 'unit-1'
            };
            controller.start(params);
        }));

    it('booklet-export plugin is included only for its route', () =>
        new Promise(done => {
            vi.spyOn(controller, 'startRunner').mockImplementation(() => {
                expect(controller.router.dispatch).toHaveBeenCalledTimes(0);
                expect(controller.runnerConfiguration.providers.plugins).toBeInstanceOf(Array);
                expect(controller.runnerConfiguration.providers.plugins).toEqual(
                    expect.arrayContaining([
                        {
                            id: 'bookletExport',
                            module: 'taoQtiNuiTest/runner/plugins/export/bookletExport/plugin',
                            category: 'content'
                        }
                    ])
                );
                expect(controller.runnerConfiguration.options?.plugins?.bookletExport).toEqual({
                    interactive: false,
                    start: void 0,
                    end: void 0,
                    renderDelay: void 0
                });
                done();
            });

            const params = {
                unitId: 'unit-1'
            };
            locationInstance.pathname = '/booklet-export/';
            controller.start(params);
        }));

    it('passes the required params', () =>
        new Promise(done => {
            const expectedParams = {
                unitId: 'unit-1',
                requestId: 'req-8',
                locale: 'es_ES',
                item: '5',
                jwt: 'jwt-token'
            };

            vi.spyOn(controller, 'startRunner').mockImplementation(() => {
                expect(controller.runnerConfiguration).toBeTypeOf('object');
                expect(controller.runnerConfiguration.params).toEqual(expectedParams);
                done();
            });

            controller.start({
                ...expectedParams,
                foo: 'bar'
            });
        }));

    it('passes the required params if booklet-export', () =>
        new Promise(done => {
            const expectedParamsCommon = {
                unitId: 'unit-1',
                requestId: 'req-8',
                locale: 'es_ES',
                item: '5',
                jwt: 'jwt-token'
            };
            const paramsBooklet = {
                bookletInteractive: 'true',
                bookletStart: '2',
                bookletEnd: '5',
                bookletRenderDelay: '888'
            };

            vi.spyOn(controller, 'startRunner').mockImplementation(() => {
                expect(controller.runnerConfiguration).toBeTypeOf('object');
                expect(controller.runnerConfiguration.params).toEqual(expectedParamsCommon);
                expect(controller.runnerConfiguration.options?.plugins?.bookletExport).toEqual({
                    interactive: true,
                    start: 2,
                    end: 5,
                    renderDelay: 888
                });
                done();
            });

            locationInstance.pathname = '/booklet-export/';
            controller.start({
                ...expectedParamsCommon,
                ...paramsBooklet,
                foo: 'bar'
            });
        }));

    it('creates the runner component', async () => {
        vi.spyOn(controller, 'startRunner');

        const params = {
            unitId: 'unit-1'
        };
        controller.start(params);

        await vi.waitFor(() => {
            expect(controller.startRunner).toHaveBeenCalled();
            expect(controller.runnerComponent).toBeTruthy();
            expect(controller.runnerComponent.on).toHaveBeenCalled();
            expect(controller.runnerComponent.on.mock.calls[0][0]).toBe('ready');
            controller.runnerComponent.trigger('ready');
            expect(controller.logger.info).toHaveBeenCalledTimes(1);
            expect(controller.logger.info).toHaveBeenCalledWith('The test runner is ready to serve the test');
        });
    });

    it('destroys runnerComponent when stopped', async () => {
        vi.spyOn(controller, 'startRunner');

        const params = {
            unitId: 'unit-1'
        };
        controller.start(params);

        await vi.waitFor(() => {
            expect(controller.startRunner).toHaveBeenCalled();
            expect(controller.runnerComponent).toBeTruthy();
            controller.stop();
            expect(controller.runnerComponent).toBeNull();
            expect(mockRunnerComponent.destroy).toHaveBeenCalled();
        });
    });

    it('do nothing if controller was not started', () => {
        const newController = previewerController();
        controller.stop();
        expect(newController.runnerComponent).toBeNull();
    });
});
