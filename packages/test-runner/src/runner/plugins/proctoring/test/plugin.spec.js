// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

vi.mock('../../../feedback', async () => {
    const originalModule = await vi.importActual('../../../feedback');
    return Object.assign({ __esModule: true }, originalModule, {
        showNavigationFeedback: vi.fn().mockImplementation(() => Promise.resolve())
    });
});

vi.mock('@oat-sa-private/ui-components', async () => {
    const originalModule = await vi.importActual('@oat-sa-private/ui-components');
    return Object.assign({ __esModule: true }, originalModule, {
        showNotification: vi.fn()
    });
});

import { tick } from 'svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { getTestSessionStatusStore, getTestStateStore } from '../../../testsStateStore.js';
import preset from '../../navigation/navigator/test/testStoreMocks/presetOneSectionNonLinear.json';
import { testSessionStatus, deliveryExecutionStatuses } from '../../../session/sessionStates.js';
import { getTimersStore, clearAllTimersStores } from '../../../timers/timersStore.js';
import { showNavigationFeedback } from '../../../feedback';
import { showNotification } from '@oat-sa-private/ui-components';
import { DeferredPromise } from '@oat-sa-private/tao-item-runner-qtinui/src/runner/interactions/util/promise.js';
import { wait } from '../../../util/common.js';
import testStoreFactory from 'taoTests/runner/testStore';

const pluginName = 'proctoring';

function setupLayout() {
    const div = document.createElement('div');
    div.innerHTML = `
        <main>
        </main>`;
    return div;
}

const serviceCallId = 'test-session-plswrk';

