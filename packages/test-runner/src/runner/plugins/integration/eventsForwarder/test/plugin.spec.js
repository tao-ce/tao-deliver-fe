// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import testsStateStore, { getTestStateStore } from '../../../../testsStateStore.js';
import preset from './singleItemPreset.json';
import samplePciEvents from './samplePciEvents.json';
import sampleQtiEvents from './sampleQtiEvents.json';

function setupLayout() {
    const div = document.createElement('div');
    div.innerHTML = `<div class="qti-item-container">
        <section class="qti-item">
            <div class="qti-interaction qti-customInteraction pci-first" data-response-id="foo123">
                <div>
                    <div class="unit-container"></div>
                </div>
            </div>
            <div class="qti-interaction qti-customInteraction pci-second" data-response-id="foo456">
                <div>
                    <div class="unit-container special-container"></div>
                </div>
            </div>
            <div class="qti-interaction item-first" data-response-id="foo789" data-qti-class="textEntryInteraction">
                <div>
                    <div class="item-container"></div>
                </div>
            </div>
        </section>
    </div>`;
    return div;
}

const serviceCallId = 'test-session-plswrk';

function setupStore(testServiceCallId, data) {
    const stateStore = getTestStateStore(testServiceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
}

describe('EventsForwarder plugin', () => {
    let testProviderApi;
    let container;
    let getContainer;
    let getContentArea;

    vi.spyOn(window.console, 'error').mockImplementation(() => {});

    const proxyCallTestActionSpy = vi.fn().mockImplementation(() => Promise.resolve());

    beforeEach(() => {
        proxyCallTestActionSpy.mockClear();

        container = setupLayout();

        getContainer = () => container;
        getContentArea = () => container.querySelector('.qti-item-container');

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getContentArea
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
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

        setupStore(serviceCallId, Object.assign({}, preset));
    });

    afterEach(() => {
        testsStateStore.clear();
        testRunnerFactory.clearProviders();
        container.innerHTML = '';
    });

    it('calls proxy action with eventsQueue when PCI feedtrace event of 500 events received', () =>
        new Promise(done => {
            expect.assertions(6);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    setTimeout(() => {
                        container
                            .querySelector('.pci-first .unit-container')
                            .dispatchEvent(
                                new CustomEvent('feedtrace', { detail: { trace: Array(500).fill(samplePciEvents[0]) } })
                            );
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events).toHaveLength(500);
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events[0]).toMatchObject({
                            domEventType: 'feedtrace',
                            itemIdentifier: 'item1',
                            responseIdentifier: 'foo123',
                            metadata: {
                                event_name: 'QuestionLoaded',
                                itemId: 'CS131Q02',
                                itemName: 'item1',
                                moduleId: 'platform',
                                target: 'MODULE',
                                timeStamp: 1670605214597,
                                unitId: 'S131-GoodVibrations'
                            }
                        });
                        runner.destroy();
                    }, 1);
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('calls proxy action with eventsQueue when PCI feedtrace events of 250 + 250 events received', () =>
        new Promise(done => {
            expect.assertions(6);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    setTimeout(() => {
                        const pciContainer = container.querySelector('.pci-first .unit-container');
                        pciContainer.dispatchEvent(
                            new CustomEvent('feedtrace', { detail: { trace: Array(250).fill(samplePciEvents[0]) } })
                        );
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(0);
                        pciContainer.dispatchEvent(
                            new CustomEvent('feedtrace', { detail: { trace: Array(250).fill(samplePciEvents[1]) } })
                        );

                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events).toHaveLength(500);
                        runner.destroy();
                    }, 1);
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('calls proxy action with eventsQueue on item unload', () =>
        new Promise(done => {
            expect.assertions(6);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    setTimeout(() => {
                        container
                            .querySelector('.pci-first .unit-container')
                            .dispatchEvent(
                                new CustomEvent('feedtrace', { detail: { trace: Array(5).fill(samplePciEvents[0]) } })
                            );
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(0);

                        runner.unloadItem('item1');
                    }, 1);
                })
                .after('unloaditem', () => {
                    expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                    expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                    expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                    expect(proxyCallTestActionSpy.mock.calls[0][1].events).toHaveLength(5);
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('calls proxy action and forwards the eventsQueue from 2 PCIs in 1 batch', () =>
        new Promise(done => {
            expect.assertions(8);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    setTimeout(() => {
                        const pciContainer1 = container.querySelector('.pci-first .unit-container');
                        const pciContainer2 = container.querySelector('.pci-second .unit-container');
                        pciContainer1.dispatchEvent(
                            new CustomEvent('feedtrace', { detail: { trace: Array(250).fill(samplePciEvents[0]) } })
                        );
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(0);
                        pciContainer2.dispatchEvent(
                            new CustomEvent('feedtrace', { detail: { trace: Array(250).fill(samplePciEvents[1]) } })
                        );

                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events).toHaveLength(500);
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events[0]).toMatchObject({
                            domEventType: 'feedtrace',
                            itemIdentifier: 'item1',
                            responseIdentifier: 'foo123',
                            metadata: {
                                event_name: 'QuestionLoaded',
                                itemId: 'CS131Q02',
                                itemName: 'item1',
                                moduleId: 'platform',
                                target: 'MODULE',
                                timeStamp: 1670605214597,
                                unitId: 'S131-GoodVibrations'
                            }
                        });
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events[250]).toMatchObject({
                            domEventType: 'feedtrace',
                            itemIdentifier: 'item1',
                            responseIdentifier: 'foo456',
                            metadata: {
                                event_name: 'stimulusLoaded',
                                itemId: 'CS131Q02',
                                itemName: 'item1',
                                moduleId: 'platform',
                                target: 'MODULE',
                                timeStamp: 1670605214602,
                                unitId: 'S131-GoodVibrations'
                            }
                        });
                        runner.destroy();
                    }, 1);
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('calls proxy action multiple times if queue exceeds bufferSize', () =>
        new Promise(done => {
            expect.assertions(15);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner.getPluginConfig = () => ({
                output: {
                    bufferSize: 7
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    setTimeout(() => {
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(0);

                        const pciContainer = container.querySelector('.pci-first .unit-container');
                        pciContainer.dispatchEvent(
                            new CustomEvent('feedtrace', { detail: { trace: Array(25).fill(samplePciEvents[0]) } })
                        );

                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(4);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events).toHaveLength(7);
                        expect(proxyCallTestActionSpy.mock.calls[1][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[1][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[1][1].events).toHaveLength(7);
                        expect(proxyCallTestActionSpy.mock.calls[2][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[2][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[2][1].events).toHaveLength(7);
                        expect(proxyCallTestActionSpy.mock.calls[3][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[3][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[3][1].events).toHaveLength(4); // 7
                        runner.destroy();
                    }, 1);
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('avoids calling proxy action when eventsQueue empty', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    setTimeout(() => {
                        runner.unloadItem('item1');
                    }, 1);
                })
                .after('unloaditem', () => {
                    expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(0);
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('avoids calling proxy action when unexpected event name or structure', () =>
        new Promise(done => {
            expect.assertions(4);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    setTimeout(() => {
                        const pciContainer = container.querySelector('.pci-first .unit-container');

                        pciContainer.dispatchEvent(
                            new CustomEvent('feedtrace_foo', { detail: { trace: Array(500).fill(samplePciEvents[0]) } })
                        );
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(0);

                        pciContainer.dispatchEvent(
                            new CustomEvent('feedtrace', { detail: { trace_foo: Array(500).fill(samplePciEvents[0]) } })
                        );
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(0);

                        runner.unloadItem('item1');
                    }, 1);
                })
                .after('unloaditem', () => {
                    expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(0);
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('keeps the eventsQueue and can send it a second time if there is a proxy error', () =>
        new Promise(done => {
            expect.assertions(12);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    proxyCallTestActionSpy.mockImplementationOnce(() => Promise.reject(new Error('network failed')));

                    setTimeout(() => {
                        // 1st event
                        container
                            .querySelector('.pci-first .unit-container')
                            .dispatchEvent(
                                new CustomEvent('feedtrace', { detail: { trace: Array(500).fill(samplePciEvents[0]) } })
                            );
                        // rejected
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events).toHaveLength(500);

                        proxyCallTestActionSpy.mockImplementationOnce(() => Promise.resolve());

                        setTimeout(() => {
                            // 2nd event
                            container
                                .querySelector('.pci-first .unit-container')
                                .dispatchEvent(
                                    new CustomEvent('feedtrace', { detail: { trace: samplePciEvents.slice(1, 2) } })
                                );
                            // resolved
                            expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(3);
                            expect(proxyCallTestActionSpy.mock.calls[1][0]).toBe('ui-log');
                            expect(proxyCallTestActionSpy.mock.calls[1][1]).toHaveProperty('events');
                            expect(proxyCallTestActionSpy.mock.calls[1][1].events).toHaveLength(500);
                            expect(proxyCallTestActionSpy.mock.calls[2][0]).toBe('ui-log');
                            expect(proxyCallTestActionSpy.mock.calls[2][1]).toHaveProperty('events');
                            expect(proxyCallTestActionSpy.mock.calls[2][1].events).toHaveLength(1);

                            runner.destroy();
                        }, 1);
                    }, 1);
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('keeps the eventsQueue and can send it on finish if there is a proxy error', () =>
        new Promise(done => {
            expect.assertions(9);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    proxyCallTestActionSpy.mockImplementationOnce(() => Promise.reject(new Error('network failed')));

                    setTimeout(() => {
                        container
                            .querySelector('.pci-first .unit-container')
                            .dispatchEvent(
                                new CustomEvent('feedtrace', { detail: { trace: Array(5).fill(samplePciEvents[0]) } })
                            );

                        runner.unloadItem('item1');
                    }, 1);
                })
                .after('unloaditem', () => {
                    // first send - rejected
                    expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                    expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                    expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                    expect(proxyCallTestActionSpy.mock.calls[0][1].events).toHaveLength(5);

                    runner.finish();
                })
                .on('finish', () => {
                    setTimeout(() => {
                        // second send
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(2);
                        expect(proxyCallTestActionSpy.mock.calls[1][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[1][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[1][1].events).toHaveLength(5);

                        runner.destroy();
                    }, 1);
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('works with alternative config values for pciContainerSelector, pciEvents, output.bufferSize, output.ignoreMetadataKeys', () =>
        new Promise(done => {
            expect.assertions(8);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner.getPluginConfig = () => ({
                pciContainerSelector: '.special-container',
                pciEvents: [
                    {
                        type: 'feedtrace2',
                        property: 'trace2'
                    }
                ],
                output: {
                    bufferSize: 3,
                    ignoreMetadataKeys: ['timeStamp', 'unitId', 'itemId', 'itemName', 'target']
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    setTimeout(() => {
                        container
                            .querySelector('.pci-second .special-container')
                            .dispatchEvent(
                                new CustomEvent('feedtrace2', { detail: { trace2: samplePciEvents.slice(3, 6) } })
                            );
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events).toHaveLength(3);
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events[0]).toMatchObject({
                            domEventType: 'feedtrace2',
                            itemIdentifier: 'item1',
                            responseIdentifier: 'foo456',
                            metadata: {
                                id: 'S131Q01TXT',
                                position: '330,306,399,503',
                                eventCounter: 3,
                                event_name: 'click',
                                time: 1670605220918,
                                lang: 'eng-ZZZ'
                            }
                        });
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events[1]).toMatchObject({
                            domEventType: 'feedtrace2',
                            itemIdentifier: 'item1',
                            responseIdentifier: 'foo456',
                            metadata: {
                                id: 'S131Q01TXT',
                                eventCounter: 4,
                                event_name: 'keypress',
                                time: 1670605221402,
                                lang: 'eng-ZZZ'
                            }
                        });
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events[2]).toMatchObject({
                            domEventType: 'feedtrace2',
                            itemIdentifier: 'item1',
                            responseIdentifier: 'foo456',
                            metadata: {
                                id: 'S131Q01TXT',
                                eventCounter: 5,
                                event_name: 'change',
                                time: 1670605222409,
                                lang: 'eng-ZZZ'
                            }
                        });
                        runner.destroy();
                    }, 1);
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('works with qtiEvents', () =>
        new Promise(done => {
            expect.assertions(6);

            const timeStamp = '123';
            vi.spyOn(Date, 'now').mockImplementation(() => timeStamp);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner.getPluginConfig = () => ({
                interactionContainerSelector: '.item-first',
                qtiEvents: [
                    {
                        type: 'interactiontrace'
                    }
                ],
                output: {
                    bufferSize: 1
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expect(getContentArea()).toBeTruthy();
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));
                    const target = document.createElement('input');
                    target.defaultValue = 'choice_1';
                    container.querySelector('.item-first .item-container').appendChild(target);

                    setTimeout(() => {
                        container
                            .querySelector('.item-first')
                            .dispatchEvent(
                                new CustomEvent('interactiontrace', { detail: { ...sampleQtiEvents[0], target } })
                            );
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events).toHaveLength(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][1].events[0]).toEqual({
                            domEventType: 'click',
                            itemIdentifier: 'item1',
                            responseIdentifier: 'foo789',
                            metadata: {
                                timeStamp,
                                equivalentUserEventType: 'click',
                                position: '330,306,399,503',
                                newResponse: ['choice_1'],
                                qtiChoiceIdentifier: 'choice_1',
                                targetId: 'div/div/input',
                                componentType: 'TextEntryInteraction'
                            }
                        });
                        runner.destroy();
                    }, 1);
                })
                .on('destroy', () => {
                    Date.now.mockRestore();
                    done();
                })
                .init();
        }));

    it('should set touched = true into itemState on receiving interaction events', () =>
        new Promise(done => {
            const itemIdentifier = 'item1';
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner.getPluginConfig = () => ({
                interactionContainerSelector: '.item-first',
                qtiEvents: [
                    {
                        type: 'interactiontrace'
                    }
                ],
                output: {
                    bufferSize: 1
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem(itemIdentifier);
                })
                .on('renderitem', () => {
                    runner.setTestContext({ ...runner.getTestContext(), itemIdentifier });
                    const target = document.createElement('input');
                    target.defaultValue = 'choice_1';
                    container.querySelector('.item-first .item-container').appendChild(target);

                    expect(runner.getItemState(itemIdentifier, 'touched')).toBe(false);

                    setTimeout(() => {
                        container
                            .querySelector('.item-first')
                            .dispatchEvent(
                                new CustomEvent('interactiontrace', { detail: { ...sampleQtiEvents[0], target } })
                            );

                        expect(runner.getItemState(itemIdentifier, 'touched')).toBe(true);
                        runner.destroy();
                    }, 1);
                })
                .on('destroy', done)
                .init();
        }));

    it('does not set touched = true into itemState, if event contains "touched: false"', () =>
        new Promise(done => {
            const itemIdentifier = 'item1';
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner.getPluginConfig = () => ({
                interactionContainerSelector: '.item-first',
                qtiEvents: [
                    {
                        type: 'interactiontrace'
                    }
                ],
                output: {
                    bufferSize: 1
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem(itemIdentifier);
                })
                .on('renderitem', () => {
                    runner.setTestContext({ ...runner.getTestContext(), itemIdentifier });
                    const target = document.createElement('input');
                    target.defaultValue = 'choice_1';
                    container.querySelector('.item-first .item-container').appendChild(target);

                    expect(runner.getItemState(itemIdentifier, 'touched')).toBe(false);

                    setTimeout(() => {
                        container.querySelector('.item-first').dispatchEvent(
                            new CustomEvent('interactiontrace', {
                                detail: { ...sampleQtiEvents[0], target, touched: false }
                            })
                        );

                        expect(runner.getItemState(itemIdentifier, 'touched')).toBe(false);
                        runner.destroy();
                    }, 1);
                })
                .on('destroy', done)
                .init();
        }));

    it('calls proxy action ands sends lifecycle events on item ready', () =>
        new Promise(done => {
            expect.assertions(4);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            const now = Date.now;

            global.Date.now = vi.fn(() => 1234567890);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.trigger('lifecycleEvent', 'ready', 'test');
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));
                    runner.trigger('lifecycleEvent', 'ready', 'item', { foo: 'bar' });

                    expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                    expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                    expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                    expect(proxyCallTestActionSpy.mock.calls[0][1].events).toEqual([
                        {
                            domEventType: 'custom',
                            itemIdentifier: null,
                            responseIdentifier: null,
                            metadata: { type: 'ready', scope: 'test', timeStamp: 1234567890 }
                        },
                        {
                            domEventType: 'custom',
                            itemIdentifier: 'item1',
                            responseIdentifier: null,
                            metadata: { type: 'ready', scope: 'item', timeStamp: 1234567890, foo: 'bar' }
                        }
                    ]);

                    runner.unloadItem('item1');
                })
                .after('unloaditem', () => {
                    runner.destroy();
                })
                .on('destroy', () => {
                    global.Date.now = now;
                    done();
                })
                .init();
        }));

    it('sends lifecycle events on unloaditem if it is disabled on ready item', () =>
        new Promise(done => {
            expect.assertions(5);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner.getPluginConfig = () => ({
                forwardOnItemReady: false
            });

            const now = Date.now;

            global.Date.now = vi.fn(() => 1234567890);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.trigger('lifecycleEvent', 'ready', 'test');
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));
                    runner.trigger('lifecycleEvent', 'ready', 'item', { foo: 'bar' });
                    expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(0);
                    runner.unloadItem('item1');
                })
                .after('unloaditem', () => {
                    expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                    expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                    expect(proxyCallTestActionSpy.mock.calls[0][1]).toHaveProperty('events');
                    expect(proxyCallTestActionSpy.mock.calls[0][1].events).toEqual([
                        {
                            domEventType: 'custom',
                            itemIdentifier: null,
                            responseIdentifier: null,
                            metadata: { type: 'ready', scope: 'test', timeStamp: 1234567890 }
                        },
                        {
                            domEventType: 'custom',
                            itemIdentifier: 'item1',
                            responseIdentifier: null,
                            metadata: { type: 'ready', scope: 'item', timeStamp: 1234567890, foo: 'bar' }
                        }
                    ]);
                    runner.destroy();
                })
                .on('destroy', () => {
                    global.Date.now = now;
                    done();
                })
                .init();
        }));

    it('properly awaits eventsQueue.clear() on proctor-reset event', async () => {
        expect.assertions(2);

        const runner = testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });

        await new Promise((resolve, reject) => {
            runner
                .on('error', reject)
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    runner.setTestContext(Object.assign(runner.getTestContext(), { itemIdentifier: 'item1' }));

                    setTimeout(async () => {
                        try {
                            const plugin = runner.getPlugin('eventsForwarder');
                            expect(plugin.eventsQueue).toBeDefined();

                            // Spy on the clear method to verify it's called and awaited
                            const clearSpy = vi.spyOn(plugin.eventsQueue, 'clear').mockResolvedValue();

                            // Trigger proctor-reset event
                            await runner.trigger('proctor-reset');

                            // Verify clear was called
                            expect(clearSpy).toHaveBeenCalledTimes(1);

                            clearSpy.mockRestore();
                            runner.destroy();
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    }, 1);
                })
                .init();
        });
    });
});
