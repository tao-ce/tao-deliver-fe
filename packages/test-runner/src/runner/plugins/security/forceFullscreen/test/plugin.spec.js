// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../fullscreenApi.js', () => Object.assign({ __esModule: true }, { default: vi.fn() }));

vi.mock('../../../../feedback', async importOriginal => {
    const originalModule = await importOriginal();
    return Object.assign({ __esModule: true }, originalModule, {
        showNavigationFeedback: vi.fn().mockImplementation(() => Promise.resolve({})),
        getNavigationFeedbacksStore: vi.fn().mockImplementation(() => ({
            get: vi.fn().mockReturnValue({}),
            set: vi.fn(),
            clear: vi.fn(),
            isSecurityShown: vi.fn().mockReturnValue(false),
            cancel: vi.fn()
        }))
    });
});
vi.mock('module'); // needed by taoTests/runner/proxy

// to avoid dealing with real testrunner proxy
vi.mock('../../common/securityLog.js', () => ({
    __esModule: true,
    securityLog: vi.fn().mockResolvedValue({})
}));

import { tick } from 'svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { getTestStateStore } from '../../../../testsStateStore.js';
import fullscreenApiFactory from '../fullscreenApi.js';
import { showNavigationFeedback } from '../../../../feedback';
import { DeferredPromise } from '@oat-sa-private/tao-item-runner-qtinui/src/runner/interactions/util/promise.js';
import { securityLog } from '../../common/securityLog.js';
import { wait } from '../../../../util/common.js';

