// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner.js';
import testsStateStore, { getTestStateStore, getTestSessionStatusStore } from '../testsStateStore';
import { testSessionStates } from '../session/sessionStates.js';
import { default as provider, providerName } from '../qtiReview.js';

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
        },
        p2: {
            id: 'p2',
            sections: {
                s1: {
                    id: 's1',
                    items: {
                        'item-3': {
                            id: 'item-3',
                            position: 2
                        }
                    }
                }
            },
            stats: {
                total: 1
            }
        }
    }
};
const sampleState = {
    RESPONSE: {
        count: {
            words: 3,
            chars: 16
        },
        response: {
            base: {
                string: 'testing test.one'
            }
        },
        validity: true
    },
    RESPONSE_1: {
        count: {
            words: 2,
            chars: 16
        },
        response: {
            base: {
                string: 'testing test.two'
            }
        },
        validity: true
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
            }
        });
        proxyFactory.registerProvider('qtinui', {
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

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
                renderTo: document.body
            });
            const statusStore = getTestSessionStatusStore(serviceCallId);
            const stateStore = getTestStateStore(serviceCallId);

            expect(statusStore.get()).toEqual('initial');
            expect(stateStore.getTestContext()).toEqual({});
            expect(stateStore.getTestMap()).toEqual({});

            runner
                .on('error', error => {
                    throw error;
                })
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                    expect(statusStore.get()).toEqual('loading');
                    expect(stateStore.getTestContext()).toMatchObject({ itemPosition: 0 });
                    expect(stateStore.getTestMap()).toEqual(sampleTestMap);
                })
                .on('loaditem', () => {
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
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

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId: '123',
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
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
                    expect(proxyInit).toHaveBeenCalled();

                    expect(container).toMatchSnapshot();

                    expect(runner.getAreaBroker()).toHaveProperty('getContentArea');
                    expect(runner.getAreaBroker().getContentArea()).toBeInstanceOf(HTMLElement);
                    expect(runner.getAreaBroker()).toHaveProperty('getHeaderArea');
                    expect(runner.getAreaBroker().getHeaderArea()).toBeInstanceOf(HTMLElement);
                })
                .on('loaditem', () => {
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                    done();
                });
            runner.init();
        }));

    it('render compute the next action and loads an item', () =>
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

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
                renderTo: container
            });

            const statusStore = getTestSessionStatusStore(serviceCallId);

            expect(statusStore.get()).toEqual('initial');

            runner
                .on('error', error => {
                    throw error;
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

    it('initialize on first item without a testContext', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b4e';

            const proxyInit = vi.fn(() => ({
                testMap: sampleTestMap
            }));
            const proxyGetItem = vi.fn(() => sampleItem);
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem
            });

            itemRunnerFactory.register('itemRunnerFoo', {
                init() {}
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
                renderTo: document.createElement('section')
            });
            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('loaditem', () => {
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                    done();
                });
            runner.init();
        }));

    it('initialize on the 2nd item if set in the testContext', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b3ef';

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
            const proxyGetItem = vi.fn(() => sampleItem);
            proxyFactory.registerProvider('foo', {
                init: proxyInit,
                getItem: proxyGetItem
            });

            itemRunnerFactory.register('itemRunnerFoo', {
                init() {}
            });

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
                renderTo: document.createElement('section')
            });
            runner
                .on('init', () => {
                    expect(proxyInit).toHaveBeenCalled();
                })
                .on('loaditem', () => {
                    expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);
                    done();
                });
            runner.init();
        }));

    it('moves to the next item', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testMap: sampleTestMap
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
                testMap: sampleTestMap
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
                .on('init', function () {
                    expect(proxyInit).toHaveBeenCalled();
                    // set position 1 item as active
                    this.setTestContext({
                        state: testSessionStates.interacting,
                        itemPosition: 1,
                        itemIdentifier: 'item-2',
                        sectionId: 's1',
                        testPartId: 'p1'
                    });
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
                        expect(proxyGetItem).toHaveBeenCalledWith('item-12', noop);
                        done();
                    });
                    runner.jump(12);
                });

            runner.init();
        }));

    it('skips to the next item', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testMap: sampleTestMap
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
                    runner.skip('item', 'next');
                });

            runner.init();
        }));

    it('skips to the previous item', () =>
        new Promise(done => {
            const serviceCallId = 'test-session-4b2rae';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testMap: sampleTestMap
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
                .on('init', function () {
                    expect(proxyInit).toHaveBeenCalled();
                    this.setTestContext({
                        state: testSessionStates.interacting,
                        itemPosition: 1,
                        itemIdentifier: 'item-2',
                        sectionId: 's1',
                        testPartId: 'p1'
                    });
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
                    runner.skip('item', 'previous');
                });

            runner.init();
        }));

    it('triggers disablenav and enablenav events during move', () =>
        new Promise(done => {
            expect.assertions(5);

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
                        .on('disablenav', onDisableNav)
                        .on('enablenav', onEnableNav)
                        .on('renderitem', () => {
                            expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);
                            expect(onDisableNav).toHaveBeenCalledTimes(1);
                            expect(onEnableNav).toHaveBeenCalledTimes(1);
                            done();
                        });
                    runner.next();
                });

            runner.init();
        }));

    it('disables/enables given item', () =>
        new Promise(done => {
            expect.assertions(6);

            const serviceCallId = 'test-session-ihg4b2e';
            const container = document.createElement('section');

            const proxyInit = vi.fn(() => ({
                testMap: sampleTestMap
            }));
            const proxyGetItem = vi.fn(() => sampleItem);
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

            const runner = testRunnerFactory(providerName, [], {
                serviceCallId,
                proxy: 'foo',
                itemRunner: 'itemRunnerFoo',
                renderTo: container
            });

            const statusStore = getTestSessionStatusStore(serviceCallId);

            runner
                .on('error', error => {
                    throw error;
                })
                .on('renderitem', () => {
                    //1
                    runner.off('renderitem');
                    expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                    expect(statusStore.get()).toEqual('interacting');
                    proxyGetItem.mockClear();

                    runner.on('disableitem', () => {
                        //2
                        runner.off('disableitem');
                        expect(itemRunnerSuspend).toHaveBeenCalled();
                        statusStore.set('overlay');

                        runner.on('enableitem', () => {
                            //3
                            runner.off('enableitem');
                            expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                            expect(itemRunnerResume).toHaveBeenCalled();
                            expect(statusStore.get()).toEqual('interacting');
                            done();
                        });

                        runner.enableItem('item-1'); //3
                    });

                    runner.disableItem('item-1'); //2
                });

            runner.init(); //1
        }));

    describe('Response tabs', () => {
        it('loads empty response on question tab by default if no answer tab', () =>
            new Promise(done => {
                const container = document.createElement('section');
                const init = vi.fn(() => ({
                    testMap: sampleTestMap
                }));

                const proxyGetItem = vi.fn(() => ({}));
                proxyFactory.registerProvider('foo', { init, getItem: proxyGetItem });

                const itemRunnerInit = vi.fn((itemData, initDone) => {
                    expect(Object.keys(itemData.itemState).length).toBe(0);
                    initDone();
                    done();
                });
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: itemRunnerInit
                });

                const runner = testRunnerFactory(providerName, [], {
                    serviceCallId: '123',
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container
                });

                runner.init();
            }));

        it('loads response on correct response tab', () =>
            new Promise(done => {
                const container = document.createElement('section');
                const init = vi.fn(() => ({
                    testMap: sampleTestMap
                }));

                const proxyGetItem = vi.fn(() => ({
                    correctResponse: {
                        RESPONSE: {
                            base: {
                                integer: 10
                            }
                        }
                    },
                    itemState: sampleState
                }));
                proxyFactory.registerProvider('foo', { init, getItem: proxyGetItem });

                const itemRunnerInit = vi.fn((itemData, initDone) => {
                    expect(itemData.itemState).toMatchObject({ RESPONSE: { response: { base: { integer: 10 } } } });
                    initDone();
                    done();
                });
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: itemRunnerInit
                });

                const runner = testRunnerFactory(providerName, [], {
                    serviceCallId: '123',
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container,
                    options: {
                        review: {
                            showCorrect: true
                        }
                    }
                });

                runner.on('loaditem', () => {
                    const correctResponseTabButton = Array.prototype.filter.call(
                        container.querySelectorAll('button'),
                        button => button.innerHTML.trim().startsWith('Correct')
                    )[0];
                    correctResponseTabButton.removeAttribute('disabled'); // force enable button
                    correctResponseTabButton.click();
                });
                runner.init();
            }));

        it('restores optionsOrder', () =>
            new Promise(done => {
                const optionsOrder = [0, 2, 1, 3];
                const container = document.createElement('section');
                const init = vi.fn(() => ({
                    testMap: sampleTestMap
                }));

                const proxyGetItem = vi.fn(() => ({
                    itemState: {
                        RESPONSE: {
                            optionsOrder,
                            foo: 'foo',
                            bar: 'bar',
                            baz: 'baz'
                        }
                    }
                }));
                proxyFactory.registerProvider('foo', { init, getItem: proxyGetItem });

                const itemRunnerInit = vi.fn((itemData, initDone) => {
                    expect(itemData.itemState).toMatchObject({ RESPONSE: { optionsOrder } });
                    initDone();
                    done();
                });
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: itemRunnerInit
                });

                const runner = testRunnerFactory(providerName, [], {
                    serviceCallId: '123',
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container
                });

                runner.init();
            }));

        it.each([['answer'], ['correct']])(
            'disables shuffle choice on %s tab if showUnShuffled is set',
            tab =>
                new Promise(done => {
                    const container = document.createElement('section');
                    const init = vi.fn(() => ({
                        testMap: sampleTestMap
                    }));
                    const proxyGetItem = vi.fn(() => {
                        if (tab === 'answer') {
                            return {
                                itemState: {}
                            };
                        }

                        return {};
                    });
                    proxyFactory.registerProvider('foo', { init, getItem: proxyGetItem });
                    const itemRunnerInit = vi.fn(function (itemData, initDone) {
                        expect(this.getOptions().itemRunnerConfig).toEqual({
                            foo: 'bar',
                            elements: {
                                AssociateInteraction: {
                                    propertyOverride: {
                                        shuffle: false
                                    }
                                },
                                ChoiceInteraction: {
                                    propertyOverride: {
                                        shuffle: false
                                    }
                                },
                                ExtendedTextInteraction: {
                                    propertyOverride: {
                                        dataAttr: {
                                            x: 12
                                        }
                                    }
                                },
                                GapMatchInteraction: {
                                    propertyOverride: {
                                        shuffle: false
                                    }
                                },
                                InlineChoiceInteraction: {
                                    propertyOverride: {
                                        shuffle: false
                                    }
                                },
                                MatchInteraction: {
                                    propertyOverride: {
                                        shuffle: false
                                    }
                                },
                                OrderInteraction: {
                                    bar: 'baz',
                                    propertyOverride: {
                                        shuffle: false
                                    }
                                }
                            }
                        });
                        initDone();
                        done();
                    });
                    itemRunnerFactory.register('itemRunnerFoo', {
                        init: itemRunnerInit
                    });
                    const runner = testRunnerFactory(providerName, [], {
                        serviceCallId: '123',
                        proxy: 'foo',
                        itemRunner: 'itemRunnerFoo',
                        renderTo: container,
                        options: {
                            review: {
                                showQuestion: false,
                                showCorrect: tab === 'correct',
                                showUnShuffled: true
                            },
                            itemRunnerConfig: {
                                foo: 'bar',
                                elements: {
                                    OrderInteraction: {
                                        bar: 'baz',
                                        propertyOverride: {
                                            shuffle: true
                                        }
                                    },
                                    ExtendedTextInteraction: {
                                        propertyOverride: {
                                            dataAttr: {
                                                x: 12
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });

                    runner.on('error', error => {
                        throw error;
                    });

                    runner.init();
                })
        );

        it('does not disable shuffle choice on question tab if showUnShuffled is set', () =>
            new Promise(done => {
                const itemRunnerConfig = {
                    foo: 'bar',
                    elements: {
                        OrderInteraction: {
                            bar: 'baz',
                            propertyOverride: {
                                shuffle: true
                            }
                        },
                        ExtendedTextInteraction: {
                            propertyOverride: {
                                dataAttr: {
                                    x: 12
                                }
                            }
                        }
                    }
                };
                const container = document.createElement('section');
                const init = vi.fn(() => ({
                    testMap: sampleTestMap
                }));
                const proxyGetItem = vi.fn(() => ({}));
                proxyFactory.registerProvider('foo', { init, getItem: proxyGetItem });
                const itemRunnerInit = vi.fn(function (itemData, initDone) {
                    expect(this.getOptions().itemRunnerConfig).toEqual(itemRunnerConfig);
                    initDone();
                    done();
                });
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: itemRunnerInit
                });
                const runner = testRunnerFactory(providerName, [], {
                    serviceCallId: '123',
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container,
                    options: {
                        review: {
                            showUnShuffled: true
                        },
                        itemRunnerConfig
                    }
                });

                runner.on('error', error => {
                    throw error;
                });

                runner.init();
            }));

        it('loads test taker item state on answer tab by default', () =>
            new Promise(done => {
                const container = document.createElement('section');
                const init = vi.fn(() => ({
                    testMap: sampleTestMap
                }));

                const proxyGetItem = vi.fn(() => ({
                    itemResponse: {
                        RESPONSE: {
                            base: {
                                string: 'foo'
                            }
                        }
                    },
                    itemState: sampleState
                }));
                proxyFactory.registerProvider('foo', { init, getItem: proxyGetItem });

                const itemRunnerInit = vi.fn((itemData, initDone) => {
                    expect(itemData.itemState).toMatchObject({
                        RESPONSE: {
                            count: { words: 3, chars: 16 },
                            response: { base: { string: 'testing test.one' } },
                            validity: true
                        },
                        RESPONSE_1: {
                            count: { words: 2, chars: 16 },
                            response: { base: { string: 'testing test.two' } },
                            validity: true
                        }
                    });

                    initDone();
                    done();
                });
                itemRunnerFactory.register('itemRunnerFoo', {
                    init: itemRunnerInit
                });

                const runner = testRunnerFactory(providerName, [], {
                    serviceCallId: '123',
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container
                });

                runner.init();
            }));

        test.each([
            [void 0, void 0, false, ['question']],
            [void 0, void 0, true, ['question', 'answer']],
            [false, void 0, false, ['question']],
            [true, void 0, false, ['question', 'correct']],
            [true, false, false, ['correct']],
            [void 0, false, false, ['question']],
            [false, false, false, ['question']],
            [void 0, false, true, ['answer']],
            [void 0, true, false, ['question']],
            [true, true, true, ['question', 'answer', 'correct']]
        ])(
            'show tab options: showCorrect: %s, showQuestion: %s, hasResponse %s',
            (showCorrect, showQuestion, hasResponse, tabs) =>
                new Promise(done => {
                    expect.assertions(1);

                    const container = document.createElement('section');
                    const init = vi.fn(() => ({
                        testMap: sampleTestMap
                    }));
                    const proxyGetItem = vi.fn(() => {
                        if (hasResponse) {
                            return {
                                itemResponse: {
                                    RESPONSE: {
                                        base: {
                                            string: 'foo'
                                        }
                                    }
                                },
                                itemState: sampleState
                            };
                        }
                        return {};
                    });
                    proxyFactory.registerProvider('foo', { init, getItem: proxyGetItem });
                    const itemRunnerInit = vi.fn((itemData, initDone) => {
                        initDone();
                        done();
                    });
                    itemRunnerFactory.register('itemRunnerFoo', {
                        init: itemRunnerInit
                    });
                    const runner = testRunnerFactory(providerName, [], {
                        serviceCallId: '123',
                        proxy: 'foo',
                        itemRunner: 'itemRunnerFoo',
                        renderTo: container,
                        options: {
                            review: {
                                showQuestion,
                                showCorrect
                            }
                        }
                    });
                    runner
                        .on('error', error => {
                            throw error;
                        })
                        .on('loaditem', () => {
                            const tabElements = container.querySelectorAll('[role="tab"]');
                            const tabTitles = Array.from(tabElements).map(tab => tab.textContent.trim().toLowerCase());
                            expect(tabTitles).toEqual(tabs);
                        });
                    runner.init();
                })
        );

        it('shows scores on answer tab', () =>
            new Promise(done => {
                const container = document.createElement('section');
                const init = vi.fn(() => ({
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
                                                position: 0,
                                                score: 66,
                                                maxScore: 99
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }));

                const proxyGetItem = vi.fn(() => ({
                    itemResponse: {
                        RESPONSE: {
                            base: {
                                string: 'foo'
                            }
                        }
                    },
                    itemState: sampleState
                }));
                proxyFactory.registerProvider('foo', { init, getItem: proxyGetItem });

                itemRunnerFactory.register('itemRunnerFoo', {
                    init: () => {
                        const answerTabButton = container.querySelectorAll('[role="tab"]')[1];
                        expect(answerTabButton).toMatchSnapshot();
                        done();
                    }
                });

                const runner = testRunnerFactory(providerName, [], {
                    serviceCallId: '123',
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: container,
                    options: {
                        review: {
                            showScore: true
                        }
                    }
                });

                runner.init();
            }));
    });

    describe('options.review.allInOne', () => {
        it('renders all items in all parts sequentially', () =>
            new Promise(done => {
                expect.assertions(15);

                const serviceCallId = 'test-session-4b4e';

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

                const runner = testRunnerFactory(providerName, [], {
                    serviceCallId,
                    proxy: 'foo',
                    itemRunner: 'itemRunnerFoo',
                    renderTo: document.createElement('section'),
                    options: {
                        review: {
                            allInOne: true,
                            showResponse: true,
                            showCorrect: false,
                            showQuestion: false,
                            showScore: false
                        }
                    }
                });

                // runner.next() is called internally in this scenario
                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('init', () => {
                        expect(proxyInit).toHaveBeenCalled();
                    })
                    .on('renderitem.first', () => {
                        runner.off('renderitem.first');
                        expect(proxyGetItem).toHaveBeenCalledWith('item-1', noop);
                        expect(itemRunnerInit).toHaveBeenCalledTimes(1);
                        expect(itemRunnerRender).toHaveBeenCalledTimes(1);

                        runner.on('renderitem.second', () => {
                            runner.off('renderitem.second');
                            expect(proxyGetItem).toHaveBeenCalledWith('item-2', noop);
                            expect(itemRunnerInit).toHaveBeenCalledTimes(2);
                            expect(itemRunnerRender).toHaveBeenCalledTimes(2);

                            runner.on('renderitem.third', () => {
                                runner.off('renderitem.third');
                                expect(proxyGetItem).toHaveBeenCalledWith('item-3', noop);
                                expect(itemRunnerInit).toHaveBeenCalledTimes(3);
                                expect(itemRunnerRender).toHaveBeenCalledTimes(3);
                                expect(Object.keys(runner.itemRunnersMap).length).toBe(3);
                                expect(Object.keys(runner.itemRunnersMap)).toEqual(['item-1', 'item-2', 'item-3']);
                                expect(runner.renderedComponents.length).toBe(4); // 3 headers + 1 footer

                                runner.finish();
                            });
                        });
                    })
                    .on('destroy', () => {
                        expect(Object.keys(runner.itemRunnersMap).length).toBe(0);
                        expect(runner.renderedComponents.length).toBe(0);
                        done();
                    });

                runner.init();
            }));
    });
});
