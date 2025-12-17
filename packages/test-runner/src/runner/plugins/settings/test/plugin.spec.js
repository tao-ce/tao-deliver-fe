// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2O24 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { fireEvent } from '@testing-library/svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import settingsKeys from '../settingsKeys.js';
import { generateElementId } from '@oat-sa-private/ui-core';
import { getTestSessionStatusStore, getTestStateStore } from '../../../testsStateStore.js';
import preset from '../../navigation/navigator/test/testStoreMocks/presetOneSectionNonLinear.json';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../session/testSessionUserDataService.js';

function setupLayout() {
    const div = document.createElement('div');
    div.innerHTML = `<div>
        <div class="overlay">
            <div id="overlay-header"></div>
            <div id="overlay-content"></div>
            <div id="overlay-footer"></div>
        </div>
    </div>`;

    return div;
}

function setupStore(serviceCallId, data) {
    const stateStore = getTestStateStore(serviceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
}

describe('settings plugin', () => {
    let container;
    let getContainer;
    let getTopBarArea;
    let getOverlayHeaderArea;
    let getOverlayContentArea;
    let getOverlayFooterArea;
    let clearAreasContent;
    let testProviderApi;
    let statusStore;
    const serviceCallId = 'test-session-plswrk';

    const enableItemSpy = vi.fn().mockResolvedValue();
    const disableItemSpy = vi.fn().mockResolvedValue();

    beforeEach(() => {
        enableItemSpy.mockClear();
        disableItemSpy.mockClear();

        container = setupLayout();

        getContainer = () => container;
        getTopBarArea = () => container;
        getOverlayHeaderArea = () => container.querySelector('#overlay-header');
        getOverlayContentArea = () => container.querySelector('#overlay-content');
        getOverlayFooterArea = () => container.querySelector('#overlay-footer');
        clearAreasContent = () => {
            getOverlayHeaderArea().innerHTML = '';
            getOverlayContentArea().innerHTML = '';
            getOverlayFooterArea().innerHTML = '';
        };

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getTopBarArea,
                    getOverlayHeaderArea,
                    getOverlayContentArea,
                    getOverlayFooterArea,
                    clearAreasContent
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            enableItem: enableItemSpy,
            disableItem: disableItemSpy,
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);

        setupStore(serviceCallId, Object.assign({}, preset));
        statusStore = getTestSessionStatusStore(serviceCallId);
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        container.innerHTML = '';
        statusStore.clear();
        clearAllTestSessionsUserData();
        vi.clearAllMocks();
    });

    it('renders and destroys without error', () =>
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
                .on('render', () => {
                    expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                    expect(getOverlayContentArea()).toBeEmptyDOMElement();
                    expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                    expect(getOverlayContentArea()).toBeEmptyDOMElement();
                    expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                    done();
                })
                .init();
        }));

    it('creates settings content when opened', () =>
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
                .on('render', () => {
                    runner.trigger('toolbaraction', 'settings');
                    tick()
                        .then(tick)
                        .then(() => {
                            expect(disableItemSpy).toBeCalledWith('item2');
                            expect(statusStore.get()).toBe('overlay');
                            expect(getContainer()).toMatchSnapshot();
                            runner.destroy();
                        });
                })
                .on('destroy', () => {
                    expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                    expect(getOverlayContentArea()).toBeEmptyDOMElement();
                    expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                    done();
                })
                .init();
        }));

    it('removes settings content when closed', () =>
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
                    runner.loadItem('item2');
                })
                .on('renderitem', () => {
                    runner.off('renderitem');

                    expect(statusStore.get()).not.toBe('overlay');

                    runner.trigger('toolbaraction', 'settings');
                })
                .after('disableitem.test', () => {
                    runner.off('disableitem.test');

                    expect(disableItemSpy).toBeCalledWith('item2');
                    expect(statusStore.get()).toBe('overlay');
                    expect(container).toMatchSnapshot();

                    const closeBtn = getOverlayHeaderArea().querySelector('button');
                    fireEvent.click(closeBtn);
                })
                .on('enableitem', () => {
                    expect(enableItemSpy).toBeCalledWith('item2');
                    //statusStore value is updated by runner implementation, so we can't check here that status is not 'overlay' (because runner is mocked)

                    tick()
                        .then(tick)
                        .then(() => {
                            expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                            expect(getOverlayContentArea()).toBeEmptyDOMElement();
                            expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                            runner.destroy();
                        });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('opens settings during a transition', () =>
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
                .on('destroy', done)
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem.test', () => {
                    runner.off('renderitem.test');

                    statusStore.set('loading');
                    runner.trigger('toolbaraction', 'settings');
                    tick()
                        .then(tick)
                        .then(() => {
                            expect(statusStore.get()).toBe('overlay');

                            runner.trigger('toolbaraction', 'settings');
                        })
                        .then(tick)
                        .then(() => {
                            expect(statusStore.get()).toBe('loading');
                            runner.destroy();
                        });
                })
                .init();
        }));

    it('block item loading if opened during a transition', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('destroy', done)
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem.test', () => {
                    runner.off('renderitem.test');

                    statusStore.set('loading');
                    runner.trigger('toolbaraction', 'settings');
                    tick()
                        .then(tick)
                        .then(() => {
                            expect(statusStore.get()).toBe('overlay');

                            runner.on('loaditem.test', () => {
                                runner.off('loaditem.test');

                                expect(statusStore.get()).not.toBe('loading');

                                runner.destroy();
                            });
                            runner.loadItem('item1');

                            setTimeout(() => {
                                //settings is still opened
                                expect(statusStore.get()).toBe('overlay');
                                //close it
                                runner.trigger('toolbaraction', 'settings');
                            }, 300);
                        });
                })
                .init();
        }));

    it('closes on session status changed from overlay to another', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });
            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', () => {
                    runner.off('renderitem');

                    expect(statusStore.get()).not.toBe('overlay');
                    runner.trigger('toolbaraction', 'settings');
                })
                .after('disableitem.test', () => {
                    runner.off('disableitem.test');

                    statusStore.set('loading');
                    tick().then(() => {
                        expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                        expect(getOverlayContentArea()).toBeEmptyDOMElement();
                        expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('updates settings store value', () =>
        new Promise(done => {
            expect.assertions(2);

            const settingsStore = getTestSessionUserDataService(serviceCallId).getSettingsStore();
            settingsStore.set({
                _disabledKeys: []
            });

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    runner.trigger('toolbaraction', 'settings');
                    tick() //item suspend
                        .then(tick) //overlay opens
                        .then(() => {
                            const captionId = generateElementId(`caption-${settingsKeys.choiceElimination}`);
                            const input = getOverlayContentArea().querySelector(`input[aria-labelledby=${captionId}]`);

                            expect(settingsStore.get()).toMatchObject({ _disabledKeys: [] });

                            fireEvent.input(input, { target: { checked: true } });

                            tick().then(() => {
                                expect(settingsStore.get()).toMatchObject({
                                    [settingsKeys.choiceElimination]: true
                                });
                                runner.destroy();
                            });
                        });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('reset all choiceElimination tools on close when setting is false', () =>
        new Promise(done => {
            expect.assertions(2);

            const settingsStore = getTestSessionUserDataService(serviceCallId).getSettingsStore();
            const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
            settingsStore.set({
                choiceElimination: true
            });
            toolsStore.setItemsToolsState({
                item1: {
                    choiceElimination: ['c1', 'c2']
                },
                item2: {
                    choiceElimination: ['c3']
                },
                item3: {
                    choiceElimination: ['c1'],
                    lineReader: 123
                }
            });
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    runner.trigger('toolbaraction', 'settings');
                    tick() //item suspend
                        .then(tick) //overlay opens
                        .then(() => {
                            const captionId = generateElementId(`caption-${settingsKeys.choiceElimination}`);
                            const input = getOverlayContentArea().querySelector(`input[aria-labelledby=${captionId}]`);

                            fireEvent.input(input, { target: { checked: false } });

                            const closeBtn = getOverlayHeaderArea().querySelector('button');
                            fireEvent.click(closeBtn);

                            tick()
                                .then(tick)
                                .then(() => {
                                    expect(settingsStore.get()).toMatchObject({
                                        [settingsKeys.choiceElimination]: false
                                    });
                                    expect(toolsStore.getItemsToolsState()).toMatchObject({
                                        item1: {},
                                        item2: {},
                                        item3: {
                                            lineReader: 123
                                        }
                                    });
                                    runner.destroy();
                                });
                        });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    describe('On load item:', () => {
        let settingsStore;
        let toolsStore;

        beforeEach(() => {
            settingsStore = getTestSessionUserDataService(serviceCallId).getSettingsStore();
            toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
        });

        it('enable settings', () =>
            new Promise(done => {
                expect.assertions(2);
                const enableSettingsSpy = vi.fn().mockResolvedValue();
                const toolsTestToolStateSpy = vi.fn().mockResolvedValue();

                settingsStore.set({
                    _disabledKeys: [],
                    choiceElimination: true
                });

                settingsStore.enableSetting = enableSettingsSpy;
                toolsStore.setTestToolState = toolsTestToolStateSpy;

                const runner = testRunnerFactory('foo', [pluginFactory], {
                    renderTo: container,
                    serviceCallId
                });

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('render', () => {
                        runner.trigger('loaditem.settings', 'item2');
                        expect(enableSettingsSpy).toBeCalledWith('choiceElimination');
                        expect(toolsTestToolStateSpy).toBeCalledWith('settings', { visible: true });

                        done();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            }));

        it('disable settings', () =>
            new Promise(done => {
                expect.assertions(2);
                const disableSettingsSpy = vi.fn().mockResolvedValue();
                const toolsTestToolStateSpy = vi.fn().mockResolvedValue();

                settingsStore.set({
                    _disabledKeys: ['choiceAnswerMasking', 'choiceElimination']
                });

                settingsStore.disableSetting = disableSettingsSpy;
                toolsStore.setTestToolState = toolsTestToolStateSpy;

                const runner = testRunnerFactory('foo', [pluginFactory], {
                    renderTo: container,
                    serviceCallId
                });

                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('render', () => {
                        runner.trigger('loaditem.settings', 'item1');
                        expect(disableSettingsSpy).toBeCalledWith('choiceElimination');
                        expect(toolsTestToolStateSpy).toBeCalledWith('settings', { visible: false });

                        done();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            }));
    });

    it('subscribes setting enable/disable to update tool icon visibility', () =>
        new Promise(done => {
            const settingsStore = getTestSessionUserDataService(serviceCallId).getSettingsStore();
            const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
            const pluginName = 'settings';

            settingsStore.set({
                _disabledKeys: ['choiceAnswerMasking', 'choiceElimination']
            });
            toolsStore.setTestToolState(pluginName, {
                visible: false
            });

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    // enable
                    settingsStore.enableSetting(settingsKeys.choiceAnswerMasking);
                    expect(toolsStore.getTestToolState(pluginName)).toMatchObject({ visible: true });

                    // still visible
                    settingsStore.enableSetting(settingsKeys.choiceElimination);
                    settingsStore.disableSetting(settingsStore.choiceAnswerMasking);
                    expect(toolsStore.getTestToolState(pluginName)).toMatchObject({ visible: true });

                    // disable
                    settingsStore.disableSetting(settingsKeys.choiceElimination);
                    expect(toolsStore.getTestToolState(pluginName)).toMatchObject({ visible: false });

                    runner.destroy();
                })
                .on('destroy', done)
                .init();
        }));
});
