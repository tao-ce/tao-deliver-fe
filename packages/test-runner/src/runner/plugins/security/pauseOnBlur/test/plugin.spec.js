// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../../../../feedback', async importOriginal => {
    const originalModule = await importOriginal();
    return Object.assign({ __esModule: true }, originalModule, {
        showNavigationFeedback: vi.fn().mockImplementation(() => Promise.resolve())
    });
});
vi.mock('module'); // needed by taoTests/runner/proxy
vi.mock('../../forceFullscreen/fullscreenApi', () => Object.assign({ __esModule: true }, { default: vi.fn() }));

import { tick } from 'svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import { getTestStateStore, getTestSessionStatusStore } from '../../../../testsStateStore.js';
import { showNavigationFeedback } from '../../../../feedback';
import { DeferredPromise } from '@oat-sa-private/tao-item-runner-qtinui/src/runner/interactions/util/promise.js';
import lifecycle from 'page-lifecycle';
import fullscreenApiFactory from '../../forceFullscreen/fullscreenApi.js';

vi.mock('page-lifecycle', () => {
    const listeners = {};
    const mock = {
        addEventListener: (evt, listener) => {
            if (!Array.isArray(listeners[evt])) {
                listeners[evt] = [];
            }
            listeners[evt] = [...listeners[evt], listener];
        },
        removeEventListener: (evt, listener) => {
            listeners[evt] = listeners[evt].filter(l => l !== listener);
        },
        dispatchEvent: evt => {
            listeners[evt.type].forEach(listener => {
                listener(evt);
            });
        }
    };
    return {
        __esModule: true,
        default: mock,
        ...mock
    };
});

