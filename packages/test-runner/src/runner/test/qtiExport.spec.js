// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner.js';
import testsStateStore, { getTestSessionStatusStore } from '../testsStateStore.js';
import { testSessionStates } from '../session/sessionStates.js';
import { default as provider, providerName } from '../qtiExport.js';

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
            },
            stats: {
                total: 3
            }
        }
    },
    stats: {
        total: 3
    }
};
const sampleTestContext = {
    state: testSessionStates.interacting,
    itemPosition: 0,
    itemIdentifier: 'item-1',
    sectionId: 's1',
    testPartId: 'p1'
};
let noop;

describe('QTI Export test runner provider', () => {
    it('should register', () => {
        expect(() => testRunnerFactory.getProvider(providerName)).toThrow();

        testRunnerFactory.registerProvider(providerName, provider);

        expect(() => testRunnerFactory.getProvider(providerName)).not.toThrow();
        expect(testRunnerFactory.getProvider(providerName)).toBe(provider);

        testRunnerFactory.clearProviders();
    });
});

describe('QTI Export test runner behavior', () => {
    beforeEach(() => {
        //register the default providers
        testRunnerFactory.registerProvider(providerName, provider);
        itemRunnerFactory.register('qtinui', {
            init(itemData, initDone) {
                initDone();
            },
            render(itemContainer, renderDone) {
                renderDone();
            }
        });
        proxyFactory.registerProvider('qtinuiExport', {
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

            runner.on('init', () => {
                expect(container).toMatchSnapshot();

                expect(runner.getAreaBroker()).toHaveProperty('getContentArea');
                expect(runner.getAreaBroker().getContentArea()).toBeInstanceOf(HTMLElement);
                expect(runner.getAreaBroker()).toHaveProperty('getHeaderArea');
                expect(runner.getAreaBroker().getHeaderArea()).toBeInstanceOf(HTMLElement);

                done();
            });
            runner.init();
        }));

    it('render compute the next action and loads an item', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b2e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testMap: sampleTestMap,
                testContext: sampleTestContext
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
                })
                .on('renderitem', () => {
                    expect(statusStore.get()).toEqual('interacting');
                    expect(itemRunnerInit).toHaveBeenCalled();
                    expect(itemRunnerRender).toHaveBeenCalled();
                    done();
                });
            runner.init();
        }));

    it('moves to the next item', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testMap: sampleTestMap,
                testContext: sampleTestContext
            }));

            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);

            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem
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
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);

                    runner.on('renderitem', () => {
                        runner.off('renderitem');
                        //2nd item
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
                testMap: sampleTestMap,
                testContext: {
                    // set position 1 item as active
                    state: testSessionStates.interacting,
                    itemPosition: 1,
                    itemIdentifier: 'item-2',
                    sectionId: 's1',
                    testPartId: 'p1'
                }
            }));

            const proxyGetItem = vi.fn().mockResolvedValue(sampleItem);

            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem
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
                .on('init', function () {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('renderitem', () => {
                    runner.off('renderitem');
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);

                    runner.on('renderitem', () => {
                        runner.off('renderitem');
                        //2nd item
                        expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                        done();
                    });
                    runner.previous();
                });

            runner.init();
        }));

    it('jumps to the given item', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-afhgr2e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testMap: sampleTestMap,
                testContext: sampleTestContext
            }));

            const proxyGetItem = vi.fn(() => sampleItem);

            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem
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
                    //1st item
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);

                    runner.on('renderitem', () => {
                        runner.off('renderitem');
                        //2nd item
                        expect(proxyGetItem).toHaveBeenCalledWith('item-3', noop);
                        done();
                    });
                    runner.jump(2);
                });

            runner.init();
        }));
});
