// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

vi.mock('../feedback', async () => {
    const originalModule = await vi.importActual('../feedback');
    return Object.assign({ __esModule: true }, originalModule, {
        showNavigationFeedback: vi.fn()
    });
});

vi.mock('testRunnerDynamicModulesIndex', async () => {
    const originalModule = await vi.importActual('testRunnerDynamicModulesIndex');
    return Object.assign({ __esModule: true }, originalModule, {
        getNavigationFeedbackConfig: vi.fn(),
        checkNavigationFeedback: vi.fn()
    });
});

vi.mock('core/timer', function () {
    const state = {};
    const resume = vi.fn(() => (state.running = true));
    const pause = vi.fn(() => (state.running = false));
    const getDuration = vi.fn();
    const is = vi.fn(stateName => state[stateName]);
    const timerFactory = vi.fn((config = {}) => {
        state.running = config.autoStart !== false;
        return { resume, pause, getDuration, is };
    });
    return {
        __esModule: true,
        default: Object.assign(timerFactory, { resume, pause, getDuration, state, is })
    };
});

vi.mock('../timers/socketProxy.js', () => ({
    socketProxyFactory: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        onProxyEvent: vi.fn(),
        emit: vi.fn(),
        connect: vi.fn().mockResolvedValue(),
        disconnect: vi.fn().mockResolvedValue()
    }))
}));

import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner.js';
import testsStateStore, { getTestStateStore, getTestSessionStatusStore } from '../testsStateStore';
import {
    deliveryExecutionStatuses,
    itemSessionStates,
    testSessionStates,
    testSessionStatus
} from '../session/sessionStates.js';
import { default as provider, providerName } from '../qti.js';
import { showNavigationFeedback, clearAllNavigationFeedbacksStores } from '../feedback/index.js';
import { checkNavigationFeedback, getNavigationFeedbackConfig } from 'testRunnerDynamicModulesIndex';
import { getTestSessionUserDataService, clearAllTestSessionsUserData } from '../session/testSessionUserDataService.js';
import timer from 'core/timer';
import { settingsPlugin, highlighterPlugin, scratchpadPlugin, readAloudPlugin } from '../plugins';
import { cloneDeep } from 'lodash';
import { getConfigStore } from '../config/configStore.js';
import { DeferredPromise } from '@oat-sa-private/tao-item-runner-qtinui/src/runner/interactions/util/promise.js';
import { getItemPendingOperationsStore } from '@oat-sa-private/tao-item-runner-qtinui/src/runner/itemsPendingOperationsStore.js';

const sampleItem = {};
const sampleTestMap = {
    parts: {
        p1: {
            id: 'p1',
            sections: {
                s1: {
                    id: 's1',
                    items: {
                        'item-1': {
                            id: 'item-1',
                            position: 0
                        },
                        'item-2': {
                            id: 'item-2',
                            position: 1
                        }
                    }
                }
            },
            stats: {
                total: 2
            }
        }
    }
};
let noop;

describe('QTI NUI test runner provider', () => {
    it('should register', () => {
        expect(() => testRunnerFactory.getProvider(providerName)).toThrow();

        testRunnerFactory.registerProvider(providerName, provider);

        expect(() => testRunnerFactory.getProvider(providerName)).not.toThrow();
        expect(testRunnerFactory.getProvider(providerName)).toBe(provider);

        testRunnerFactory.clearProviders();
    });
});

