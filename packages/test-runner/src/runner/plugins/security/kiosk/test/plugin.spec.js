// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module'); // needed by taoTests/runner/proxy
vi.mock('taoDeliverAppsCommon/service/runner/kiosk.js');
vi.mock('../../common/securityLog.js');

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import { getTestStateStore } from '../../../../testsStateStore.js';
import kioskServiceFactory from 'taoDeliverAppsCommon/service/runner/kiosk.js';
import { securityLog } from '../../common/securityLog.js';
import KioskError from 'taoDeliverAppsCommon/core/error/KioskError.js';

describe('kiosk plugin', () => {
    let container;
    let testProviderApi;
    const serviceCallId = 'test-session-jfm';

    function createTestRunner(runnerOptions) {
        const plugins = [pluginFactory];

        const runner = testRunnerFactory('foo', plugins, {
            renderTo: container,
            serviceCallId,
            options: runnerOptions
        });
        return runner;
    }

    let kioskServiceMock;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        testProviderApi = {
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            loadAreaBroker() {
                return {};
            },
            loadProxy() {
                return proxyFactory('foo', {});
            },
            init() {
                return this.getProxy().init();
            }
        };
        proxyFactory.registerProvider('foo', {
            init: () => {}
        });
        testRunnerFactory.registerProvider('foo', testProviderApi);

        kioskServiceMock = {
            _breachCallback: null,
            _triggerBreach: function () {
                this._breachCallback({ deviceInfo: { aa: { bb: 'cc' } }, processList: ['pr-c', 'pr-d'] });
            },
            _createProcessDenyListError: () => {
                const err = new KioskError();
                err.denyProcesses = [
                    { name: 'pr-a', label: 'Pr A' },
                    { name: 'pr-b', label: 'Pr B' }
                ];
                return err;
            },
            validateProcessDenyList: vi.fn().mockResolvedValue(),
            addBreachListener: vi.fn().mockImplementation(function (cb) {
                this._breachCallback = cb;
            }),
            removeBreachListener: vi.fn()
        };
        kioskServiceFactory.mockReturnValue(kioskServiceMock);
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('renders and destroys without error', () =>
        new Promise((done, fail) => {
            const runner = createTestRunner();

            runner
                .on('error', fail)
                .on('render', () => {
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(runner.getState('destroy')).toBe(true);
                    done();
                })
                .init();
        }));

    it('on loaditem, validates process denyList and triggers error if needed', () =>
        new Promise((done, fail) => {
            const runner = createTestRunner({ kiosk: { enabled: true } });
            const denyProcessesError = kioskServiceMock._createProcessDenyListError();

            runner
                .on('error.test1', fail)
                .on('render', () => {
                    runner.after('loaditem.test1', () => {
                        runner.off('loaditem.test1');
                        expect(kioskServiceMock.validateProcessDenyList).toHaveBeenCalled();
                        expect(securityLog).not.toHaveBeenCalled();

                        kioskServiceMock.validateProcessDenyList.mockRejectedValue(denyProcessesError);
                        runner.off('error.test1').on('error.test2', err => {
                            expect(err).toBe(denyProcessesError);
                            expect(securityLog).toHaveBeenCalledWith(runner, 'lockdown-processes-after-launch', {
                                processes: 'pr-a, pr-b'
                            });
                            runner.destroy();
                        });
                        runner.loadItem('item2');
                    });
                    kioskServiceMock.validateProcessDenyList.mockResolvedValue();
                    runner.loadItem('item1');
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('on kiosk breach event, logs security event if pauseOnBreach=false', () =>
        new Promise((done, fail) => {
            const runner = createTestRunner({ kiosk: { enabled: true, pauseOnBreach: false } });
            const securityEventsSpy = vi.fn();

            runner
                .on('error', fail)
                .on('security-showed', securityEventsSpy)
                .on('security-closed', securityEventsSpy)
                .on('render', () => {
                    expect(kioskServiceMock.addBreachListener).toHaveBeenCalled();
                    kioskServiceMock._triggerBreach();

                    expect(securityLog).toHaveBeenCalledWith(runner, 'lockdown-breach', {
                        deviceInfo: JSON.stringify({ aa: { bb: 'cc' } }),
                        processList: 'pr-c, pr-d'
                    });

                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(securityEventsSpy).not.toHaveBeenCalled();
                    expect(kioskServiceMock.removeBreachListener).toHaveBeenCalled();
                    done();
                })
                .init();
        }));

    it('on kiosk breach event, triggers proctor pause if pauseOnBreach=true', () =>
        new Promise((done, fail) => {
            const runner = createTestRunner({ kiosk: { enabled: true, pauseOnBreach: true } });
            const securityShowedSpy = vi.fn();
            const securityClosedSpy = vi.fn();

            vi.useFakeTimers();

            runner
                .on('error', fail)
                .on('security-showed', securityShowedSpy)
                .on('security-closed', securityClosedSpy)
                .on('render', async () => {
                    expect(kioskServiceMock.addBreachListener).toHaveBeenCalled();
                    kioskServiceMock._triggerBreach();

                    expect(securityLog).toHaveBeenCalledWith(runner, 'lockdown-breach', {
                        deviceInfo: JSON.stringify({ aa: { bb: 'cc' } }),
                        processList: 'pr-c, pr-d'
                    });
                    expect(securityShowedSpy).toHaveBeenCalledWith(
                        expect.objectContaining({ plugin: 'lockdown-breach-pause', autoresume: false })
                    );
                    vi.advanceTimersByTime(400);
                    expect(securityClosedSpy).toHaveBeenCalledWith(
                        expect.objectContaining({ plugin: 'lockdown-breach-pause', autoresume: false })
                    );

                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(kioskServiceMock.removeBreachListener).toHaveBeenCalled();
                    done();
                })
                .init();
        }));
});
