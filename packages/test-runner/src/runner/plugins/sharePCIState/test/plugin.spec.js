// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import testRunnerFactory from 'taoTests/runner/runner.js';
import pluginFactory from '../plugin.js';

const sampleItem = {
    itemData: {
        data: {
            body: {
                elements: {
                    foo: {
                        qtiClass: 'customInteraction',
                        typeIdentifier: 'fooPCI',
                        attributes: {
                            responseIdentifier: 'RESPONSE'
                        }
                    }
                }
            }
        }
    }
};

describe('sharePCIState', () => {
    let container;
    const serviceCallId = 'test-session-foo';
    // sample item data
    let item = {};

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        const testProviderApi = {
            init() {},
            loadItem() {
                return item;
            },
            loadAreaBroker() {
                return {};
            }
        };

        testRunnerFactory.registerProvider('foo', testProviderApi);
    });

    afterEach(() => {
        item = {};
        testRunnerFactory.clearProviders();
        document.body.innerHTML = '';
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(runner.getState('ready')).toBe(true);
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('shares state with same type of PCI', () =>
        new Promise(done => {
            expect.assertions(1);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            item = JSON.parse(JSON.stringify(sampleItem));
            item.itemData.data.body.elements.bar = {
                qtiClass: 'customInteraction',
                typeIdentifier: 'barPCI',
                attributes: {
                    responseIdentifier: 'RESPONSE_BAR'
                }
            };

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    // 1. after ready, load item1
                    runner.loadItem('item1');
                })
                .on('renderitem', itemRef => {
                    // 2. after item1 is loaded, mock an itemrunner
                    if (itemRef === 'item1') {
                        runner.itemRunner = {
                            on(eventName, callback) {
                                if (eventName.startsWith('statechange')) {
                                    // 3. trigger statechange with some state for item1
                                    callback({
                                        RESPONSE: {
                                            state: {
                                                foo: 'bar'
                                            }
                                        },
                                        RESPONSE_BAR: {
                                            state: {
                                                bar: 'baz'
                                            }
                                        }
                                    });

                                    item = JSON.parse(JSON.stringify(sampleItem)); // necessary, because it is a reference
                                    // it is response identifier independent
                                    item.itemData.data.body.elements.foo.attributes.responseIdentifier = 'NOT_RESPONSE';

                                    // 4. load item2
                                    runner.loadItem('item2');
                                }
                            },
                            off() {}
                        };
                    }
                })
                .after('loaditem', (itemRef, itemData) => {
                    // 5. if item2 is loaded, check state
                    if (itemRef === 'item2') {
                        expect(itemData.itemState).toEqual({
                            NOT_RESPONSE: {
                                state: { foo: 'bar' }
                            }
                        });
                        runner.destroy();
                    }
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('does not share state with different type of PCI', () =>
        new Promise(done => {
            expect.assertions(1);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            item = JSON.parse(JSON.stringify(sampleItem));

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    // 1. after ready, load item1
                    runner.loadItem('item1');
                })
                .on('renderitem', itemRef => {
                    // 2. after item1 is loaded, mock an itemrunner
                    if (itemRef === 'item1') {
                        runner.itemRunner = {
                            on(eventName, callback) {
                                if (eventName.startsWith('statechange')) {
                                    // 3. trigger statechange with some state for item1
                                    callback({
                                        RESPONSE: {
                                            state: {
                                                foo: 'bar'
                                            }
                                        }
                                    });

                                    item = JSON.parse(JSON.stringify(sampleItem));
                                    item.itemData.data.body.elements.foo.typeIdentifier = 'barPCI';

                                    // 4. load item2
                                    runner.loadItem('item2');
                                }
                            },
                            off() {}
                        };
                    }
                })
                .after('loaditem', (itemRef, itemData) => {
                    // 5. if item2 is loaded, check state
                    if (itemRef === 'item2') {
                        expect(itemData.itemState.RESPONSE.state).toEqual({});
                        runner.destroy();
                    }
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('extends state with shared state of same PCI', () =>
        new Promise(done => {
            expect.assertions(1);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            item = JSON.parse(JSON.stringify(sampleItem));

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    // 1. after ready, load item1
                    runner.loadItem('item1');
                })
                .on('renderitem', itemRef => {
                    // 2. after item1 is loaded, mock an itemrunner
                    if (itemRef === 'item1') {
                        runner.itemRunner = {
                            on(eventName, callback) {
                                if (eventName.startsWith('statechange')) {
                                    // 3. trigger statechange with some state for item1
                                    callback({
                                        RESPONSE: {
                                            state: {
                                                foo: 'bar'
                                            }
                                        }
                                    });

                                    item = JSON.parse(JSON.stringify(sampleItem));
                                    item.itemState = {
                                        RESPONSE: {
                                            state: {
                                                foo: 'not bar', // this will be overriden
                                                bar: 123 // this will be kept
                                            }
                                        }
                                    };

                                    // 4. load item2
                                    runner.loadItem('item2');
                                }
                            },
                            off() {}
                        };
                    }
                })
                .after('loaditem', (itemRef, itemData) => {
                    // 5. if item2 is loaded, check state
                    if (itemRef === 'item2') {
                        expect(itemData.itemState).toEqual({
                            RESPONSE: {
                                state: { foo: 'bar', bar: 123 }
                            }
                        });
                        runner.destroy();
                    }
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('does not shares state with same type of PCI if excluded', () =>
        new Promise(done => {
            expect.assertions(1);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner.getPluginConfig = () => ({
                exclude: ['fooPCI']
            });

            item = JSON.parse(JSON.stringify(sampleItem));
            item.itemData.data.body.elements.bar = {
                qtiClass: 'customInteraction',
                typeIdentifier: 'barPCI',
                attributes: {
                    responseIdentifier: 'RESPONSE_BAR'
                }
            };

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    // 1. after ready, load item1
                    runner.loadItem('item1');
                })
                .on('renderitem', itemRef => {
                    // 2. after item1 is loaded, mock an itemrunner
                    if (itemRef === 'item1') {
                        runner.itemRunner = {
                            on(eventName, callback) {
                                if (eventName.startsWith('statechange')) {
                                    // 3. trigger statechange with some state for item1
                                    callback({
                                        RESPONSE: {
                                            state: {
                                                foo: 'bar'
                                            }
                                        },
                                        RESPONSE_BAR: {
                                            state: {
                                                bar: 'baz'
                                            }
                                        }
                                    });

                                    item = JSON.parse(JSON.stringify(sampleItem)); // necessary, because it is a reference
                                    // it is response identifier independent
                                    item.itemData.data.body.elements.foo.attributes.responseIdentifier = 'NOT_RESPONSE';

                                    // 4. load item2
                                    runner.loadItem('item2');
                                }
                            },
                            off() {}
                        };
                    }
                })
                .after('loaditem', (itemRef, itemData) => {
                    // 5. if item2 is loaded, check state
                    if (itemRef === 'item2') {
                        expect(itemData.itemState).toBeUndefined();
                        runner.destroy();
                    }
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