describe('pauseOnBlur plugin', () => {
    let container;
    let testProviderApi;
    let fullscreenApi;
    const serviceCallId = 'test-session-jfm';

    function createTestRunner() {
        const runner = testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });
        runner.getPluginConfig = () => ({
            threshold: 20
        });
        return runner;
    }

    function createFullscreenApiMock() {
        let isFullscreenResult = false;
        const fullscreenApiMock = {
            isFullscreen: vi.fn().mockImplementation(() => isFullscreenResult),
            enterFullscreen: vi.fn().mockImplementation(() => {
                isFullscreenResult = true;
            })
        };
        return fullscreenApiMock;
    }

    const proxyCallTestActionSpy = vi.fn().mockImplementation(() => Promise.resolve());

    beforeEach(() => {
        proxyCallTestActionSpy.mockClear();

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
            init: () => {},
            callTestAction: proxyCallTestActionSpy
        });
        testRunnerFactory.registerProvider('foo', testProviderApi);
        fullscreenApi = createFullscreenApiMock();
        fullscreenApiFactory.mockReturnValue(fullscreenApi);
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        showNavigationFeedback.mockClear();
        fullscreenApiFactory.mockClear();
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

    it("Don't show navigation feedback on active state", () =>
        new Promise((done, fail) => {
            const runner = createTestRunner();

            runner
                .on('error', fail)
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => vi.fn());

                    // Trigger onblur event
                    const stateChangeEvent = new Event('statechange');
                    stateChangeEvent.newState = 'active';
                    lifecycle.dispatchEvent(stateChangeEvent);

                    vi.waitFor(() => {
                        expect(showNavigationFeedback).not.toHaveBeenCalled();
                        expect(proxyCallTestActionSpy).not.toHaveBeenCalled();
                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('show Navigation feedback onBlur event and go to fullscreen mode', () =>
        new Promise((done, fail) => {
            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();

            runner
                .on('error', fail)
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);

                    // Trigger onblur event
                    const stateChangeEvent = new Event('statechange');
                    stateChangeEvent.newState = 'passive';
                    lifecycle.dispatchEvent(stateChangeEvent);
                    expect(showNavigationFeedback).not.toHaveBeenCalled();

                    vi.waitFor(() => {
                        expect(showNavigationFeedback).toHaveBeenCalled();
                        expect(showNavigationFeedback.mock.calls[0][0]).toMatchObject({ isSecurity: true });

                        feedbackDeferred.resolve({});
                        tick().then(() => {
                            // on onDone the screen should be in fullscreen mode
                            expect(fullscreenApi.isFullscreen()).toBe(true);
                            runner.destroy();
                        });
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('onBlur trigger security events', () =>
        new Promise((done, fail) => {
            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();
            const testConfig = runner.getConfig();
            const autoresume = testConfig.options?.plugins?.pauseOnBlur?.autoresume === false ? false : true;

            runner
                .on('error', fail)
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);

                    // Trigger onblur event
                    const stateChangeEvent = new Event('statechange');
                    stateChangeEvent.newState = 'passive';
                    lifecycle.dispatchEvent(stateChangeEvent);

                    vi.waitFor(() => {
                        expect(showNavigationFeedback).toHaveBeenCalled();

                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('security-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toEqual({
                            action: 'flag',
                            reason: 'blur-attempt'
                        });

                        feedbackDeferred.resolve({});
                    });
                })
                .on('security-showed', e => {
                    expect(e).toEqual({
                        plugin: 'pauseOnBlur',
                        autoresume: autoresume,
                        action: 'pause',
                        category: 'examinee',
                        subcategory: 'navigation',
                        message: 'Test taker left test screen.'
                    });
                })
                .on('security-closed', e => {
                    expect(e).toEqual({
                        plugin: 'pauseOnBlur',
                        autoresume: autoresume
                    });
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('avoid open twice the Navigation message', () =>
        new Promise((done, fail) => {
            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();
            const testConfig = runner.getConfig();
            const autoresume = testConfig.options?.plugins?.pauseOnBlur?.autoresume === false ? false : true;

            runner
                .on('error', fail)
                .on('render', () => {
                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);

                    // Trigger onblur event
                    const stateChangeEvent = new Event('statechange');
                    stateChangeEvent.newState = 'passive';
                    lifecycle.dispatchEvent(stateChangeEvent);

                    // Trigger onfocus event
                    stateChangeEvent.newState = 'active';
                    lifecycle.dispatchEvent(stateChangeEvent);

                    stateChangeEvent.newState = 'hidden';
                    lifecycle.dispatchEvent(stateChangeEvent);

                    vi.waitFor(() => {
                        expect(showNavigationFeedback).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        feedbackDeferred.resolve({});
                    });
                })
                .on('security-showed', e => {
                    expect(e).toEqual({
                        plugin: 'pauseOnBlur',
                        autoresume: autoresume,
                        action: 'pause',
                        category: 'examinee',
                        subcategory: 'navigation',
                        message: 'Test taker left test screen.'
                    });
                })
                .on('security-closed', e => {
                    expect(e).toEqual({
                        plugin: 'pauseOnBlur',
                        autoresume: autoresume
                    });
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('on print, adds special style to hide item', () =>
        new Promise((done, fail) => {
            expect.assertions(2);

            const runner = createTestRunner();
            runner
                .on('error', fail)
                .on('render', () => {
                    expect(document.head.innerHTML).toContain(', .qti-item-container { display: none !important }');
                    runner.trigger('renderitem');
                })
                .on('renderitem', () => {
                    expect(document.head.innerHTML).toContain(', .qti-item-container { display: none !important }');
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('triggers disablenav when activating, and enablenav when deactivating', () =>
        new Promise((done, fail) => {
            const statusStore = getTestSessionStatusStore(serviceCallId);

            let feedbackDeferred = new DeferredPromise();
            const runner = createTestRunner();

            const enablenavSpy = vi.fn();
            const disablenavSpy = vi.fn();

            runner
                .on('error', fail)
                .on('render', () => {
                    statusStore.set('interacting');

                    showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);

                    // Trigger onblur event
                    const stateChangeEvent = new Event('statechange');
                    stateChangeEvent.newState = 'passive';
                    lifecycle.dispatchEvent(stateChangeEvent);

                    vi.waitFor(() => {
                        expect(showNavigationFeedback).toHaveBeenCalled();

                        feedbackDeferred.resolve({});
                    });
                })
                .on('disablenav', disablenavSpy)
                .on('enablenav', enablenavSpy)
                .on('security-showed', () => {
                    expect(disablenavSpy).toHaveBeenCalled();
                })
                .on('security-closed', () => {
                    vi.waitFor(() => {
                        expect(enablenavSpy).toHaveBeenCalled();
                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('triggers enablenav when leaving item', () =>
        new Promise((done, fail) => {
            expect.assertions(2);

            const statusStore = getTestSessionStatusStore(serviceCallId);

            const runner = createTestRunner();

            const enablenavSpy = vi.fn();
            const disablenavSpy = vi.fn();

            runner
                .on('error', fail)
                .on('render', () => {
                    statusStore.set('interacting');

                    runner.on('move', () => {
                        runner.destroy();
                    });
                    runner.next();
                })
                .on('disablenav', disablenavSpy)
                .on('enablenav', enablenavSpy)
                .on('destroy', () => {
                    expect(disablenavSpy).not.toHaveBeenCalled();
                    expect(enablenavSpy).toHaveBeenCalledWith({ reason: 'securityOverlay' });

                    done();
                })
                .init();
        }));
});