describe('QTI NUI test runner behavior', () => {
    beforeEach(() => {
        //register the default providers
        testRunnerFactory.registerProvider(providerName, provider);
        itemRunnerFactory.register('qtinui', {
            init(itemData, initDone) {
                initDone();
            },
            render(itemContainer, renderDone) {
                renderDone();
            },
            getState() {
                return {};
            }
        });
        proxyFactory.registerProvider('qtinui', {
            init() {
                return {};
            }
        });
        // reset timer mock
        timer.mockClear();
        timer.resume.mockClear();
        timer.pause.mockClear();
        timer.getDuration.mockReset();
        timer.state.running = false;

        showNavigationFeedback.mockClear();
        getNavigationFeedbackConfig.mockClear();
        checkNavigationFeedback.mockClear();
        getNavigationFeedbackConfig.mockReturnValue({});
        checkNavigationFeedback.mockReturnValue(null);
    });

    afterEach(() => {
        testsStateStore.clear();
        getConfigStore().clear();
        testRunnerFactory.clearProviders();
        proxyFactory.clearProviders();
        itemRunnerFactory.providers = {};
        clearAllTestSessionsUserData();
        clearAllNavigationFeedbacksStores();
    });

    it('cannot initialize misconfigured', () => {
        expect(() => {
            const runner = testRunnerFactory(providerName);
            runner.init();
        }).toThrowErrorMatchingSnapshot();
    });

    it('initialize', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-a12b';

            const init = vi.fn(() => ({
                testContext: {
                    position: 0
                },
                testMap: {
                    total: 0
                }
            }));
            proxyFactory.registerProvider('foo', { init });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: document.body
            });
            const statusStore = getTestSessionStatusStore(serviceCallId);
            const stateStore = getTestStateStore(serviceCallId);

            expect(statusStore.get()).toEqual('initial');
            expect(stateStore.getTestContext()).toEqual({});
            expect(stateStore.getTestMap()).toEqual({});

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    expect(init).toHaveBeenCalled();
                    expect(statusStore.get()).toEqual('loading');
                    expect(stateStore.getTestContext()).toMatchObject({ position: 0 });
                    expect(stateStore.getTestMap()).toEqual({ total: 0 });
                    expect(getConfigStore().get()).toEqual(
                        expect.objectContaining({
                            serviceCallId,
                            proxy: 'foo'
                        })
                    );
                    done();
                });
            runner.init();
        }));

    it('fails to retrieve test data during initialization', () =>
        new Promise(done => {
            const runner = testRunnerFactory(providerName, [], {
                serviceCallId: '124',
                renderTo: document.body
            });
            runner.on('error', error => {
                expect(error.message).toEqual('No data received for this test');
                done();
            });
            runner.init();
        }));

    it('renders the test layout during initialization', () =>
        new Promise(done => {
            const container = document.createElement('section');
            const init = vi.fn(() => ({
                testContext: {},
                testMap: {}
            }));

            proxyFactory.registerProvider('foo', { init });
            const runner = testRunnerFactory(providerName, [], {
                serviceCallId: '123',
                proxy: 'foo',
                renderTo: container
            });

            expect(container).toMatchSnapshot();
            expect(runner.getAreaBroker()).not.toHaveProperty('getContentArea');
            expect(runner.getAreaBroker()).not.toHaveProperty('getHeaderArea');

            runner
                .on('error', error => {
                    throw error;
                })
                .on('init', () => {
                    expect(container).toMatchSnapshot();

                    expect(runner.getAreaBroker()).toHaveProperty('getContentArea');
                    expect(runner.getAreaBroker().getContentArea()).toBeInstanceOf(HTMLElement);
                    expect(runner.getAreaBroker()).toHaveProperty('getHeaderArea');
                    expect(runner.getAreaBroker().getHeaderArea()).toBeInstanceOf(HTMLElement);

                    done();
                });
            runner.init();
        }));

    it('renders the test top bar with some plugins', () =>
        new Promise(done => {
            const container = document.createElement('section');
            const init = vi.fn(() => ({
                testContext: {},
                testMap: {}
            }));

            proxyFactory.registerProvider('foo', { init });
            const runner = testRunnerFactory(
                providerName,
                [settingsPlugin, highlighterPlugin, scratchpadPlugin, readAloudPlugin],
                {
                    serviceCallId: '123',
                    proxy: 'foo',
                    renderTo: container
                }
            );

            runner.on('init', () => {
                expect(container.querySelector('#test-top-bar')).toMatchSnapshot();
                done();
            });
            runner.init();
        }));

    it('render compute the next action and loads an item', () =>
        new Promise(done => {
            expect.assertions(12); //important here

            timer.getDuration.mockReturnValue(3000);
            const serviceCallId = 'test-session-4b2e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));
            const proctorSocketSubscribeSpy = vi.fn();
            const proctorSocketUnsubscribeSpy = vi.fn();
            const proxyGetItem = vi.fn(() => {
                //here to check that `proctor-socket-unsubscribe` is called when loadItem starts, not finishes
                expect(proctorSocketUnsubscribeSpy).toHaveBeenCalled();
                return sampleItem;
            });
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem
            });

            const itemRunnerInit = vi.fn((itemData, initDone) => initDone());
            const itemRunnerRender = vi.fn((itemContainer, renderDone) => renderDone());
            itemRunnerFactory.register('itemRunnerFoo', {
                init: itemRunnerInit,
                render: itemRunnerRender
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
                renderTo: container
            });

            const statusStore = getTestSessionStatusStore(serviceCallId);

            expect(statusStore.get()).toEqual('initial');

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    expect(statusStore.get()).toEqual('loading');
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('render', () => {
                    expect(statusStore.get()).toEqual('loading');
                })
                .on('loaditem', () => {
                    expect(statusStore.get()).toEqual('loading');
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                    expect(proctorSocketUnsubscribeSpy).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    expect(statusStore.get()).toEqual('interacting');
                    expect(itemRunnerInit).toHaveBeenCalled();
                    expect(itemRunnerRender).toHaveBeenCalled();
                    expect(proctorSocketSubscribeSpy).not.toHaveBeenCalled();
                    runner.on('proctor-socket-subscribe.after-renderitem', () => {
                        done();
                    });
                })
                .on('proctor-socket-subscribe', proctorSocketSubscribeSpy)
                .on('proctor-socket-unsubscribe', proctorSocketUnsubscribeSpy);
            runner.init();
        }));

    it('moves to the next item', () =>
        new Promise(done => {
            timer.getDuration.mockReturnValue(3000);
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: proxyCallItemAction
            });

            const proctorSocketSubscribeSpy = vi.fn();
            const proctorSocketUnsubscribeSpy = vi.fn();
            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .after('renderitem', () => {
                    runner.off('renderitem');
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                    setTimeout(() => {
                        runner
                            .on('proctor-socket-subscribe', proctorSocketSubscribeSpy)
                            .on('proctor-socket-unsubscribe', proctorSocketUnsubscribeSpy);

                        runner.on('unloaditem', () => {
                            runner.off('unloaditem');
                            expect(proctorSocketUnsubscribeSpy).toHaveBeenCalled();
                            expect(proctorSocketSubscribeSpy).not.toHaveBeenCalled();

                            runner.on('renderitem', () => {
                                runner.off('renderitem');
                                //2nd item
                                expect(proxyCallItemAction).toHaveBeenCalledWith(
                                    'item-1',
                                    'move',
                                    expect.objectContaining({
                                        direction: 'next',
                                        scope: 'item',
                                        ref: noop
                                    }),
                                    noop
                                );
                                expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);
                                expect(checkNavigationFeedback).toHaveBeenCalled();
                                expect(proctorSocketSubscribeSpy).not.toHaveBeenCalled();
                                runner.on('proctor-socket-subscribe.after-renderitem', () => {
                                    done();
                                });
                            });
                        });
                        runner.next();
                    }, 0);
                });

            runner.init();
        }));

    it('moves to the previous item', () =>
        new Promise(done => {
            timer.getDuration.mockReturnValue(3000);
            const serviceCallId = 'test-session-fbc2e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.off('renderitem');
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);

                    runner.on('renderitem', () => {
                        runner.off('renderitem');
                        //2nd item
                        expect(proxyCallItemAction).toHaveBeenCalledWith(
                            'item-2',
                            'move',
                            expect.objectContaining({
                                direction: 'previous',
                                scope: 'item',
                                ref: noop
                            }),
                            noop
                        );
                        expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                        expect(checkNavigationFeedback).toHaveBeenCalled();
                        done();
                    });
                    runner.previous();
                });

            runner.init();
        }));

    it('jumps to the given item', () =>
        new Promise(done => {
            timer.getDuration.mockReturnValue(3000);
            const serviceCallId = 'test-session-afhgr2e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: {
                    parts: {
                        p1: {
                            id: 'p1',
                            sections: {
                                s1: {
                                    id: 's1',
                                    items: {
                                        'item-1': {
                                            id: 'item-1',
                                            position: 0
                                        },
                                        'item-12': {
                                            id: 'item-12',
                                            position: 12
                                        }
                                    }
                                }
                            },
                            stats: {
                                total: 2
                            }
                        }
                    }
                }
            }));

            const proxyGetItem = vi.fn(() => sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 12,
                    itemIdentifier: 'item-12',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.off('renderitem');
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);

                    runner.on('renderitem', () => {
                        runner.off('renderitem');
                        //2nd item
                        expect(proxyCallItemAction).toHaveBeenCalledWith(
                            'item-1',
                            'move',
                            expect.objectContaining({
                                direction: 'jump',
                                scope: 'item',
                                ref: 12
                            }),
                            noop
                        );
                        expect(proxyGetItem).toHaveBeenCalledWith('item-12', noop);
                        expect(checkNavigationFeedback).toHaveBeenCalled();
                        done();
                    });
                    runner.jump(12);
                });

            runner.init();
        }));

    it('triggers testfinished event when receiving batteryContext', () =>
        new Promise(done => {
            expect.assertions(3);

            const serviceCallId = 'test-session-4lfce';
            const container = document.createElement('section');
            const proxyContext = {
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                batteryContext: {
                    nextDeliveryExecutionUrl: 'https://foo.bar.baz',
                    currentDelivery: '74ceaab43b34',
                    nextDelivery: 'f48c27e03af9',
                    newExecutionId: 'oof#f48c27e03af9#0a92fab3230134cca6eadd9898325b9b2ae67998#foo-bar-baz',
                    documentType: 'object',
                    newExecution: 'oof#f48c27e03af9#0a92fab3230134cca6eadd9898325b9b2ae67998#foo-bar-baz'
                }
            };

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn(() => sampleItem);

            const proxyCallItemAction = vi.fn(() => proxyContext);
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                    runner.next();
                })
                .on('testfinished', context => {
                    expect(context).toBe(proxyContext.batteryContext);
                    done();
                });

            runner.init();
        }));

    it('jump to the same item loads it if it is not loaded yet', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-afhgr2e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 12,
                    itemIdentifier: 'item-12',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: {
                    parts: {
                        p1: {
                            id: 'p1',
                            sections: {
                                s1: {
                                    id: 's1',
                                    items: {
                                        'item-1': {
                                            id: 'item-1',
                                            position: 0
                                        },
                                        'item-12': {
                                            id: 'item-12',
                                            position: 12
                                        }
                                    }
                                }
                            },
                            stats: {
                                total: 2
                            }
                        }
                    }
                }
            }));

            const proxyGetItem = vi.fn(() => sampleItem);
            const proxyCallItemAction = vi.fn();

            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('error', e => {
                    throw e;
                })
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.off('renderitem');
                    proxyGetItem.mockClear();

                    runner.on('unloaditem', () => {
                        runner.off('unloaditem');

                        runner.on('renderitem', () => {
                            runner.off('renderitem');
                            expect(proxyCallItemAction).not.toHaveBeenCalled(); //no 'move'
                            expect(proxyGetItem).toHaveBeenCalledWith('item-12', noop); //unload item was loaded

                            done();
                        });
                        expect(runner.getTestContext().itemPosition).toBe(12);
                        runner.jump(12);
                    });

                    runner.unloadItem('item-12');
                });

            runner.init();
        }));

    it('skips to the next item', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.off('renderitem');
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);

                    runner.on('renderitem', () => {
                        runner.off('renderitem');
                        //2nd item
                        expect(proxyCallItemAction).toHaveBeenCalledWith(
                            'item-1',
                            'skip',
                            expect.objectContaining({
                                direction: 'next',
                                scope: 'item',
                                ref: noop
                            }),
                            noop
                        );
                        expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);
                        expect(checkNavigationFeedback).toHaveBeenCalled();
                        done();
                    });
                    runner.skip('item', 'next');
                });

            runner.init();
        }));

    it('skips to the previous item', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.off('renderitem');
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);

                    runner.on('renderitem', () => {
                        runner.off('renderitem');
                        //2nd item
                        expect(proxyCallItemAction).toHaveBeenCalledWith(
                            'item-2',
                            'skip',
                            expect.objectContaining({
                                direction: 'previous',
                                scope: 'item',
                                ref: noop
                            }),
                            noop
                        );
                        expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                        expect(checkNavigationFeedback).toHaveBeenCalled();
                        done();
                    });
                    runner.skip('item', 'previous');
                });

            runner.init();
        }));

    it('triggers disablenav and enablenav events during move', () =>
        new Promise(done => {
            expect.assertions(7);

            const serviceCallId = 'test-session-4lfce';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn(() => sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.off('renderitem');
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);

                    const onDisableNav = vi.fn();
                    const onEnableNav = vi.fn();

                    runner
                        .on('disablenav', onDisableNav)
                        .on('enablenav', onEnableNav)
                        .on('renderitem', () => {
                            expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);
                            expect(onDisableNav.mock.calls.length).toBe(1);
                            expect(onEnableNav.mock.calls.length).toBeGreaterThan(0);
                            expect(onDisableNav).toHaveBeenLastCalledWith(
                                expect.objectContaining({
                                    reason: 'moving'
                                })
                            );
                            expect(onEnableNav).toHaveBeenLastCalledWith(
                                expect.objectContaining({
                                    reason: 'moving'
                                })
                            );
                            done();
                        });
                    runner.next();
                });

            runner.init();
        }));

    it('triggers disablenav and enablenav events based on itemRunner pendingoperationschange events', () =>
        new Promise(done => {
            expect.assertions(11);

            const serviceCallId = 'test-session-4lfce';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn(() => sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.off('renderitem');
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);

                    const onDisableNav = vi.fn();
                    const onEnableNav = vi.fn();

                    runner
                        .on('error', err => {
                            throw err;
                        })
                        .on('disablenav', onDisableNav)
                        .on('enablenav', onEnableNav)
                        .on('renderitem', () => {
                            expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);
                            expect(onDisableNav.mock.calls.length).toBe(1);
                            expect(onEnableNav.mock.calls.length).toBeGreaterThan(0);
                            onDisableNav.mockClear();
                            onEnableNav.mockClear();

                            runner.itemRunner.trigger('pendingoperationschange', { addedKey: 'tao-uploadKey-123' });
                            //
                            expect(onDisableNav.mock.calls.length).toBe(1);
                            expect(onDisableNav).toHaveBeenLastCalledWith({
                                reason: 'pendingOps',
                                key: 'tao-uploadKey-123'
                            });

                            runner.itemRunner.trigger('pendingoperationschange', { deletedKey: 'tao-uploadKey-123' });
                            expect(onEnableNav.mock.calls.length).toBe(1);
                            expect(onEnableNav).toHaveBeenLastCalledWith({
                                reason: 'pendingOps',
                                key: 'tao-uploadKey-123'
                            });

                            runner.itemRunner.trigger('pendingoperationschange', { cleared: true });
                            expect(onEnableNav.mock.calls.length).toBe(2);
                            expect(onEnableNav).toHaveBeenLastCalledWith({
                                reason: 'pendingOps'
                            });

                            done();
                        });
                    runner.next();
                });

            runner.init();
        }));

    it('triggers error if move proxy request fails', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');
            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));
            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: (itemId, action) =>
                    //eslint-disable-next-line implicit-arrow-linebreak
                    new Promise(() => {
                        if (action === 'move') {
                            throw new Error('error-spy-for-move');
                        }
                    })
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.off('renderitem').on('error', error => {
                        if (error.message === 'error-spy-for-move') {
                            done();
                        } else {
                            throw error;
                        }
                    });
                    runner.next();
                });

            runner.init();
        }));

    it('fires proctor-terminate if move responds with terminated error', () =>
        new Promise(done => {
            const requestResponse = {
                response: {
                    success: false,
                    errorCode: 100,
                    errorMessage: 'Can\'t perform the action "action1" because the test session is terminated',
                    responses: [
                        [
                            {
                                success: false,
                                name: 'action1',
                                id: 'action1id',
                                errorCode: 100,
                                errorMessage:
                                    'Can\'t perform the action "action1" because the test session is terminated',
                                values: {}
                            }
                        ]
                    ]
                }
            };

            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');
            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: (itemId, action) => {
                    if (action === 'move') {
                        return Promise.reject(requestResponse);
                    }
                }
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.on('proctor-terminate', () => {
                        done();
                    });
                    runner.next();
                });

            runner.init();
        }));

    it('finishes the test when the session is closed', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-sdf1e';
            const container = document.createElement('section');

            const finishHandler = vi.fn();

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.closed,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                    expect(finishHandler).not.toHaveBeenCalled();
                })
                .on('finish', finishHandler)
                .on('destroy', () => {
                    expect(finishHandler).toHaveBeenCalled();
                    done();
                })
                .on('error', e => {
                    throw e;
                });

            runner.init();
        }));

    it('fires proctor-pause when the session is suspended on init', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-sdf1e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    status: deliveryExecutionStatuses.suspended,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner
                .on('proctor-pause', () => {
                    expect(runner.getState('init')).toBe(true);
                    done();
                })
                .on('error', e => {
                    throw e;
                });

            runner.init();
        }));

    it('disables/enables given item', () =>
        new Promise(done => {
            expect.assertions(10);

            const serviceCallId = 'test-session-ihg4b2e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));
            const proxyGetItem = vi.fn(() => Promise.resolve(sampleItem));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem
            });

            const itemRunnerInit = vi.fn((itemData, initDone) => initDone());
            const itemRunnerRender = vi.fn((itemContainer, renderDone) => renderDone());
            const itemRunnerSuspend = vi.fn(() => Promise.resolve());
            const itemRunnerResume = vi.fn(() => Promise.resolve());
            itemRunnerFactory.register('itemRunnerFoo', {
                init: itemRunnerInit,
                render: itemRunnerRender,
                suspend: itemRunnerSuspend,
                resume: itemRunnerResume
            });

            const proctorSocketSubscribeSpy = vi.fn();
            const proctorSocketUnsubscribeSpy = vi.fn();
            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
                renderTo: container
            });

            const statusStore = getTestSessionStatusStore(serviceCallId);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('renderitem', () => {
                    //1
                    runner.off('renderitem');
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                    expect(statusStore.get()).toEqual('interacting');
                    proxyGetItem.mockClear();

                    setTimeout(() => {
                        runner
                            .on('proctor-socket-subscribe', proctorSocketSubscribeSpy)
                            .on('proctor-socket-unsubscribe', proctorSocketUnsubscribeSpy);

                        runner.on('disableitem', () => {
                            //2
                            runner.off('disableitem');
                            expect(itemRunnerSuspend).toHaveBeenCalled();
                            expect(proctorSocketUnsubscribeSpy).not.toHaveBeenCalled();
                            statusStore.set('overlay');

                            runner.after('enableitem', () => {
                                //3
                                runner.off('enableitem');
                                expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                                expect(itemRunnerResume).toHaveBeenCalled();
                                expect(statusStore.get()).toEqual('interacting');
                                expect(proctorSocketSubscribeSpy).not.toHaveBeenCalled();
                                runner.on('proctor-socket-subscribe.after-enableitem', () => {
                                    done();
                                });
                            });

                            runner.enableItem('item-1'); //3
                            expect(proctorSocketUnsubscribeSpy).toHaveBeenCalled();
                            expect(proctorSocketSubscribeSpy).not.toHaveBeenCalled();
                        });

                        runner.disableItem('item-1'); //2
                    }, 0);
                });

            runner.init(); //1
        }));

    it('can move after disabling item', () =>
        new Promise(done => {
            expect.assertions(7);

            const serviceCallId = 'test-session-4baz2e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));
            const proxyGetItem = vi.fn(() => sampleItem);
            const proxyCallItemAction = () => {
                expect(getTestSessionStatusStore(serviceCallId).get()).toEqual('loading');
                return {
                    testContext: {
                        state: testSessionStates.interacting,
                        itemPosition: 1,
                        itemIdentifier: 'item-2',
                        sectionId: 's1',
                        testPartId: 'p1'
                    }
                };
            };
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            const statusStore = getTestSessionStatusStore(serviceCallId);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('renderitem', () => {
                    //1
                    runner.off('renderitem');
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);

                    runner.on('disableitem', () => {
                        //2
                        runner.off('disableitem');
                        expect(runner.getItemState('item-1', 'disabled')).toBe(true);

                        const enableitemSpy = vi.fn();
                        statusStore.set('overlay');
                        runner.on('enableitem', enableitemSpy).on('renderitem', () => {
                            //3
                            runner.off('renderitem');
                            runner.off('enableitem');

                            expect(enableitemSpy).not.toHaveBeenCalled();
                            expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);
                            expect(runner.getItemState('item-1', 'disabled')).toBe(false);
                            expect(statusStore.get()).toEqual('interacting');
                            done();
                        });

                        runner.jump('item-2'); //3
                    });

                    runner.disableItem('item-1'); //2
                });

            runner.init(); //1
        }));

    it('controls duration-timer correctly', () =>
        new Promise(done => {
            expect.assertions(14);
            const serviceCallId = 'test-session-5x1y';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));
            const proxyGetItem = vi.fn(() => sampleItem);
            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                callItemAction: proxyCallItemAction
            });

            const itemRunnerInit = vi.fn((itemData, initDone) => initDone());
            const itemRunnerRender = vi.fn((itemContainer, renderDone) => renderDone());
            itemRunnerFactory.register('itemRunnerFoo', {
                init: itemRunnerInit,
                render: itemRunnerRender,
                getState: () => ({})
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
                renderTo: container
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    // timer was created
                    expect(timer).toHaveBeenCalledTimes(1);
                    expect(timer.resume).not.toHaveBeenCalled();
                    expect(timer.is('running')).toBe(false);
                })
                .on('renderitem', () => {
                    runner.off('renderitem');

                    // timer was started
                    expect(timer.resume).toHaveBeenCalledTimes(1);
                    expect(timer.is('running')).toBe(true);

                    // simulate overview open
                    getTestSessionStatusStore(serviceCallId).set(testSessionStatus.overlay);
                    runner.disableItem('item-1');

                    setTimeout(() => {
                        // timer should still be running
                        expect(timer.pause).not.toHaveBeenCalled();
                        expect(timer.is('running')).toBe(true);
                        runner.enableItem('item-1'); // it restores testSessionStatus itself
                    }, 100);

                    setTimeout(() => {
                        // timer was resumed again
                        expect(timer.resume).toHaveBeenCalledTimes(3);
                        expect(timer.is('running')).toBe(true);

                        timer.getDuration.mockReturnValue(12891);

                        // when 2nd item was rendered
                        runner.on('renderitem', () => {
                            expect(proxyCallItemAction).toHaveBeenCalledWith(
                                'item-1',
                                'move',
                                {
                                    direction: 'next',
                                    scope: 'item',
                                    ref: noop,
                                    itemState: { touched: false },
                                    itemResponse: {},
                                    itemDuration: 12.891
                                },
                                noop
                            );

                            // previous timer was paused
                            expect(timer.pause).toHaveBeenCalledTimes(1);
                            // new timer was created for 2nd item
                            expect(timer).toHaveBeenCalledTimes(2);
                            // timer was started again
                            expect(timer.resume).toHaveBeenCalledTimes(4);
                            expect(timer.is('running')).toBe(true);
                            done();
                        });
                        runner.next();
                    }, 200);
                });
            runner.init();
        }));

    it('broadcasts toolbaraction events from TestLayout component', () =>
        new Promise(done => {
            const container = document.createElement('section');
            const init = vi.fn(() => ({
                testContext: {},
                testMap: {}
            }));

            proxyFactory.registerProvider('foo', { init });
            const runner = testRunnerFactory(providerName, [settingsPlugin], {
                serviceCallId: '123',
                proxy: 'foo',
                renderTo: container
            });

            runner.on('init', () => {
                const button = container.querySelector('button[title="Settings"]');
                button.click();
            });
            runner.on('toolbaraction', detail => {
                expect(detail).toBe('settings');
                done();
            });
            runner.init();
        }));

    it('updates the tools store from the item runner', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-7afd';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));
            const proxyGetItem = vi.fn(() => sampleItem);
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem
            });

            const itemRunnerInit = vi.fn((itemData, initDone) => initDone());
            const itemRunnerRender = vi.fn((itemContainer, renderDone) => renderDone());
            itemRunnerFactory.register('itemRunnerFoo', {
                init: itemRunnerInit,
                render: itemRunnerRender,
                getState: () => ({})
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
                renderTo: container
            });

            const statusStore = getTestSessionStatusStore(serviceCallId);

            runner.on('renderitem', () => {
                expect(statusStore.get()).toEqual('interacting');

                const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
                expect(toolsStore.getItemsToolsState()).toMatchObject({});

                runner.itemRunner.trigger('toolsstatechange', { choiceElimination: ['c1', 'c2'] });

                setTimeout(() => {
                    expect(toolsStore.getItemsToolsState()).toMatchObject({
                        'item-1': { choiceElimination: ['c1', 'c2'] }
                    });

                    done();
                }, 1);
            });
            runner.init();
        }));

    it('updates remainingAttempts for initial item', () =>
        new Promise(done => {
            const testMapWithAttempts = cloneDeep(sampleTestMap);
            testMapWithAttempts.parts.p1.sections.s1.items['item-1'].remainingAttempts = 1;

            const serviceCallId = 'test-session-420att';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1',
                    remainingAttempts: 1,
                    itemSessionState: itemSessionStates.interacting
                },
                testMap: testMapWithAttempts
            }));

            proxyFactory.registerProvider('foo', {
                init: proxyInit
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runner.on('init', () => {
                expect(testMapWithAttempts.parts.p1.sections.s1.items['item-1'].remainingAttempts).toEqual(2);
                done();
            });
            runner.init();
        }));

    it("doesn't close the item session for interacted item even if remaining attempts is 0", () =>
        new Promise(done => {
            const serviceCallId = 'test-session-fsc2d';
            const container = document.createElement('section');

            const testMapWithAttempts = cloneDeep(sampleTestMap);
            testMapWithAttempts.parts.p1.sections.s1.items['item-1'].remainingAttempts = 0;

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: proxyCallItemAction
            });

            const itemRunnerInit = vi.fn((itemData, initDone) => initDone());
            const itemRunnerRender = vi.fn((itemContainer, renderDone) => renderDone());
            const itemRunnerClose = vi.fn(() => Promise.resolve());
            itemRunnerFactory.register('itemRunnerFoo', {
                init: itemRunnerInit,
                render: itemRunnerRender,
                close: itemRunnerClose,
                getState: () => ({})
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container,
                itemRunner: 'itemRunnerFoo'
            });

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.after('renderitem', () => {
                        runner.off('renderitem');
                        //1st item
                        expect(itemRunnerClose).not.toHaveBeenCalled();
                        done();
                    });
                    runner.previous();
                });

            runner.init();
        }));

    describe('feedback on navigation', () => {
        let runner;
        let unloadItemSpy;
        let statusStore;
        let proxyGetItem;
        let enableItemSpy;
        let submitItemSpy;
        let proxyCallItemAction;
        let proxyInit;

        beforeEach(() => {
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');
            statusStore = getTestSessionStatusStore(serviceCallId);

            proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));
            proxyGetItem = vi.fn().mockResolvedValue(sampleItem);
            enableItemSpy = vi.fn();
            unloadItemSpy = vi.fn();
            submitItemSpy = vi.fn();
            proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: submitItemSpy,
                enableItem: enableItemSpy,
                callItemAction: proxyCallItemAction
            });
            runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            checkNavigationFeedback.mockReturnValue({ someFeedbackArg: true });
            getNavigationFeedbackConfig.mockReturnValue({});
        });

        it('feedback can cancel navigation', () =>
            new Promise(done => {
                expect.assertions(8);
                runner
                    .on('error', error => {
                        throw error;
                    })
                    .on('init', () => {
                        expect(proxyInit).toHaveBeenCalled();
                    })
                    .after('move', () => {
                        //navigation is cancelled
                        expect(showNavigationFeedback).toHaveBeenCalled();
                        expect(unloadItemSpy).not.toHaveBeenCalled();
                        expect(proxyCallItemAction).not.toHaveBeenCalled();
                        expect(statusStore.get()).toEqual('interacting');
                        done();
                    })
                    .on('unloaditem', unloadItemSpy)
                    .on('renderitem', () => {
                        runner.off('renderitem');
                        expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);

                        showNavigationFeedback.mockImplementation(
                            () => Promise.resolve({ proceed: false }) //cancel navigation
                        );

                        expect(statusStore.get()).toEqual('interacting');
                        expect(showNavigationFeedback).not.toHaveBeenCalled();

                        runner.next('item');
                    });
                runner.init();
            }));

        it('feedback can continue navigation', () =>
            new Promise(done => {
                expect.assertions(10);
                runner
                    .on('error', error => {
                        throw error;
                    })
                    .on('init', () => {
                        expect(proxyInit).toHaveBeenCalled();
                    })
                    .after('move', () => {
                        //navigation continues
                        expect(showNavigationFeedback).toHaveBeenCalled();
                        expect(unloadItemSpy).toHaveBeenCalled();
                        expect(proxyCallItemAction.mock.calls[0][1]).toEqual('move');
                        runner.on('renderitem', () => {
                            runner.off('renderitem');
                            expect(statusStore.get()).toEqual('interacting');
                            done();
                        });
                    })
                    .on('unloaditem', unloadItemSpy)
                    .on('renderitem', () => {
                        runner.off('renderitem');
                        expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);

                        showNavigationFeedback.mockImplementation(
                            () => Promise.resolve({ proceed: true }) //continue navigation
                        );

                        expect(statusStore.get()).toEqual('interacting');
                        expect(showNavigationFeedback).not.toHaveBeenCalled();
                        expect(unloadItemSpy).not.toHaveBeenCalled();
                        expect(proxyCallItemAction).not.toHaveBeenCalled();

                        runner.next('item');
                    });

                runner.init();
            }));

        it('feedback can be shown from overlay', () =>
            new Promise(done => {
                expect.assertions(10);
                runner
                    .on('error', error => {
                        throw error;
                    })
                    .on('init', () => {
                        expect(proxyInit).toHaveBeenCalled();
                    })
                    .after('move', () => {
                        //navigation is cancelled, we are still on overlay
                        expect(showNavigationFeedback).toHaveBeenCalled();
                        expect(unloadItemSpy).not.toHaveBeenCalled();
                        expect(proxyCallItemAction).not.toHaveBeenCalled();
                        expect(enableItemSpy).not.toHaveBeenCalled();
                        expect(statusStore.get()).toEqual(testSessionStatus.overlay);
                        done();
                    })
                    .on('unloaditem', unloadItemSpy)
                    .on('renderitem', () => {
                        runner.off('renderitem');
                        expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);

                        runner.on('disableitem', () => {
                            runner.off('disableitem');
                            statusStore.set(testSessionStatus.overlay); //simulate overview open (part 2)

                            showNavigationFeedback.mockImplementation(() => {
                                expect(statusStore.get()).toEqual(testSessionStatus.overlay); //still on overlay before showing dialog
                                return Promise.resolve({ proceed: false }); //cancel navigation
                            });

                            expect(statusStore.get()).toEqual(testSessionStatus.overlay);
                            expect(showNavigationFeedback).not.toHaveBeenCalled();
                            runner.next('item');
                        });
                        runner.disableItem('item-1'); //simulate overview open (part 1)
                    });

                runner.init();
            }));

        it('modalFeedback on item, if hasFeedbacks=true and based on submitItem action results', () =>
            new Promise(done => {
                expect.assertions(12);

                checkNavigationFeedback.mockReturnValue(null);
                proxyGetItem.mockResolvedValue({ hasFeedbacks: true });
                submitItemSpy.mockResolvedValue({
                    displayFeedbacks: true,
                    feedbacks: { foo: 'abc' },
                    itemSession: { bar: 'xyz' }
                });
                const mockTestMap = cloneDeep(sampleTestMap);
                mockTestMap.parts['p1'].sections['s1'].items['item-2'].hasFeedbacks = true;
                proxyInit.mockImplementation(() => ({
                    testContext: {
                        state: testSessionStates.interacting,
                        itemSessionState: itemSessionStates.modalFeedback,
                        itemPosition: 1,
                        itemIdentifier: 'item-2',
                        sectionId: 's1',
                        testPartId: 'p1'
                    },
                    testMap: mockTestMap
                }));
                const renderFeedbacksDeferred = new DeferredPromise();
                const renderFeedbacksSpy = vi.fn().mockImplementation((feedbacks, itemSession, rfDone) => {
                    expect(feedbacks).toEqual(expect.objectContaining({ foo: 'abc' }));
                    expect(itemSession).toEqual(expect.objectContaining({ bar: 'xyz' }));
                    itemSession.onBeforeRenderFeedbacks();
                    renderFeedbacksDeferred.promise.then(() => {
                        rfDone();
                    });
                });

                const serviceCallId = 'test-session-4b2e';
                const container = document.createElement('section');
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: vi.fn((itemData, initDone) => initDone()),
                    render: vi.fn((itemContainer, renderDone) => renderDone()),
                    suspend: vi.fn(() => Promise.resolve()),
                    resume: vi.fn(() => Promise.resolve()),
                    getState: () => ({ state1: 'abc' }),
                    getResponses: () => ({ resp1: 'xyz' }),
                    renderFeedbacks: renderFeedbacksSpy
                });
                runner = testRunnerFactory(providerName, [], {
                    serviceCallId,
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container
                });

                runner
                    .on('error', error => {
                        throw error;
                    })
                    .on('init', () => {
                        expect(proxyInit).toHaveBeenCalled();
                    })
                    .on('unloaditem', unloadItemSpy)
                    .on('renderitem.test', () => {
                        runner.off('renderitem.test');
                        expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);
                        expect(submitItemSpy).not.toHaveBeenCalled();

                        runner.on('itemModalFeedback', () => {
                            expect(submitItemSpy).toHaveBeenCalled();
                            expect(submitItemSpy).toHaveBeenCalledWith(
                                'item-2',
                                expect.objectContaining({ state1: 'abc' }),
                                expect.objectContaining({ resp1: 'xyz' }),
                                { itemDuration: NaN }
                            );
                            expect(unloadItemSpy).not.toHaveBeenCalled();
                            expect(proxyCallItemAction).not.toHaveBeenCalled();
                            expect(runner.getTestContext().itemSessionState).toBe(itemSessionStates.modalFeedback);

                            renderFeedbacksDeferred.resolve(); //modalFeedback viewed, continue
                        });

                        runner.next('item');
                    })
                    .after('move', () => {
                        //navigation continues
                        expect(unloadItemSpy).toHaveBeenCalled();
                        expect(proxyCallItemAction.mock.calls[0][1]).toEqual('skip'); //'move' replaced with 'skip
                        runner.on('renderitem.test', () => {
                            runner.off('renderitem.test');
                            done();
                        });
                    });

                runner.init();
            }));
    });

    describe('socketProxy', () => {
        const serviceCallId = 'test-session-a12b';
        const configForSocket = {
            serviceCallId,
            proxy: 'foo',
            renderTo: document.body,
            jwtTokenHandler: { getToken: vi.fn() },
            deliveryExecutionId: '123',
            options: {
                realTimeService: {
                    enabled: true,
                    socketConnectionUrl: true
                }
            }
        };

        it('initializes and connects if test with timers', () =>
            new Promise(done => {
                const init = vi.fn(() => ({
                    testContext: {
                        position: 0
                    },
                    testMap: {
                        total: 0
                    },
                    timer: {
                        test: {
                            id: 'test',
                            maxTime: 60000,
                            maxTimeRemaining: 45000
                        }
                    }
                }));
                proxyFactory.registerProvider('foo', { init });
                const runner = testRunnerFactory(providerName, [], configForSocket);
                expect(runner.socketProxy).toBeFalsy();
                runner
                    .on('error', e => {
                        throw e;
                    })
                    .on('init', () => {
                        expect(init).toHaveBeenCalled();
                        expect(runner.socketProxy).toEqual(
                            expect.objectContaining({ connect: expect.anything(), disconnect: expect.anything() })
                        );
                        expect(runner.socketProxy.connect).toHaveBeenCalled();
                        runner.destroy();
                    })
                    .on('destroy', () => {
                        expect(runner.socketProxy.disconnect).toHaveBeenCalled();
                        done();
                    });
                runner.init();
            }));

        it('initializes and connects if proctored test', () =>
            new Promise(done => {
                const init = vi.fn(() => ({
                    testContext: {
                        position: 0,
                        isProctored: true
                    },
                    testMap: {
                        total: 0
                    }
                }));
                proxyFactory.registerProvider('foo', { init });
                const runner = testRunnerFactory(providerName, [], configForSocket);
                expect(runner.socketProxy).toBeFalsy();
                runner
                    .on('error', e => {
                        throw e;
                    })
                    .on('init', () => {
                        expect(init).toHaveBeenCalled();
                        expect(runner.socketProxy).toEqual(
                            expect.objectContaining({ connect: expect.anything(), disconnect: expect.anything() })
                        );
                        expect(runner.socketProxy.connect).toHaveBeenCalled();
                        runner.destroy();
                    })
                    .on('destroy', () => {
                        expect(runner.socketProxy.disconnect).toHaveBeenCalled();
                        done();
                    });
                runner.init();
            }));

        it('does not initialize if neither timers nor proctored', () =>
            new Promise(done => {
                const init = vi.fn(() => ({
                    testContext: {
                        position: 0
                    },
                    testMap: {
                        total: 0
                    }
                }));
                proxyFactory.registerProvider('foo', { init });
                const runner = testRunnerFactory(providerName, [], configForSocket);
                runner
                    .on('error', e => {
                        throw e;
                    })
                    .on('init', () => {
                        expect(init).toHaveBeenCalled();
                        expect(runner.socketProxy).toBeFalsy();
                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    });
                runner.init();
            }));
    });

    describe('#getItemResults', () => {
        it('should return touched=false, if item is initially not-touched', () =>
            new Promise(done => {
                expect.assertions(1);

                const serviceCallId = 'test-session-4b2e';
                const container = document.createElement('section');
                const itemIdentifier = 'item-1';
                const item = { itemIdentifier, itemState: {} };

                const proxyInit = vi.fn(() => ({
                    testContext: {
                        state: testSessionStates.interacting,
                        itemPosition: 0,
                        itemIdentifier,
                        sectionId: 's1',
                        testPartId: 'p1'
                    },
                    testMap: sampleTestMap
                }));
                const proxyGetItem = vi.fn(() => item);
                proxyFactory.registerProvider('foo', {
                    init: proxyInit,
                    getItem: proxyGetItem
                });
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: (itemData, initDone) => initDone(),
                    render: (itemContainer, renderDone) => renderDone()
                });

                const testRunner = testRunnerFactory(providerName, [], {
                    serviceCallId,
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container
                });

                testRunner
                    .on('loaditem', () => {
                        expect(testRunner.getItemResults()).toMatchObject({
                            itemState: {
                                touched: false
                            }
                        });
                        done();
                    })
                    .init();
            }));

        it('should return touched=true, if item is initially touched', () =>
            new Promise(done => {
                expect.assertions(1);

                const serviceCallId = 'test-session-4b2e';
                const container = document.createElement('section');
                const itemIdentifier = 'item-1';
                const item = { itemIdentifier, itemState: { touched: true } };

                const proxyInit = vi.fn(() => ({
                    testContext: {
                        state: testSessionStates.interacting,
                        itemPosition: 0,
                        itemIdentifier,
                        sectionId: 's1',
                        testPartId: 'p1'
                    },
                    testMap: sampleTestMap
                }));
                const proxyGetItem = vi.fn(() => item);
                proxyFactory.registerProvider('foo', {
                    init: proxyInit,
                    getItem: proxyGetItem
                });
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: (itemData, initDone) => initDone(),
                    render: (itemContainer, renderDone) => renderDone()
                });

                const testRunner = testRunnerFactory(providerName, [], {
                    serviceCallId,
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container
                });

                testRunner
                    .on('loaditem', () => {
                        expect(testRunner.getItemResults()).toMatchObject({
                            itemState: {
                                touched: true
                            }
                        });
                        done();
                    })
                    .init();
            }));
    });

    it('triggers move from item-runner event', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-7afd';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 0,
                    itemIdentifier: 'item-1',
                    sectionId: 's1',
                    testPartId: 'p1'
                },
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem,
                submitItem: () => Promise.resolve(),
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'qtinui',
                renderTo: container
            });

            const statusStore = getTestSessionStatusStore(serviceCallId);

            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .after('renderitem', () => {
                    runner.off('renderitem');
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                    expect(statusStore.get()).toEqual('interacting');

                    runner.on('move', (direction, scope) => {
                        expect(direction).toEqual('next');
                        expect(scope).toEqual('item');

                        runner.on('renderitem', done);
                    });

                    runner.itemRunner.trigger('sequence-ended-nav-next');
                })
                .on('error', e => {
                    throw e;
                });

            runner.init();
        }));

    describe('timeout', () => {
        it('on timeout, submits response, shows feedback, and moves', () =>
            new Promise(done => {
                expect.assertions(7);

                const serviceCallId = 'test-session-5x1y';
                const container = document.createElement('section');
                const itemIdentifier = 'item-2';

                const proxyInit = vi.fn(() => ({
                    testContext: {
                        state: testSessionStates.interacting,
                        itemIdentifier,
                        sectionId: 's1',
                        testPartId: 'p1',
                        position: 0
                    },
                    testMap: sampleTestMap,
                    timer: {
                        test: {
                            id: 'test',
                            maxTime: 60000,
                            maxTimeRemaining: 45000
                        }
                    }
                }));
                const proxyGetItem = vi.fn(() => sampleItem);
                const proxyCallItemAction = vi.fn(() => ({
                    testContext: {
                        state: testSessionStates.interacting,
                        itemPosition: 1,
                        itemIdentifier,
                        sectionId: 's1',
                        testPartId: 'p1'
                    }
                }));
                proxyFactory.registerProvider('foo', {
                    init: proxyInit,
                    getItem: proxyGetItem,
                    callItemAction: proxyCallItemAction
                });

                const pendingOpsStore = getItemPendingOperationsStore(itemIdentifier);

                const itemRunnerInit = vi.fn(function (itemData, initDone) {
                    this.pendingOperationsStore = pendingOpsStore;
                    initDone();
                });
                const itemRunnerRender = vi.fn((itemContainer, renderDone) => renderDone());
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: itemRunnerInit,
                    render: itemRunnerRender,
                    getState: () => ({})
                });

                const runner = testRunnerFactory(providerName, [], {
                    serviceCallId,
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container,
                    jwtTokenHandler: { getToken: vi.fn() },
                    deliveryExecutionId: '123',
                    options: {
                        realTimeService: {
                            enabled: true,
                            socketConnectionUrl: true
                        }
                    }
                });

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('init', () => {
                        expect(proxyInit).toHaveBeenCalled();
                        expect(runner.socketProxy).toEqual(
                            expect.objectContaining({ connect: expect.anything(), disconnect: expect.anything() })
                        );
                        expect(runner.socketProxy.connect).toHaveBeenCalled();
                    })
                    .on('renderitem', () => {
                        runner.off('renderitem');

                        showNavigationFeedback.mockImplementation(() => Promise.resolve({ proceed: true }));

                        runner.trigger('timeout', { level: 'test' });
                    })
                    .on('move', (direction, scope) => {
                        expect(direction).toEqual('next');
                        expect(scope).toEqual('test');
                        expect(proxyCallItemAction).toHaveBeenCalledWith(
                            'item-2',
                            'timeout',
                            expect.objectContaining({
                                scope: 'test',
                                itemState: { touched: false },
                                itemResponse: {},
                                itemDuration: NaN
                            }),
                            noop
                        );
                        expect(showNavigationFeedback).toHaveBeenCalled();

                        runner.on('renderitem', done);
                    });

                runner.init();
            }));

        it('on guidedNavigation timeout, submits response, and moves', () =>
            new Promise(done => {
                expect.assertions(7);

                const serviceCallId = 'test-session-5x1y';
                const container = document.createElement('section');
                const itemIdentifier = 'item-1';

                const linearTestMap = structuredClone(sampleTestMap);
                linearTestMap.parts.p1.isLinear = true; // for guidedNavigation

                const proxyInit = vi.fn(() => ({
                    testContext: {
                        state: testSessionStates.interacting,
                        itemIdentifier,
                        sectionId: 's1',
                        testPartId: 'p1',
                        position: 0
                    },
                    testMap: linearTestMap,
                    timer: {
                        // data for guidedNavigation
                        items: [
                            {
                                id: itemIdentifier,
                                minTime: 60000,
                                maxTime: 60000,
                                maxTimeRemaining: 10000
                            }
                        ]
                    }
                }));
                const proxyGetItem = vi.fn(() => sampleItem);
                const proxyCallItemAction = vi.fn(() => ({
                    testContext: {
                        state: testSessionStates.interacting,
                        itemPosition: 1,
                        itemIdentifier,
                        sectionId: 's1',
                        testPartId: 'p1'
                    }
                }));
                proxyFactory.registerProvider('foo', {
                    init: proxyInit,
                    getItem: proxyGetItem,
                    callItemAction: proxyCallItemAction
                });

                const itemRunnerInit = vi.fn(function (itemData, initDone) {
                    initDone();
                });
                const itemRunnerRender = vi.fn((itemContainer, renderDone) => renderDone());
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: itemRunnerInit,
                    render: itemRunnerRender,
                    getState: () => ({})
                });

                const runner = testRunnerFactory(providerName, [], {
                    serviceCallId,
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container,
                    jwtTokenHandler: { getToken: vi.fn() },
                    deliveryExecutionId: '123',
                    options: {
                        realTimeService: {
                            enabled: true,
                            socketConnectionUrl: true
                        }
                    }
                });

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('init', () => {
                        expect(proxyInit).toHaveBeenCalled();
                        expect(runner.socketProxy).toEqual(
                            expect.objectContaining({ connect: expect.anything(), disconnect: expect.anything() })
                        );
                        expect(runner.socketProxy.connect).toHaveBeenCalled();
                    })
                    .on('renderitem', () => {
                        runner.off('renderitem');

                        showNavigationFeedback.mockResolvedValue({ proceed: true });

                        runner.trigger('timeout', { level: 'item' });
                    })
                    .on('move', (direction, scope) => {
                        expect(direction).toEqual('next');
                        expect(scope).toEqual('item');
                        expect(proxyCallItemAction).toHaveBeenCalledWith(
                            'item-1',
                            'timeout',
                            expect.objectContaining({
                                scope: 'item',
                                itemState: { touched: false },
                                itemResponse: {},
                                itemDuration: NaN
                            }),
                            noop
                        );
                        expect(showNavigationFeedback).not.toHaveBeenCalled();

                        runner.on('renderitem', done);
                    });

                runner.init();
            }));
    });
});
