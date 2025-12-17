// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

// as in TestLayout
vi.mock('@oat-sa-private/tao-item-runner-qtinui/src/runner/interactions/util/actions/resizeObserve.js');

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner.js';
import { testSessionStates } from '../../../session/sessionStates.js';
import { getLiveSaveStore } from '@oat-sa-private/ui-components';
import { getTimersStore, clearAllTimersStores } from '../../../timers/timersStore.js';

import { cloneDeep } from 'lodash';
import { tick } from 'svelte';
import { get } from 'svelte/store';
import { wait } from '../../../util/common.js';

import { default as provider, providerName } from '../../../qti.js';

const pluginName = 'localItemState';

//sample data
const itemId = 'item-1';
const testContext = {
    state: testSessionStates.interacting,
    itemPosition: 0,
    itemIdentifier: itemId,
    sectionId: 's1',
    testPartId: 'p1'
};
const testMap = {
    parts: {
        p1: {
            id: 'p1',
            sections: {
                s1: {
                    id: 's1',
                    items: {
                        [itemId]: {
                            id: itemId,
                            position: 0
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
const fixedTimestamp = 1666000000000;
const sampleItem = { itemData: { some: 'data' }, itemState: { some: 'state' } };
const sampleState = {
    RESPONSE_1: {
        response: { base: { string: 'hello' } },
        state: { foo: 'bar' },
        validity: true,
        duration: 5
    }
};
const sampleState2 = {
    RESPONSE_1: {
        response: { base: { string: 'hello world' } },
        validity: true,
        duration: 13
    }
};
const serviceCallId = 'serviceCallId1';
let container;

// DOM setup for beforeEach
function setupLayout() {
    const section = document.createElement('section');
    section.classList.add('fixture');
    section.innerHTML = `
        <header></header>
        <main></main>
    `;
    document.body.appendChild(section);
    return section;
}

// DOM teardown for afterEach
function removeLayout() {
    const section = document.querySelector('.fixture');
    if (section) {
        section.remove();
    }
}

//runner instance
let runner;
const proxyApi = {
    init() {
        return Promise.resolve({
            testContext,
            testMap
        });
    },
    getItem() {
        return Promise.resolve(Object.assign({}, sampleItem));
    },
    callItemAction() {
        return Promise.resolve();
    }
};

beforeEach(() => {
    container = setupLayout();

    //create dummy proxy provider
    proxyFactory.registerProvider('dummyProxyProvider', proxyApi);

    //mock testRunner provider areaBroker (it's called on renderItem and unloadItem)
    provider.loadAreaBroker = () => ({
        getHeaderArea() {
            return container.querySelector('header');
        },
        getContentArea() {
            return container.querySelector('main');
        },
        setAreas() {}
    });

    //register testRunner provider
    testRunnerFactory.registerProvider(providerName, provider);

    //dummy itemRunner provider
    const itemRunnerProvider = {
        state: null,

        init(itemData, initDone) {
            initDone();
            return this;
        },

        render(itemContainer, renderDone) {
            //need to postpone a bit renderDone as because itemRunner needs to be initialized properly first
            this.item = {
                trigger: vi.fn()
            };
            setTimeout(() => {
                renderDone();
            }, 1);
            return this;
        },

        clear() {
            //need to trigger clear event - test runner provider waits for it to trigger unloaditem
            this.state = {};
            this.trigger('clear');
            return this;
        },

        setState(newState) {
            this.state = Object.assign({}, newState);
            this.trigger('statechange', newState);
        },

        getState() {
            return this.state;
        }
    };

    //register dummy itemRunner provider
    itemRunnerFactory.register('dummyItemRunnerProvider', itemRunnerProvider);

    //create testRunner
    runner = testRunnerFactory(providerName, [pluginFactory], {
        serviceCallId,
        itemRunner: 'dummyItemRunnerProvider',
        proxy: 'dummyProxyProvider',
        renderTo: container
    });
    runner.on('error', error => {
        throw error;
    });
});

afterEach(
    () =>
        new Promise(done => {
            runner.on('destroy', () => {
                removeLayout();
                testRunnerFactory.clearProviders();
                done();
            });
            runner
                .getPluginStore(pluginName)
                .then(store => store.clear())
                .then(() => runner.destroy());
        })
);

describe('localItemState plugin', () => {
    it('writes to plugin store on state change', () =>
        new Promise(done => {
            vi.spyOn(global.Date, 'now').mockReturnValueOnce(fixedTimestamp);

            runner.after('renderitem', async () => {
                await wait(1);

                runner.itemRunner.after('statechange', async () => {
                    const store = await runner.getPluginStore(pluginName);
                    const item = await store.getItem(itemId);
                    expect(item).toEqual(sampleState);

                    done();
                });
                runner.itemRunner.setState(sampleState);
            });

            runner.init();
        }));

    it('restores local item state if exists in store', () =>
        new Promise(done => {
            const storedState = { RESPONSE: { response: { base: { identifier: 'super_response' } } } };
            runner.after('renderitem', () => {
                setTimeout(() => {
                    expect(runner.itemRunner.getState()).toEqual(storedState);
                    done();
                }, 1);
            });

            //predefine itemState in store and init runner
            runner
                .getPluginStore(pluginName)
                .then(store => store.setItem(itemId, storedState))
                .then(() => {
                    runner.init();
                });
        }));

    it('prefers server state if local item state is null', () =>
        new Promise(done => {
            const storedState = { RESPONSE: { response: { base: null } } };
            runner.after('renderitem', () => {
                setTimeout(() => {
                    expect(runner.itemRunner.getState()).not.toEqual(storedState);
                    done();
                }, 1);
            });

            //predefine itemState in store and init runner
            runner
                .getPluginStore(pluginName)
                .then(store => store.setItem(itemId, storedState))
                .then(() => {
                    runner.init();
                });
        }));

    it('restores local item state only once', () =>
        new Promise(done => {
            const storedState = { response: 'a-state' };
            runner.after('renderitem', () => {
                setTimeout(() => {
                    runner.off('renderitem');
                    expect(runner.itemRunner.getState()).toEqual(storedState);

                    runner.itemRunner.setState({ response: 'another-value' });
                    runner.after('renderitem', () => {
                        expect(runner.itemRunner.getState()).not.toEqual(storedState);
                        done();
                    });

                    runner.on('unloaditem', () => runner.loadItem(itemId));
                    runner.unloadItem(itemId);
                }, 1);
            });

            //predefine itemState in store and init runner
            runner
                .getPluginStore(pluginName)
                .then(store => store.setItem(itemId, storedState))
                .then(() => runner.init());
        }));

    it('clears other local item state in store on item load', () =>
        new Promise(done => {
            const otherItemState = { response: 'other_response' };
            const otherId = 'otherId';
            runner.after('renderitem', () => {
                setTimeout(() => {
                    //expect item state is gone after load of other item
                    runner.after('loaditem', () => {
                        runner
                            .getPluginStore(pluginName)
                            .then(store => store.getItem(otherId))
                            .then(storedState => {
                                expect(storedState).toBeFalsy();
                                done();
                            });
                    });
                    runner.loadItem(itemId);
                }, 1);
            });

            //predefine itemState in store and init runner
            runner
                .getPluginStore(pluginName)
                .then(store => store.setItem(otherId, otherItemState))
                .then(() => {
                    runner.init();
                });
        }));

    test.each([
        [{}, {}],
        [Promise.resolve({}), {}],
        [
            { foo: 'bar', response: true, list: [] },
            { foo: 'bar', response: true, list: [] }
        ],
        [
            {
                RESPONSE: {
                    response: {
                        list: {
                            identifier: ['choice_1', 'choice_3']
                        }
                    },
                    validity: true
                }
            },
            {
                RESPONSE: {
                    response: {
                        list: {
                            identifier: ['choice_1', 'choice_3']
                        }
                    },
                    validity: true
                }
            }
        ],
        [
            {
                RESPONSE: {
                    response: {
                        base: {
                            file: {}
                        }
                    },
                    validity: false
                }
            },
            {
                RESPONSE: {
                    response: {
                        base: {
                            file: {}
                        }
                    },
                    validity: false
                }
            }
        ],
        [
            {
                RESPONSE: {
                    response: {
                        list: {
                            identifier: ['choice_1', 'choice_3']
                        }
                    }
                },
                RESPONSE_1: {
                    response: {
                        base: {
                            file: Promise.resolve({
                                data: new File([], 'foo.txt'),
                                name: 'foo.txt'
                            })
                        }
                    }
                },
                RESPONSE_2: {
                    response: {
                        list: {
                            fileHash: [
                                {
                                    data: 'a1c0efd3',
                                    name: 'bar.txt'
                                }
                            ]
                        }
                    }
                },
                RESPONSE_3: {
                    response: {
                        base: {
                            string: 'some value'
                        }
                    }
                }
            },
            {
                RESPONSE: {
                    response: {
                        list: {
                            identifier: ['choice_1', 'choice_3']
                        }
                    }
                },
                RESPONSE_1: {
                    response: {
                        base: {
                            file: {}
                        }
                    }
                },
                RESPONSE_2: {
                    response: {
                        list: {
                            fileHash: [
                                {
                                    data: 'a1c0efd3',
                                    name: 'bar.txt'
                                }
                            ]
                        }
                    }
                },
                RESPONSE_3: {
                    response: {
                        base: {
                            string: 'some value'
                        }
                    }
                }
            }
        ]
    ])(
        'exclude file types from the state',
        (state, expected) =>
            new Promise(done => {
                runner.after('renderitem', () => {
                    runner.off('renderitem');
                    setTimeout(() => {
                        runner.itemRunner.after('statechange', () => {
                            runner.itemRunner.off('statechange');
                            runner
                                .getPluginStore(pluginName)
                                .then(store => store.getItem(itemId))
                                .then(item => {
                                    expect(item).toMatchObject(expected);
                                    done();
                                });
                        });
                        runner.itemRunner.setState(state);
                    }, 1);
                });

                runner.init();
            })
    );
});

describe('with saveState enabled in config', () => {
    beforeEach(() => {
        runner.getPluginConfig = () => ({
            saveState: {
                enabled: true,
                minWait: 0,
                maxWait: 0,
                requestRetries: 3
            }
        });
        vi.spyOn(proxyApi, 'callItemAction');
    });

    afterEach(() => {
        clearAllTimersStores();
        runner.getPluginConfig = () => ({});
        vi.restoreAllMocks();
    });

    it('proxy makes saveItemState action after a response change', () =>
        new Promise(done => {
            runner.after('renderitem', () => {
                expect(runner.itemRunner.getState()).toMatchObject({ some: 'state' });
                setTimeout(() => {
                    runner.itemRunner.after('statechange', () => {
                        setTimeout(() => {
                            expect(proxyApi.callItemAction).toHaveBeenCalledTimes(1);
                            expect(proxyApi.callItemAction).toHaveBeenCalledWith(
                                'item-1',
                                'saveItemState',
                                {
                                    itemIdentifier: itemId,
                                    itemState: { ...sampleState }
                                },
                                void 0
                            );
                            done();
                        }, 1);
                    });
                    runner.itemRunner.setState(sampleState);
                }, 1);
            });

            runner.init();
        }));

    it('proxy does not make saveItemState action if no actual change', () =>
        new Promise(done => {
            runner.after('renderitem', () => {
                setTimeout(() => {
                    expect(runner.itemRunner.getState()).toMatchObject({ some: 'state' });
                    runner.itemRunner.after('statechange', () => {
                        setTimeout(() => {
                            expect(proxyApi.callItemAction).not.toHaveBeenCalled();
                            done();
                        }, 1);
                    });
                    runner.itemRunner.setState({ some: 'this is not a response' });
                }, 1);
            });

            runner.init();
        }));

    test.each([
        ['does not make', 'attempts', false, { remainingAttempts: 2 }, []],
        [
            'does not make',
            'timers without allowLateSubmission',
            false,
            { timeConstraints: { 1: { qtiClassName: 'assessmentTest', allowLateSubmission: false } } },
            [{ level: 'test', timerValue: { timeLeft: 60000 } }]
        ],
        [
            'makes',
            'timers with allowLateSubmission',
            true,
            { timeConstraints: { 1: { qtiClassName: 'assessmentTest', allowLateSubmission: true } } },
            [{ level: 'test', timerValue: { timeLeft: 60000 } }]
        ]
    ])(
        'proxy %s saveItemState action if item with  %s',
        (doesSaveStr, actionStr, doesSave, testContextPartial, timersData) =>
            new Promise(done => {
                const appliedTestContext = Object.assign({}, testContext, testContextPartial);
                const timersStore = getTimersStore(serviceCallId);
                timersStore.initializeTimers(timersData);

                runner
                    .after('init', () => {
                        runner.setTestContext(Object.assign({}, testContext, testContextPartial));
                    })
                    .after('renderitem', () => {
                        expect(runner.getTestContext()).toMatchObject(appliedTestContext);
                        expect(runner.itemRunner.getState()).toMatchObject({ some: 'state' });
                        setTimeout(() => {
                            runner.itemRunner.after('statechange', () => {
                                setTimeout(() => {
                                    expect(proxyApi.callItemAction).toHaveBeenCalledTimes(doesSave ? 1 : 0);
                                    done();
                                }, 1);
                            });
                            runner.itemRunner.setState(sampleState);
                        }, 1);
                    });

                runner.init();
            })
    );

    it('failed saveItemState request is retried before resolve', () =>
        new Promise(done => {
            const expectedParams = [
                'item-1',
                'saveItemState',
                {
                    itemIdentifier: itemId,
                    itemState: { ...sampleState }
                },
                void 0
            ];

            runner.after('renderitem', async () => {
                expect(runner.itemRunner.getState()).toMatchObject({ some: 'state' });
                proxyApi.callItemAction.mockRejectedValueOnce(new Error()); // reject once, then resolve
                await wait(1);
                runner.itemRunner.after('statechange', async () => {
                    // Enable 2 re-calls to happen (wait for callstack being empty each time)
                    await wait(1);
                    await wait(1);

                    expect(proxyApi.callItemAction).toHaveBeenCalledTimes(2);
                    expect(proxyApi.callItemAction).toHaveBeenLastCalledWith(...expectedParams);
                    done();
                });
                runner.itemRunner.setState(sampleState);
            });

            runner.init();
        }));

    it('failed saveItemState request is retried only until requestRetries reached', () =>
        new Promise(done => {
            const expectedParams = [
                'item-1',
                'saveItemState',
                {
                    itemIdentifier: itemId,
                    itemState: { ...sampleState }
                },
                void 0
            ];

            runner.after('renderitem', async () => {
                expect(runner.itemRunner.getState()).toMatchObject({ some: 'state' });
                proxyApi.callItemAction.mockImplementation(() => Promise.reject(new Error()));
                await wait(1);

                runner.itemRunner.after('statechange', async () => {
                    // Enable 4 re-calls to happen (wait for callstack being empty each time)
                    await wait(1);
                    await wait(1);
                    await wait(1);
                    await wait(1);

                    expect(proxyApi.callItemAction).toHaveBeenCalledTimes(4); // 1, plus 3 retries
                    expect(proxyApi.callItemAction).toHaveBeenLastCalledWith(...expectedParams);
                    proxyApi.callItemAction.mockRestore();
                    done();
                });
                runner.itemRunner.setState(sampleState);
            });

            runner.init();
        }));

    describe('minWait/maxWait', () => {
        beforeEach(() => {
            runner.getPluginConfig = () => ({
                saveState: {
                    enabled: true,
                    minWait: 50,
                    maxWait: 1000
                }
            });
        });

        afterEach(() => {
            runner.getPluginConfig = () => ({});
        });

        it('proxy makes saveItemState action once for two response changes within minWait', () =>
            new Promise(done => {
                const expectedParams = [
                    'item-1',
                    'saveItemState',
                    {
                        itemIdentifier: itemId,
                        itemState: { ...sampleState2 }
                    },
                    void 0
                ];

                runner.after('renderitem', () => {
                    expect(runner.itemRunner.getState()).toMatchObject({ some: 'state' });
                    setTimeout(() => {
                        runner.itemRunner.after('statechange.first', () => {
                            runner.itemRunner.off('statechange.first');
                            setTimeout(() => {
                                runner.itemRunner.after('statechange.second', () => {
                                    setTimeout(() => {
                                        expect(proxyApi.callItemAction).toHaveBeenCalledTimes(1); // and not 2
                                        expect(proxyApi.callItemAction).toHaveBeenCalledWith(...expectedParams);
                                        done();
                                    }, 100);
                                });
                                runner.itemRunner.setState(sampleState2);
                            }, 10);
                        });
                        runner.itemRunner.setState(sampleState);
                    }, 1);
                });

                runner.init();
            }));

        it('proxy makes saveItemState action twice for two response changes separated by more than minWait', () =>
            new Promise(done => {
                const expectedParams = [
                    'item-1',
                    'saveItemState',
                    {
                        itemIdentifier: itemId,
                        itemState: { ...sampleState2 }
                    },
                    void 0
                ];

                runner.after('renderitem', () => {
                    expect(runner.itemRunner.getState()).toMatchObject({ some: 'state' });
                    setTimeout(() => {
                        runner.itemRunner.after('statechange.first', () => {
                            runner.itemRunner.off('statechange.first');
                            setTimeout(() => {
                                expect(proxyApi.callItemAction).toHaveBeenCalledTimes(1); // and not 2

                                runner.itemRunner.after('statechange.second', () => {
                                    setTimeout(() => {
                                        expect(proxyApi.callItemAction).toHaveBeenCalledTimes(2); // and not 2
                                        expect(proxyApi.callItemAction).toHaveBeenCalledWith(...expectedParams);
                                        done();
                                    }, 100);
                                });
                                runner.itemRunner.setState(sampleState2);
                            }, 60);
                        });
                        runner.itemRunner.setState(sampleState);
                    }, 1);
                });

                runner.init();
            }));
    });
});

describe('with saveState and liveSaveIndicator enabled in config', () => {
    const { liveSaveStore, reset: resetLiveSave } = getLiveSaveStore(pluginName);

    beforeEach(() => {
        runner.getPluginConfig = () => ({
            saveState: {
                enabled: true,
                liveSaveIndicator: {
                    enabled: true
                }
            }
        });
    });

    afterEach(() => {
        runner.getPluginConfig = () => ({});
        resetLiveSave();
    });

    it('updates liveSaveStore on initial and subsequent response change', () =>
        new Promise(done => {
            runner.after('renderitem', () => {
                expect(get(liveSaveStore).status).toBe('none');

                let lastSaved;

                setTimeout(() => {
                    runner.itemRunner.after('statechange.first', () => {
                        runner.itemRunner.off('statechange.first');

                        runner.getPluginStore(pluginName).then(store => {
                            store.getItem(itemId).then(item => {
                                expect(item).toMatchObject(sampleState);

                                tick().then(() => {
                                    const storeVal = get(liveSaveStore);
                                    expect(storeVal.status).toBe('waiting');
                                    lastSaved = storeVal.lastSaved;

                                    setTimeout(() => {
                                        let newState;
                                        runner.itemRunner.after('statechange.second', () => {
                                            runner.itemRunner.off('statechange.second');

                                            runner.getPluginStore(pluginName).then(store2 => {
                                                store2.getItem(itemId).then(item2 => {
                                                    expect(item2).toMatchObject(newState);
                                                    tick().then(() => {
                                                        const storeVal2 = get(liveSaveStore);
                                                        expect(storeVal2.status).toBe('waiting');
                                                        expect(storeVal2.lastSaved).toBeGreaterThan(lastSaved);
                                                        //TODO: mock debounce time and check `expect(storeVal.status).toBe('saved');` after 1.5sec
                                                        done();
                                                    });
                                                });
                                            });
                                        });
                                        // change to 2nd response
                                        newState = cloneDeep(sampleState);
                                        newState.RESPONSE_1.response.base.string = 'goodbye';
                                        runner.itemRunner.setState(newState);
                                    }, 1);
                                });
                            });
                        });
                    });
                    // set 1st response
                    runner.itemRunner.setState(sampleState);
                }, 1);
            });

            runner.init();
        }));

    it('does not update liveSaveStore on state change without response change', () =>
        new Promise(done => {
            runner.after('renderitem', () => {
                expect(get(liveSaveStore).status).toBe('none');

                setTimeout(() => {
                    let newState;
                    runner.itemRunner.after('statechange', () => {
                        runner.getPluginStore(pluginName).then(store => {
                            store.getItem(itemId).then(item => {
                                expect(item).toMatchObject(newState);
                                tick().then(() => {
                                    expect(get(liveSaveStore).status).toBe('none');
                                    done();
                                });
                            });
                        });
                    });
                    // change only non-response part of state
                    newState = cloneDeep(sampleState);
                    newState.RESPONSE_1.duration = 10;
                    runner.itemRunner.setState(newState);
                }, 1);
            });

            //predefine itemState in store and init runner
            runner
                .getPluginStore(pluginName)
                .then(store => store.setItem(itemId, sampleState))
                .then(() => {
                    runner.init();
                });
        }));

    it('does not update liveSaveStore on state change with media response change', () =>
        new Promise(done => {
            runner.after('renderitem', () => {
                expect(get(liveSaveStore).status).toBe('none');

                setTimeout(() => {
                    runner.itemRunner.after('statechange', () => {
                        tick().then(() => {
                            expect(get(liveSaveStore).status).toBe('none');
                            done();
                        });
                    });
                    // change state but indicate media interaction
                    const newState = cloneDeep(sampleState);
                    newState.RESPONSE_1.playsUsed = 1;
                    runner.itemRunner.setState(newState);
                }, 1);
            });

            runner.init();
        }));

    it('shows and hides liveSaveIndicator on item render/unload', () =>
        new Promise(done => {
            runner.after('renderitem.first', async () => {
                const header = document.querySelector('header');
                expect(header.querySelector('.livesave')).toBeInTheDocument();

                runner.off('renderitem.first');
                await wait(1);
                expect(header.querySelector('.livesave')).toBeVisible();

                runner.after('unloaditem', () => {
                    expect(header.querySelector('.livesave')).not.toBeVisible();

                    runner.after('renderitem.second', () => {
                        expect(header.querySelector('.livesave')).toBeVisible();
                        done();
                    });
                    runner.loadItem(itemId);
                });
                runner.unloadItem(itemId);
            });

            runner.init();
        }));
});

describe('with triggerUpdate enabled in config', () => {
    beforeEach(() => {
        vi.spyOn(window, 'setInterval');
    });

    afterEach(() => {
        runner.getPluginConfig = () => ({});
        vi.restoreAllMocks();
    });

    it('does not trigger statusupdate by default', () =>
        new Promise(done => {
            runner.after('renderitem', () => {
                setTimeout(() => {
                    expect(runner.itemRunner.item.trigger).not.toHaveBeenCalled();
                    done();
                }, 1);
            });

            runner.init();
        }));

    it('triggers statusupdate ', () =>
        new Promise(done => {
            const interval = 30003;
            const state = true;
            const response = true;

            runner.getPluginConfig = () => ({
                triggerUpdate: {
                    interval,
                    state,
                    response
                }
            });

            runner.after('renderitem', () => {
                setTimeout(() => {
                    // There may have been third-party calls to setInterval...
                    // prettier-ignore
                    // eslint-disable-next-line no-unused-vars
                    const [intervalFunction, timeout] = window.setInterval.mock.calls.find(([param1, param2]) => param2 === interval);
                    expect(timeout).toBe(interval);

                    intervalFunction();

                    expect(runner.itemRunner.item.trigger).toHaveBeenCalledWith('stateupdate', {
                        state,
                        response
                    });

                    done();
                }, 1);
            });

            runner.init();
        }));

    it('proxy makes saveItemState action if state is true after just state change', () =>
        new Promise(done => {
            vi.spyOn(proxyApi, 'callItemAction');

            runner.getPluginConfig = () => ({
                saveState: {
                    enabled: true,
                    minWait: 0,
                    maxWait: 0,
                    requestRetries: 3
                },
                triggerUpdate: {
                    interval: 1,
                    state: true
                }
            });

            const newState = { RESPONSE_1: { state: { foo: 'baz' } } };

            runner.after('renderitem', () => {
                runner.itemRunner.setState(sampleState);
                setTimeout(() => {
                    runner.itemRunner.after('statechange', () => {
                        setTimeout(() => {
                            expect(proxyApi.callItemAction).toHaveBeenCalledTimes(1);
                            expect(proxyApi.callItemAction).toHaveBeenCalledWith(
                                'item-1',
                                'saveItemState',
                                {
                                    itemIdentifier: itemId,
                                    itemState: { ...sampleState, ...newState }
                                },
                                void 0
                            );
                            done();
                        }, 1);
                    });
                    runner.itemRunner.setState({ ...sampleState, ...newState });
                }, 1);
            });

            runner.init();
        }));

    it('proxy does not make saveItemState action if state is false after state change', () =>
        new Promise(done => {
            vi.spyOn(proxyApi, 'callItemAction');

            runner.getPluginConfig = () => ({
                saveState: {
                    enabled: true,
                    minWait: 0,
                    maxWait: 0,
                    requestRetries: 3
                },
                triggerUpdate: {
                    interval: 1,
                    state: false
                }
            });

            const newState = { RESPONSE_1: { state: { foo: 'baz' } } };

            runner.after('renderitem', () => {
                runner.itemRunner.setState(sampleState);
                setTimeout(() => {
                    runner.itemRunner.after('statechange', () => {
                        setTimeout(() => {
                            expect(proxyApi.callItemAction).not.toHaveBeenCalled();
                            done();
                        }, 1);
                    });
                    runner.itemRunner.setState({ ...sampleState, ...newState });
                }, 1);
            });

            runner.init();
        }));
});
