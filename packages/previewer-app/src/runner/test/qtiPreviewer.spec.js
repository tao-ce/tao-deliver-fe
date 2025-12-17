// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner.js';
import testsStateStore, {
    getTestStateStore,
    getTestSessionStatusStore
} from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';
import { testSessionStates } from '@oat-sa-private/tao-test-runner-qtinui/src/runner/session/sessionStates.js';
import { default as provider, providerName } from '../qtiPreviewer.js';
import { previewerHeaderPlugin, previewerNavigatorPlugin } from '../plugins';

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
                        },
                        'item-3': {
                            id: 'item-3',
                            position: 2
                        }
                    }
                }
            }
        }
    },
    stats: {
        total: 3
    },
    locales: []
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
        itemRunnerFactory.register('qtiPreviewerItem', {
            init(itemData, initDone) {
                initDone();
            },
            render(itemContainer, renderDone) {
                renderDone();
            }
        });
        proxyFactory.registerProvider('qtiPreviewerTest', {
            init() {
                return {};
            }
        });
    });

    afterEach(() => {
        testsStateStore.clear();
        testRunnerFactory.clearProviders();
        proxyFactory.clearProviders();
        itemRunnerFactory.providers = {};
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
                    itemIdentifier: 'item-1',
                    position: 0
                },
                testMap: {
                    total: 0
                }
            }));
            proxyFactory.registerProvider('foo', { init });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                provider: {
                    proxy: 'foo'
                },
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
                    expect(stateStore.getTestContext()).toMatchObject({ itemIdentifier: 'item-1', position: 0 });
                    expect(stateStore.getTestMap()).toEqual({ total: 0 });
                })
                .on('render', () => {
                    done();
                });
            runner.init();
        }));

    it('loads and renders an item, mounts areas, renders layout with plugins', () =>
        new Promise(done => {
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
            const proxyGetItem = vi.fn(() => sampleItem);
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

            const runner = testRunnerFactory(providerName, [previewerHeaderPlugin, previewerNavigatorPlugin], {
                serviceCallId,
                provider: {
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo'
                },
                renderTo: container
            });

            const statusStore = getTestSessionStatusStore(serviceCallId);
            expect(statusStore.get()).toEqual('initial');

            const areas = ['getContentArea', 'getTopBarArea', 'getNavigationArea', 'getMainArea', 'getTestRunnerArea'];
            for (const area of areas) {
                expect(runner.getAreaBroker()).not.toHaveProperty(area);
            }

            expect(container).toMatchSnapshot();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('init', () => {
                    expect(statusStore.get()).toEqual('loading');
                    expect(proxyInit).toHaveBeenCalled();

                    for (const area of areas) {
                        expect(runner.getAreaBroker()).toHaveProperty(area);
                        expect(runner.getAreaBroker()[area]()).toBeInstanceOf(HTMLElement);
                    }

                    expect(container).toMatchSnapshot();
                })
                .on('render', () => {
                    expect(statusStore.get()).toEqual('loading');
                })
                .on('loaditem', () => {
                    expect(statusStore.get()).toEqual('loading');
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                })
                .on('renderitem', () => {
                    expect(statusStore.get()).toEqual('interacting');
                    expect(itemRunnerInit).toHaveBeenCalled();
                    expect(itemRunnerRender).toHaveBeenCalled();

                    runner.destroy();
                })
                .on('destroy', done);
            runner.init();
        }));

    it('moves to the next item', () =>
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
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                provider: {
                    proxy: 'foo'
                },
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
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);

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
                        done();
                    });
                    runner.next();
                });

            runner.init();
        }));

    it('moves to the previous item', () =>
        new Promise(done => {
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
                callItemAction: proxyCallItemAction
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                provider: {
                    proxy: 'foo'
                },
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
                        done();
                    });
                    runner.previous();
                });

            runner.init();
        }));

    it('jumps to the given item & triggers previewer-move/disablenav/enablenav during move', () =>
        new Promise(done => {
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
                testMap: sampleTestMap
            }));

            const proxyGetItem = vi.fn(() => sampleItem);

            const proxyCallItemAction = vi.fn(() => ({
                testContext: {
                    state: testSessionStates.interacting,
                    itemPosition: 2,
                    itemIdentifier: 'item-3',
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
                provider: {
                    proxy: 'foo'
                },
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
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);

                    const onDisableNav = vi.fn();
                    const onEnableNav = vi.fn();
                    const onPreviewerMove = vi.fn();

                    runner
                        .on('renderitem', () => {
                            runner.off('renderitem');
                            //2nd item
                            expect(proxyCallItemAction).toHaveBeenCalledWith(
                                'item-1',
                                'move',
                                expect.objectContaining({
                                    direction: 'jump',
                                    scope: 'item',
                                    ref: 2
                                }),
                                noop
                            );
                            expect(proxyGetItem).toHaveBeenCalledWith('item-3', noop);
                            expect(onDisableNav).toHaveBeenCalled();
                            expect(onEnableNav).toHaveBeenCalled();
                            expect(onPreviewerMove).toHaveBeenCalledWith(2);
                            done();
                        })
                        .on('disablenav', (...args) => {
                            onDisableNav(...args);
                            runner.on('enablenav', onEnableNav);
                        })
                        .on('previewer-move', onPreviewerMove);
                    runner.jump(2);
                });

            runner.init();
        }));

    it('triggers error if init proxy request fails', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');
            proxyFactory.registerProvider('foo', {
                init: () =>
                    //eslint-disable-next-line implicit-arrow-linebreak
                    new Promise(() => {
                        throw new Error('error-spy-for-init');
                    }),
                callItemAction: vi.fn(),
                getItem: vi.fn()
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                provider: {
                    proxy: 'foo'
                },
                renderTo: container
            });

            runner.on('error', error => {
                expect(error.message).toBe('error-spy-for-init');
                done();
            });

            runner.init();
        }));

    it('triggers error if getItem proxy request fails', () =>
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
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                callItemAction: vi.fn(),
                getItem: () =>
                    //eslint-disable-next-line implicit-arrow-linebreak
                    new Promise(() => {
                        throw new Error('error-spy-for-getItem');
                    })
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                provider: {
                    proxy: 'foo'
                },
                renderTo: container
            });

            runner
                .on('error', error => {
                    if (error.message === 'error-spy-for-getItem') {
                        done();
                    } else {
                        throw error;
                    }
                })
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                });

            runner.init();
        }));
});