function setupStore(testServiceCallId, data) {
    const stateStore = getTestStateStore(testServiceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext({
        ...data.testContext,
        isProctored: true,
        status: deliveryExecutionStatuses.interacting
    });
}

function getSocketProxyMock() {
    let callbacks = {};
    return {
        on: vi.fn().mockImplementation((eventName, callback) => {
            callbacks[eventName] = callback;
        }),
        emit: vi.fn().mockImplementation((eventName, ...other) => {
            if (callbacks[eventName]) {
                callbacks[eventName](...other);
            }
        })
    };
}

describe('proctoring plugin', () => {
    let container;
    let getContainer;
    let getMainArea;
    let clearAreasContent;
    let testProviderApi;
    let statusStore;
    let testStateStore;
    let socketProxy;

    const enableItemSpy = vi.fn();
    const jumpSpy = vi.fn().mockResolvedValue();
    const disableItemSpy = vi.fn().mockResolvedValue();
    const pauseSpy = vi.fn();
    const resumeSpy = vi.fn();
    const renderSpy = vi.fn();

    function createRunner() {
        const runner = testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });

        //relies on test-runner implementation doing these things
        runner.socketProxy = socketProxy;
        renderSpy.mockImplementation(() => {
            if (runner.getTestContext()?.status === deliveryExecutionStatuses.suspended) {
                runner.trigger('proctor-pause');
            }
        });
        pauseSpy.mockImplementation(() => {
            runner.trigger('pause');
            return Promise.resolve();
        });
        resumeSpy.mockImplementation(() => {
            runner.trigger('resume');
            return Promise.resolve();
        });
        enableItemSpy.mockImplementation(() => {
            statusStore.set(testSessionStatus.interacting);
            return Promise.resolve();
        });

        runner.before('destroy', () => runner.getPluginStore(pluginName).then(store => store.clear()));

        return runner.on('error', err => {
            throw err;
        });
    }

    beforeEach(() => {
        enableItemSpy.mockClear();
        disableItemSpy.mockClear();
        jumpSpy.mockClear();
        pauseSpy.mockClear();
        resumeSpy.mockClear();

        socketProxy = getSocketProxyMock();

        container = setupLayout();
        getContainer = () => container;
        getMainArea = () => container.querySelector('main');
        clearAreasContent = () => {
            getMainArea().innerHTML = '';
        };

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getMainArea,
                    clearAreasContent
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            loadTestStore() {
                return testStoreFactory(serviceCallId);
            },
            enableItem: enableItemSpy,
            disableItem: disableItemSpy,
            jump: jumpSpy,
            pause: pauseSpy,
            resume: resumeSpy,
            render: renderSpy,
            install() {
                this.getCurrentItemIdentifier = () => preset.testContext.itemIdentifier;
            },
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);

        setupStore(serviceCallId, Object.assign({}, preset));
        statusStore = getTestSessionStatusStore(serviceCallId);
        testStateStore = getTestStateStore(serviceCallId);
    });

    afterEach(async () => {
        testRunnerFactory.clearProviders();
        container.innerHTML = '';
        statusStore.clear();
        testStateStore.clear();
        clearAllTimersStores();
        showNavigationFeedback.mockClear();
        showNotification.mockClear();
    });

    describe('socket', () => {
        it('subscribes to socket and emits corresponding test-runner events', () =>
            new Promise(done => {
                const runner = createRunner();
                const runnerTriggerSpy = vi.spyOn(runner, 'trigger');
                runner
                    .on('init', () => {
                        expect(socketProxy.on).toHaveBeenCalled();
                        runner.off('proctor-pause proctor-resume proctor-extratime proctor-terminate'); //remove handlers to have clean count of runnerTriggerSpy calls
                        runnerTriggerSpy.mockClear();

                        socketProxy.emit('proctoring-acs-action', { action: 'pause' });
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        expect(runnerTriggerSpy).toHaveBeenCalledWith('proctor-pause');
                        runnerTriggerSpy.mockClear();

                        socketProxy.emit('proctoring-acs-action', { action: 'resume' });
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        expect(runnerTriggerSpy).toHaveBeenCalledWith('proctor-resume');
                        runnerTriggerSpy.mockClear();

                        socketProxy.emit('proctoring-acs-action', { action: 'update', extra_time: 5 });
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        expect(runnerTriggerSpy).toHaveBeenCalledWith('proctor-extratime', { extraTimeMs: 5 * 60000 });
                        runnerTriggerSpy.mockClear();

                        socketProxy.emit('proctoring-acs-action', { action: 'pause', extra_time: 2 });
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(2);
                        expect(runnerTriggerSpy).toHaveBeenNthCalledWith(1, 'proctor-pause');
                        expect(runnerTriggerSpy).toHaveBeenNthCalledWith(2, 'proctor-extratime', {
                            extraTimeMs: 2 * 60000
                        });
                        runnerTriggerSpy.mockClear();

                        socketProxy.emit('proctoring-acs-action', { action: 'resume', extra_time: 0 });
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(2);
                        expect(runnerTriggerSpy).toHaveBeenNthCalledWith(1, 'proctor-resume');
                        expect(runnerTriggerSpy).toHaveBeenNthCalledWith(2, 'proctor-extratime', { extraTimeMs: 0 });
                        runnerTriggerSpy.mockClear();

                        socketProxy.emit('proctoring-acs-action', { action: 'terminate' });
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        expect(runnerTriggerSpy).toHaveBeenNthCalledWith(1, 'proctor-terminate');
                        runnerTriggerSpy.mockClear();

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            }));

        it('can postpone emitting test-runner events', () =>
            new Promise(done => {
                const runner = createRunner();
                const runnerTriggerSpy = vi.spyOn(runner, 'trigger');
                runner
                    .on('init', () => {
                        expect(socketProxy.on).toHaveBeenCalled();
                        runner.off('proctor-pause proctor-resume proctor-extratime proctor-terminate'); //remove handlers to have clean count of runnerTriggerSpy calls
                        runnerTriggerSpy.mockClear();

                        runner.trigger('proctor-socket-unsubscribe');
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        socketProxy.emit('proctoring-acs-action', { action: 'pause' });
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        runner.trigger('proctor-socket-subscribe');
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(3);
                        expect(runnerTriggerSpy).toHaveBeenNthCalledWith(3, 'proctor-pause');
                        runnerTriggerSpy.mockClear();

                        runner.trigger('proctor-socket-unsubscribe');
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        socketProxy.emit('proctoring-acs-action', { action: 'pause' });
                        socketProxy.emit('proctoring-acs-action', { action: 'resume' });
                        socketProxy.emit('proctoring-acs-action', { action: 'update', extra_time: 5 });
                        socketProxy.emit('proctoring-acs-action', { action: 'pause', extra_time: 2 });
                        socketProxy.emit('proctoring-acs-action', { action: 'resume' });
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        runner.trigger('proctor-socket-subscribe');
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(4);
                        expect(runnerTriggerSpy).toHaveBeenNthCalledWith(3, 'proctor-resume');
                        expect(runnerTriggerSpy).toHaveBeenNthCalledWith(4, 'proctor-extratime', {
                            extraTimeMs: 2 * 60000
                        });
                        runnerTriggerSpy.mockClear();

                        runner.trigger('proctor-socket-unsubscribe');
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        socketProxy.emit('proctoring-acs-action', { action: 'terminate' });
                        socketProxy.emit('proctoring-acs-action', { action: 'pause' });
                        socketProxy.emit('proctoring-acs-action', { action: 'update', extra_time: 1 });
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(1);
                        runner.trigger('proctor-socket-subscribe');
                        expect(runnerTriggerSpy).toHaveBeenCalledTimes(3);
                        expect(runnerTriggerSpy).toHaveBeenNthCalledWith(3, 'proctor-terminate');
                        runnerTriggerSpy.mockClear();

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            }));

        it('does nothing if socketProxy was not initialized', () =>
            new Promise(done => {
                const runner = createRunner();
                delete runner.socketProxy;
                runner
                    .on('init', () => {
                        runner.destroy();
                    })
                    .on('destroy', () => {
                        expect(runner.getState('destroy')).toBe(true);
                        done();
                    })
                    .init();
            }));

        it('does nothing if test is not proctored', () =>
            new Promise(done => {
                testStateStore.setTestContext({ ...testStateStore.getTestContext(), isProctored: false });
                const runner = createRunner();
                runner
                    .on('init', () => {
                        expect(socketProxy.on).not.toHaveBeenCalled();
                        runner.destroy();
                    })
                    .on('destroy', () => {
                        expect(runner.getState('destroy')).toBe(true);
                        done();
                    })
                    .init();
            }));
    });

    describe('terminate', () => {
        it('cancels uploads, unloads item, shows feedback, then calls test-runner finish', () =>
            new Promise(done => {
                let feedbackDeferred = new DeferredPromise();
                showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);

                const runner = createRunner();
                const runnerTriggerSpy = vi.spyOn(runner, 'trigger');
                const unloadItemSpy = vi.fn().mockResolvedValue();
                const finishSpy = vi.fn();
                testProviderApi.unloadItem = unloadItemSpy;
                testProviderApi.finish = finishSpy;

                runner
                    .on('init', () => {
                        runner.trigger('proctor-terminate');
                    })
                    .on('unloaditem', unloadItemSpy)
                    .on('finish', () => {
                        expect(runnerTriggerSpy).toHaveBeenCalledWith('itemrunner-cancelAllUploads');
                        expect(unloadItemSpy).toHaveBeenCalled();
                        expect(runnerTriggerSpy).toHaveBeenCalledBefore(unloadItemSpy);
                        expect(showNavigationFeedback.mock.calls[0][0]).toEqual({ isTerminatedByProctor: true });
                        expect(unloadItemSpy).toHaveBeenCalledBefore(showNavigationFeedback);
                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();

                tick().then(() => {
                    feedbackDeferred.resolve();
                });
            }));
    });

    describe('reset', () => {
        it('cancels uploads, unloads item, shows feedback, then triggers proctor-reset-test-confirmed event', () =>
            new Promise(done => {
                let feedbackDeferred = new DeferredPromise();
                showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);

                const runner = createRunner();
                const runnerTriggerSpy = vi.spyOn(runner, 'trigger');
                const unloadItemSpy = vi.fn().mockResolvedValue();
                testProviderApi.unloadItem = unloadItemSpy;

                runner
                    .on('init', () => {
                        runner.trigger('proctor-reset');
                    })
                    .on('unloaditem', unloadItemSpy)
                    .on('proctor-reset-test-confirmed', () => {
                        expect(runnerTriggerSpy).toHaveBeenCalledWith('itemrunner-cancelAllUploads');
                        expect(unloadItemSpy).toHaveBeenCalled();
                        expect(runnerTriggerSpy).toHaveBeenCalledBefore(unloadItemSpy);
                        expect(showNavigationFeedback).toHaveBeenCalled();
                        expect(showNavigationFeedback.mock.calls[0][0]).toEqual({ isResetByProctor: true });
                        expect(unloadItemSpy).toHaveBeenCalledBefore(showNavigationFeedback);
                        // Verify that the confirmed event was triggered after feedback
                        expect(runnerTriggerSpy).toHaveBeenCalledWith('proctor-reset-test');
                        expect(runnerTriggerSpy).toHaveBeenCalledWith('proctor-reset-test-confirmed');
                        done();
                    })
                    .init();

                // Resolve the feedback dialog after a tick
                tick().then(() => {
                    feedbackDeferred.resolve();
                });
            }));

        it('triggers timersservice-stop and unsubscribes from events on reset', () =>
            new Promise(done => {
                const runner = createRunner();
                const runnerTriggerSpy = vi.spyOn(runner, 'trigger');
                const runnerOffSpy = vi.spyOn(runner, 'off');

                runner
                    .on('init', () => {
                        runner.trigger('proctor-reset');

                        // Check that timers are stopped and event handlers are removed
                        expect(runnerTriggerSpy).toHaveBeenCalledWith('timersservice-stop');
                        expect(runnerOffSpy).toHaveBeenCalledWith('proctor-pause');
                        expect(runnerOffSpy).toHaveBeenCalledWith('proctor-resume');
                        expect(runnerOffSpy).toHaveBeenCalledWith('proctor-reset');
                        expect(runnerOffSpy).toHaveBeenCalledWith('proctor-terminate');

                        done();
                    })
                    .init();
            }));
    });

    describe('extra-time', () => {
        it('shows notification when time is added', () =>
            new Promise(done => {
                const timersStore = getTimersStore(serviceCallId);
                timersStore.initializeTimers([
                    {
                        level: 'test',
                        timerValue: {
                            timeAssigned: 60 * 60 * 1000,
                            timeLeft: 60 * 60 * 1000
                        }
                    },
                    {
                        level: 'extra',
                        timerValue: {
                            timeAssigned: 0,
                            timeLeft: 0
                        }
                    }
                ]);

                const runner = createRunner();
                runner
                    .on('init', async () => {
                        expect(showNotification).not.toHaveBeenCalled();

                        runner.trigger('proctor-extratime', { extraTimeMs: 8 * 60000 });
                        await wait(5);
                        expect(showNotification).toHaveBeenCalledTimes(1);
                        expect(showNotification.mock.calls[0][0]).toEqual(
                            expect.objectContaining({ title: '8 minutes of extra time granted' })
                        );
                        showNotification.mockClear();

                        timersStore.updateTimeLeft([
                            {
                                level: 'extra',
                                timerValue: {
                                    timeAssigned: 8 * 60000,
                                    timeLeft: 7 * 60000
                                }
                            }
                        ]);
                        runner.trigger('proctor-extratime', { extraTimeMs: 120 * 60000 });
                        await wait(5);
                        expect(showNotification).toHaveBeenCalledTimes(1);
                        expect(showNotification.mock.calls[0][0]).toEqual(
                            expect.objectContaining({ title: 'Extra time limit adjusted to 2 hours' })
                        );
                        showNotification.mockClear();

                        runner.trigger('proctor-extratime', { extraTimeMs: 0 });
                        await wait(5);
                        expect(showNotification).toHaveBeenCalledTimes(1);
                        expect(showNotification.mock.calls[0][0]).toEqual(
                            expect.objectContaining({ title: 'Extra time has been removed' })
                        );
                        showNotification.mockClear();

                        timersStore.updateTimeLeft([
                            {
                                level: 'extra',
                                timerValue: {
                                    timeAssigned: 0,
                                    timeLeft: 0
                                }
                            }
                        ]);
                        runner.trigger('proctor-extratime', { extraTimeMs: 0 });
                        await wait(5);
                        expect(showNotification).not.toHaveBeenCalled();

                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            }));

        it('shows notification once, for launch with initial extraTime', () =>
            new Promise(done => {
                const timersStore = getTimersStore(serviceCallId);
                timersStore.initializeTimers([
                    {
                        level: 'extra',
                        timerValue: {
                            timeAssigned: 11 * 60 * 1000,
                            timeLeft: 11 * 60 * 1000
                        }
                    }
                ]);

                const runner = createRunner();

                runner
                    .on('init', async () => {
                        expect(showNotification).not.toHaveBeenCalled();
                        await wait(5);

                        expect(showNotification).toHaveBeenCalledTimes(1);
                        expect(showNotification.mock.calls[0][0]).toEqual(
                            expect.objectContaining({ title: 'Extra time limit adjusted to 11 minutes' })
                        );

                        runner.destroy();
                    })
                    .on('error', err => {
                        throw err;
                    })
                    .on('destroy', done)
                    .init();
            }));

        it('does not show notification again, for relaunch with initial extraTime', () =>
            new Promise(done => {
                const timersStore = getTimersStore(serviceCallId);
                timersStore.initializeTimers([
                    {
                        level: 'extra',
                        timerValue: {
                            timeAssigned: 11 * 60 * 1000,
                            timeLeft: 11 * 60 * 1000
                        }
                    }
                ]);

                const runner = createRunner();
                runner
                    .on('init', async () => {
                        expect(showNotification).not.toHaveBeenCalled();
                        await wait(5);

                        expect(showNotification).not.toHaveBeenCalled();

                        runner.destroy();
                    })
                    .on('error', err => {
                        throw err;
                    })
                    .on('destroy', done);

                runner
                    .getPluginStore(pluginName)
                    .then(pluginStore => pluginStore.setItem('extraTimeMs', 11 * 60 * 1000))
                    .then(() => {
                        runner.init();
                    });
            }));
    });

    describe('pause/resume', () => {
        it('on pause show feedback, render wait screen, resume on click', () =>
            new Promise(done => {
                const runner = createRunner();
                runner
                    .on('render', () => {
                        runner.loadItem(testStateStore.getTestContext().itemIdentifier);
                    })
                    .on('renderitem', () => {
                        //interacting
                        expect(statusStore.get()).toBe(testSessionStatus.initial);
                        expect(testStateStore.getTestContext().status).toBe(deliveryExecutionStatuses.interacting);
                        expect(runner.getState('pause')).toBeFalsy();
                        expect(pauseSpy).not.toHaveBeenCalled();
                        expect(disableItemSpy).not.toHaveBeenCalled();

                        let feedbackDeferred = new DeferredPromise();
                        showNavigationFeedback.mockImplementation(() => feedbackDeferred.promise);
                        const runnerTriggerSpy = vi.spyOn(runner, 'trigger');

                        //socket pause, show feedback
                        runner.trigger('proctor-pause');
                        tick()
                            .then(tick)
                            .then(() => {
                                expect(testStateStore.getTestContext().status).toBe(
                                    deliveryExecutionStatuses.suspended
                                );
                                expect(statusStore.get()).toBe(testSessionStatus.proctorwait);
                                expect(pauseSpy).toHaveBeenCalledTimes(1);
                                expect(runner.getState('pause')).toBe(true); //provider should set state
                                expect(disableItemSpy).toHaveBeenCalledTimes(1);
                                expect(showNavigationFeedback).toHaveBeenCalled();
                                expect(showNavigationFeedback.mock.calls[0][0]).toEqual({ isPausedByProctor: true });
                                expect(
                                    runnerTriggerSpy.mock.calls.some(args => args[0] === 'timersservice-stop')
                                ).toBeTruthy();
                                expect(container).toMatchSnapshot();

                                //wait screen
                                feedbackDeferred.resolve();
                                tick().then(() => {
                                    expect(container).toMatchSnapshot();

                                    //socket resume, update wait screen
                                    runner.trigger('proctor-resume');
                                    tick().then(() => {
                                        expect(testStateStore.getTestContext().status).toBe(
                                            deliveryExecutionStatuses.interacting
                                        );
                                        expect(statusStore.get()).toBe(testSessionStatus.proctorwait);
                                        expect(resumeSpy).not.toHaveBeenCalled();
                                        expect(enableItemSpy).not.toHaveBeenCalled();
                                        expect(container).toMatchSnapshot();

                                        //button click, close wait screen
                                        const resumeBtn = container.querySelector('button[name="proctor-resume"]');
                                        resumeBtn.click();
                                        tick()
                                            .then(tick)
                                            .then(() => {
                                                expect(resumeSpy).toHaveBeenCalledTimes(1);
                                                expect(runner.getState('pause')).toBe(false); //provider should set state
                                                expect(enableItemSpy).toHaveBeenCalledTimes(1);
                                                expect(container).toMatchSnapshot();

                                                runner.destroy();
                                            });
                                    });
                                });
                            });
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            }));

        it('when already paused on init', () =>
            new Promise(done => {
                testStateStore.setTestContext({
                    ...testStateStore.getTestContext(),
                    status: deliveryExecutionStatuses.suspended
                });
                const runner = createRunner();
                runner
                    .on('render', () => {
                        expect(statusStore.get()).toBe(testSessionStatus.proctorwait);
                        tick().then(() => {
                            expect(container).toMatchSnapshot();
                            expect(showNavigationFeedback).not.toHaveBeenCalled();
                            expect(jumpSpy).not.toHaveBeenCalled();

                            runner.trigger('proctor-resume');
                            tick().then(() => {
                                const resumeBtn = container.querySelector('button[name="proctor-resume"]');
                                expect(resumeBtn).toBeTruthy();
                                resumeBtn.click();
                                tick().then(() => {
                                    //jump to self (its provider implementation should load item)
                                    expect(jumpSpy).toHaveBeenCalledWith(
                                        testStateStore.getTestContext().itemPosition,
                                        void 0
                                    );

                                    runner.destroy();
                                });
                            });
                        });
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            }));
    });
});