describe('forceFullscreen plugin', () => {
    let container;
    let testProviderApi;
    let fullscreenApiMock;
    const serviceCallId = 'test-session-jfm';

    function createTestRunner() {
        return testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });
    }

    function createFullscreenApiMock() {
        let callbackInstance;
        let isFullscreenResult = false;
        fullscreenApiMock = {
            isFullscreen: vi.fn().mockImplementation(() => isFullscreenResult),
            enterFullscreen: vi.fn().mockImplementation(() => {
                //mock underlying native behavior:
                //this action triggers browser event to which we listen with `addChangeListener`
                //and also it changes return value of `isFullscreen`
                isFullscreenResult = true;
                callbackInstance();
            }),
            exitFullscreen: vi.fn().mockImplementation(() => {
                isFullscreenResult = false;
                callbackInstance();
            }),
            addChangeListener: vi.fn().mockImplementation(callback => {
                callbackInstance = callback;
            }),
            removeChangeListener: vi.fn()
        };
        return fullscreenApiMock;
    }

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
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);
        fullscreenApiFactory.mockReturnValue(createFullscreenApiMock());
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        fullscreenApiFactory.mockClear();
        showNavigationFeedback.mockClear();
        securityLog.mockClear();
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(runner.getState('destroy')).toBe(true);
                    done();
                })
                .init();
        }));

    it('call enterFullscreen', () =>
        new Promise(done => {
            expect.assertions(3);

            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);
                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        expect(showNavigationFeedback).toHaveBeenCalled();
                        expect(showNavigationFeedback.mock.calls[0][0]).toEqual({
                            isSecurity: true,
                            pluginName: 'forceFullscreen'
                        });
                        //wait screen
                        feedbackDeferred.resolve({});
                        tick().then(() => {
                            expect(fullscreenApiMock.enterFullscreen).toHaveBeenCalled();
                        });
                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('if user escapes from fullscreen, triggers security events', () =>
        new Promise(done => {
            expect.assertions(7);

            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);
                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        expect(showNavigationFeedback).toHaveBeenCalled();
                        expect(showNavigationFeedback.mock.calls[0][0]).toEqual({
                            isSecurity: true,
                            pluginName: 'forceFullscreen'
                        });
                        //wait screen
                        feedbackDeferred.resolve({});
                        tick().then(() => {
                            expect(fullscreenApiMock.enterFullscreen).toHaveBeenCalled();
                            const api = fullscreenApiFactory();
                            api.exitFullscreen();
                        });
                    });
                })
                .on('security-showed', e => {
                    expect(e).toEqual({
                        plugin: 'forceFullscreen',
                        autoresume: true,
                        action: 'pause',
                        category: 'examinee',
                        subcategory: 'navigation',
                        message: 'Test taker tried to go out from full screen mode.'
                    });
                })
                .on('security-closed', e => {
                    expect(e).toEqual({
                        plugin: 'forceFullscreen',
                        autoresume: true
                    });

                    expect(securityLog).toHaveBeenCalled();
                    expect(securityLog.mock.calls[0][1]).toBe('exit-fullscreen-attempt');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('triggers security events only after "threshold" delay', () =>
        new Promise(done => {
            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();
            runner.getPluginConfig = () => ({
                listenerTimeout: 0,
                threshold: 50
            });
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);
                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        expect(showNavigationFeedback).toHaveBeenCalled();
                        expect(showNavigationFeedback.mock.calls[0][0]).toEqual({
                            isSecurity: true,
                            pluginName: 'forceFullscreen'
                        });
                        //wait screen
                        feedbackDeferred.resolve({});
                        tick().then(async () => {
                            expect(fullscreenApiMock.enterFullscreen).toHaveBeenCalled();
                            const api = fullscreenApiFactory();

                            const securityShowedCallback = vi.fn();
                            runner.on('security-showed', securityShowedCallback);

                            api.exitFullscreen();

                            await wait(2);
                            expect(securityShowedCallback).not.toHaveBeenCalled();

                            await wait(150);
                            expect(securityShowedCallback).toHaveBeenCalled();
                            runner.destroy();
                        });
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('adds fullscreen mode change listener and removes it on destroy', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        expect(fullscreenApiMock.addChangeListener).toHaveBeenCalled();
                        expect(fullscreenApiMock.removeChangeListener).not.toHaveBeenCalled();

                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    expect(fullscreenApiMock.removeChangeListener).toHaveBeenCalled();

                    done();
                })
                .init();
        }));

    it('exits fullscreen when reaching the thank you page', () =>
        new Promise(done => {
            expect.assertions(2);

            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();
            runner.getPluginConfig = () => ({
                exitOnFinish: true
            });
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);
                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        feedbackDeferred.promise.then(() => {
                            expect(fullscreenApiMock.enterFullscreen).toHaveBeenCalled();
                            runner.trigger('finish');
                        });
                        feedbackDeferred.resolve({});
                    });
                })
                .after('finish', () => {
                    expect(fullscreenApiMock.exitFullscreen).toHaveBeenCalled();
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('keeps fullscreen when reaching the thank you page if option disabled', () =>
        new Promise(done => {
            expect.assertions(2);

            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();
            runner.getPluginConfig = () => ({
                exitOnFinish: false
            });
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);
                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        feedbackDeferred.promise.then(() => {
                            expect(fullscreenApiMock.enterFullscreen).toHaveBeenCalled();
                            runner.trigger('finish');
                        });
                        feedbackDeferred.resolve({});
                    });
                })
                .after('finish', () => {
                    expect(fullscreenApiMock.exitFullscreen).not.toHaveBeenCalled();
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('keeps fullscreen till the end if inside a tests battery', () =>
        new Promise(done => {
            expect.assertions(2);

            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();
            runner.getPluginConfig = () => ({
                exitOnFinish: true
            });
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);
                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        feedbackDeferred.promise
                            .then(() => {
                                expect(fullscreenApiMock.enterFullscreen).toHaveBeenCalled();
                            })
                            .then(() => {
                                runner.trigger('testfinished', { nextDeliveryExecutionUrl: 'url' });
                            })
                            .then(() => {
                                runner.trigger('finish');
                            });
                        feedbackDeferred.resolve({});
                    });
                })
                .after('finish', () => {
                    expect(fullscreenApiMock.exitFullscreen).not.toHaveBeenCalled();
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('on print, adds special style to hide item', () =>
        new Promise(done => {
            expect.assertions(2);

            fullscreenApiMock.isFullscreen.mockReturnValue(true);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(document.head.innerHTML).toContain(', .qti-item-container { display: none !important }');
                    runner.trigger('renderitem');
                })
                .on('renderitem', async () => {
                    try {
                        expect(document.head.innerHTML).toContain(', .qti-item-container { display: none !important }');

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('triggers disablenav when activating, and enablenav when deactivating', () =>
        new Promise(done => {
            expect.assertions(6);

            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();

            const enablenavSpy = vi.fn();
            const disablenavSpy = vi.fn();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);
                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        expect(showNavigationFeedback).toHaveBeenCalled();
                        expect(showNavigationFeedback.mock.calls[0][0]).toEqual({
                            isSecurity: true,
                            pluginName: 'forceFullscreen'
                        });
                        //wait screen
                        feedbackDeferred.resolve({});
                        tick().then(() => {
                            expect(fullscreenApiMock.enterFullscreen).toHaveBeenCalled();
                            const api = fullscreenApiFactory();
                            api.exitFullscreen();
                        });
                    });
                })
                .on('disablenav', disablenavSpy)
                .on('enablenav', enablenavSpy)
                .on('security-showed', () => {
                    expect(disablenavSpy).toHaveBeenCalledWith({ reason: 'securityOverlay' });
                })
                .on('security-closed', () => {
                    tick().then(() => {
                        expect(enablenavSpy).toHaveBeenCalledWith({ reason: 'securityOverlay' });
                        expect(enablenavSpy).toHaveBeenCalledAfter(disablenavSpy);
                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('triggers enablenav when leaving item', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = createTestRunner();

            const enablenavSpy = vi.fn();
            const disablenavSpy = vi.fn();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    runner.on('move', () => {
                        runner.destroy();
                    });
                    runner.next();
                })
                .on('disablenav', disablenavSpy)
                .on('enablenav', enablenavSpy)
                .on('destroy', () => {
                    expect(disablenavSpy).toHaveBeenCalledWith({ reason: 'securityOverlay' });
                    expect(enablenavSpy).toHaveBeenCalledWith({ reason: 'securityOverlay' });
                    expect(enablenavSpy).toHaveBeenCalledAfter(disablenavSpy);
                    done();
                })
                .init();
        }));
});
