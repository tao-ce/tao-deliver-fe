// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

import { tick } from 'svelte';
import { cloneDeep } from 'lodash';
import { wait } from '../../../../util/common.js';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import testsStateStore, { getTestStateStore } from '../../../../testsStateStore.js';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../../session/testSessionUserDataService.js';
import preset from '../../../navigation/navigator/test/testStoreMocks/presetOneSectionNonLinear.json';

function setupLayout() {
    const div = document.createElement('div');
    div.innerHTML = `<div class="qti-item-container"></div><nav></nav><div class="a11y-area"></div>`;
    return div;
}

const serviceCallId = 'test-session-plswrk';

function setupStore(testServiceCallId, data) {
    const stateStore = getTestStateStore(testServiceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
}

const panelUi = {
    findRoot: function (container) {
        return container.querySelector('.a11y-menu-panel');
    },
    findOpenedPanel: function (container) {
        return container.querySelector('.panel.open');
    },
    findPanelCloseButton: function (container) {
        return container.querySelector('.panel button[aria-label^="Close"]');
    },
    findCollapsibleHeader: function (container, groupName) {
        return Array.from(container.querySelectorAll('details')).find(el =>
            el.querySelector('summary').textContent.includes(groupName)
        );
    },
    toggleCollapsibleHeader: function (collapsibleHeaderElem, open) {
        collapsibleHeaderElem.open = open;
        collapsibleHeaderElem.dispatchEvent(new CustomEvent('toggle'));
    },
    isHeaderCollapsed: function (collapsibleHeaderElem) {
        return !collapsibleHeaderElem.open && collapsibleHeaderElem.getAttribute('open') !== 'true';
    },
    findStepperPlusButton: function (container, settingName) {
        return container.querySelector(`.stepper button[aria-label*="increase ${settingName.toLowerCase()}"]`);
    },
    findStepperMinusButton: function (container, settingName) {
        return container.querySelector(`.stepper button[aria-label*="decrease ${settingName.toLowerCase()}"]`);
    },
    isFontSizeValueApplied: function (container, fontSizeValue) {
        return container.style.getPropertyValue('--fontsize-body') === fontSizeValue;
    }
};

describe('a11yMenuPanel plugin', () => {
    let testProviderApi;
    let container;
    let getContainer;
    let getA11yMenuPanelArea;
    let settingsStore;
    let runner;

    let proxyCallTestActionSpy;
    let getPluginConfigSpy;
    let dateNowSpy;

    beforeEach(() => {
        container = setupLayout();
        getContainer = () => container;
        getA11yMenuPanelArea = () => container.querySelector('.a11y-area');

        proxyCallTestActionSpy = vi.fn().mockImplementation(() => Promise.resolve());
        getPluginConfigSpy = vi.fn().mockImplementation(() => void 0);
        dateNowSpy = vi.spyOn(Date, 'now');

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getA11yMenuPanelArea
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

        setupStore(serviceCallId, cloneDeep(preset));
        settingsStore = getTestSessionUserDataService(serviceCallId).getSettingsStore();

        runner = testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        }).on('error', err => {
            runner.destroy();
            throw err;
        });
        runner.getPluginConfig = getPluginConfigSpy;
    });

    afterEach(() => {
        container.innerHTML = '';

        testsStateStore.clear();
        testRunnerFactory.clearProviders();
        clearAllTestSessionsUserData();

        dateNowSpy.mockRestore();
    });

    it('opens/closes panel on toolbar-action, does not auto-open by default', () =>
        new Promise(done => {
            expect.assertions(4);

            getPluginConfigSpy.mockReturnValue({
                eventLog: { enabled: false }
            });

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', async () => {
                    try {
                        await tick();
                        expect(panelUi.findOpenedPanel(container)).toBeFalsy();
                        runner.trigger('toolbaraction', 'a11yMenuPanel');

                        await tick();
                        expect(panelUi.findOpenedPanel(container)).toBeTruthy();

                        runner.trigger('toolbaraction', 'a11yMenuPanel');
                        await tick();
                        expect(panelUi.findOpenedPanel(container)).toBeFalsy();

                        runner.destroy();
                        await tick();
                        expect(panelUi.findRoot(container)).toBeFalsy();

                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('auto-opens panel on first item load if configured, panel can be closed by click', () =>
        new Promise(done => {
            expect.assertions(6);

            getPluginConfigSpy.mockReturnValue({
                openOnStart: true,
                eventLog: { enabled: false }
            });

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem.test', async () => {
                    try {
                        runner.off('renderitem.test');
                        await tick();
                        expect(panelUi.findOpenedPanel(container)).toBeTruthy();

                        expect(getContainer()).toMatchSnapshot(); //renders panel content (default configuration)

                        const panelCloseButton = panelUi.findPanelCloseButton(container);
                        expect(panelCloseButton).toBeTruthy();
                        panelCloseButton.click();
                        await tick();
                        expect(panelUi.findOpenedPanel(container)).toBeFalsy();

                        let renderItem3Promise = new Promise(resolve => runner.on('renderitem', resolve));
                        runner.loadItem('item3');
                        await renderItem3Promise;
                        await tick();
                        expect(panelUi.findOpenedPanel(container)).toBeFalsy();

                        runner.destroy();
                        await tick();
                        expect(panelUi.findRoot(container)).toBeFalsy();

                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('panel content rendering depends on configuration', () =>
        new Promise(done => {
            expect.assertions(1);

            //collapsed, collapsible, enabled groups & settings, group order, setting options
            getPluginConfigSpy.mockReturnValue({
                openOnStart: true,
                eventLog: { enabled: false },
                groups: ['group-text', 'group-contrast', 'group-pointer'],
                'group-contrast': {
                    collapsed: true
                },
                'group-text': {
                    collapsible: false
                },
                fontFamily: {
                    families: ['default', 'courier']
                },
                lineHeight: {
                    enabled: false
                },
                letterAndWordSpacing: {
                    enabled: false
                }
            });

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', async () => {
                    try {
                        await tick();
                        expect(getContainer()).toMatchSnapshot(); //renders panel content (modified configuration)

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('stores state of setting values & group header collapsed state', () =>
        new Promise(done => {
            expect.assertions(10);

            getPluginConfigSpy.mockReturnValue({
                openOnStart: true,
                eventLog: { enabled: false }
            });

            settingsStore.setSetting('other-key', { foo: 'bar' });

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', async () => {
                    try {
                        await tick();
                        expect(settingsStore.get()).toEqual(expect.objectContaining({ 'other-key': { foo: 'bar' } }));

                        //collapse header
                        const textGroupHeader = panelUi.findCollapsibleHeader(container, 'Text');
                        expect(panelUi.isHeaderCollapsed(textGroupHeader)).toBe(false); //compare with 'restore state' test-case below

                        expect(textGroupHeader).toBeTruthy();
                        panelUi.toggleCollapsibleHeader(textGroupHeader, false);
                        await tick();
                        expect(settingsStore.get()).toEqual(
                            expect.objectContaining({
                                'other-key': { foo: 'bar' },
                                a11yMenuPanel: expect.objectContaining({ 'group-text': { collapsed: true } })
                            })
                        );

                        //change setting
                        expect(panelUi.isFontSizeValueApplied(container, '2.5rem')).toBe(false); //compare with 'restore state' test-case below
                        const fontSizeIncreaseBtn = panelUi.findStepperPlusButton(container, 'Font size');
                        expect(fontSizeIncreaseBtn).toBeTruthy();
                        fontSizeIncreaseBtn.click();
                        await tick();
                        expect(settingsStore.get()).toEqual(
                            expect.objectContaining({
                                'other-key': { foo: 'bar' },
                                a11yMenuPanel: expect.objectContaining({ 'group-text': { collapsed: true } }),
                                fontSize: {
                                    toolState: {
                                        value: 1,
                                        fontSizeBody: '2.5rem',
                                        fontSizeDescriptor: 'large',
                                        nonDefault: true
                                    }
                                }
                            })
                        );

                        //uncollapse header
                        panelUi.toggleCollapsibleHeader(textGroupHeader, true);
                        await tick();
                        expect(settingsStore.get()).toEqual(
                            expect.objectContaining({
                                'other-key': { foo: 'bar' },
                                a11yMenuPanel: expect.objectContaining({ 'group-text': { collapsed: false } }),
                                fontSize: {
                                    toolState: {
                                        value: 1,
                                        fontSizeBody: '2.5rem',
                                        fontSizeDescriptor: 'large',
                                        nonDefault: true
                                    }
                                }
                            })
                        );

                        //reset setting
                        const fontSizeDecreaseBtn = panelUi.findStepperMinusButton(container, 'Font size');
                        expect(fontSizeDecreaseBtn).toBeTruthy();
                        fontSizeDecreaseBtn.click();
                        await tick();
                        expect(settingsStore.get()).toEqual(
                            expect.objectContaining({
                                'other-key': { foo: 'bar' },
                                a11yMenuPanel: expect.objectContaining({ 'group-text': { collapsed: false } }),
                                fontSize: {
                                    toolState: {
                                        value: 0,
                                        fontSizeBody: '2rem',
                                        fontSizeDescriptor: 'normal',
                                        nonDefault: false
                                    }
                                }
                            })
                        );

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('restores state of setting values & group header collapsed state', () =>
        new Promise(done => {
            expect.assertions(3);

            getPluginConfigSpy.mockReturnValue({
                openOnStart: true,
                eventLog: { enabled: false }
            });

            settingsStore.set({
                'other-key': { foo: 'bar' },
                a11yMenuPanel: { 'group-text': { collapsed: true } },
                fontSize: {
                    toolState: {
                        value: 1,
                        fontSizeBody: '2.5rem',
                        fontSizeDescriptor: 'large',
                        nonDefault: true
                    }
                }
            });

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', async () => {
                    try {
                        await tick();
                        expect(container).toMatchSnapshot(); //check here non-default styles of group & setting

                        //header is collapsed
                        const textGroupHeader = panelUi.findCollapsibleHeader(container, 'Text');
                        expect(panelUi.isHeaderCollapsed(textGroupHeader)).toBe(true);
                        //setting is applied
                        expect(panelUi.isFontSizeValueApplied(container, '2.5rem')).toBe(true);

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('logs with "ui-log": value changes & panel open/close', () =>
        new Promise(done => {
            expect.assertions(10);

            getPluginConfigSpy.mockReturnValue({
                openOnStart: true
            });

            dateNowSpy.mockReturnValue(1703752809000);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem.test', async () => {
                    try {
                        runner.off('renderitem.test');
                        await wait(0); //event queue initialization

                        //panel auto-opened: logged

                        //header is collapsed: not logged
                        dateNowSpy.mockReturnValue(Date.now() + 2);
                        const textGroupHeader = panelUi.findCollapsibleHeader(container, 'Text');
                        panelUi.toggleCollapsibleHeader(textGroupHeader, false);

                        //setting changed: logged
                        dateNowSpy.mockReturnValue(Date.now() + 2);
                        const fontSizeIncreaseBtn = panelUi.findStepperPlusButton(container, 'Font size');
                        fontSizeIncreaseBtn.click();

                        //panel closed: logged
                        dateNowSpy.mockReturnValue(Date.now() + 2);
                        const panelCloseButton = panelUi.findPanelCloseButton(container);
                        panelCloseButton.click();

                        //confirm header/setting state changes were applied
                        await tick();
                        const settings2 = settingsStore.get();
                        expect(
                            settings2?.a11yMenuPanel?.['group-text']?.collapsed === true &&
                                settings2?.fontSize?.toolState?.fontSizeBody === '2.5rem'
                        ).toBe(true);

                        //logs are sent on unloaditem
                        let unloadItemPromise = new Promise(resolve =>
                            runner.on('unloaditem.test', () => {
                                runner.off('unloaditem.test');
                                resolve();
                            })
                        );
                        expect(proxyCallTestActionSpy).not.toHaveBeenCalled();
                        runner.unloadItem('item2');
                        await unloadItemPromise;
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                        expect(proxyCallTestActionSpy.mock.calls[0][1]).toMatchSnapshot();
                        proxyCallTestActionSpy.mockClear();

                        //load another item
                        let renderItem3Promise = new Promise(resolve => runner.on('renderitem', resolve));
                        runner.loadItem('item3');
                        await renderItem3Promise;

                        //logs are sent on queue buffer size exceeded
                        const expectedBufferSize = 10;
                        const fontSizeDecreaseBtn = panelUi.findStepperMinusButton(container, 'Font size');
                        dateNowSpy.mockReturnValue(Date.now() + 2);
                        const timestampOfFirstLogEvent = Date.now();
                        for (let i = 0; i < Math.floor(expectedBufferSize / 2) + 1; i++) {
                            //record 12 events for bufferSize=10
                            fontSizeIncreaseBtn.click();
                            fontSizeDecreaseBtn.click();
                        }
                        await tick();
                        expect(proxyCallTestActionSpy).toHaveBeenCalledTimes(1);
                        expect(proxyCallTestActionSpy.mock.calls[0][0]).toBe('ui-log');
                        const mockCallEvents = proxyCallTestActionSpy.mock.calls[0][1].events;
                        expect(mockCallEvents?.length).toBe(expectedBufferSize);
                        expect(
                            mockCallEvents[0].metadata?.timeStamp === timestampOfFirstLogEvent &&
                                mockCallEvents[expectedBufferSize - 1].metadata?.timeStamp === timestampOfFirstLogEvent
                        ).toBe(true);
                        proxyCallTestActionSpy.mockClear();

                        //cleanup queue storage which may affect other tests
                        let unloadItemPromise2 = new Promise(resolve => runner.on('unloaditem', resolve));
                        runner.unloadItem('item3');
                        await unloadItemPromise2;
                        expect(proxyCallTestActionSpy).toHaveBeenCalled();

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('no "ui-log" logging if disabled in config', () =>
        new Promise(done => {
            expect.assertions(2);

            getPluginConfigSpy.mockReturnValue({
                openOnStart: true,
                eventLog: { enabled: false }
            });

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', async () => {
                    try {
                        await wait(0); //event queue initialization

                        //panel auto-opened, setting changed
                        const fontSizeIncreaseBtn = panelUi.findStepperPlusButton(container, 'Font size');
                        fontSizeIncreaseBtn.click();
                        await tick();
                        const settings2 = settingsStore.get();
                        expect(settings2?.fontSize?.toolState?.fontSizeBody === '2.5rem').toBe(true);

                        //logs won't be sent on unloaditem
                        let unloadItemPromise = new Promise(resolve => runner.on('unloaditem', resolve));
                        runner.unloadItem('item2');
                        await unloadItemPromise;
                        expect(proxyCallTestActionSpy).not.toHaveBeenCalled();

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('sets convertPxToRem config option to settings store', () =>
        new Promise(done => {
            expect.assertions(2);

            getPluginConfigSpy.mockReturnValue({
                convertPxToRem: { enabled: true, cssProperties: ['abc', 'def'] }
            });

            expect(settingsStore.get()?.a11yMenuPanel?.convertPxToRem).toBeFalsy();

            runner
                .on('ready', async () => {
                    try {
                        expect(settingsStore.get()?.a11yMenuPanel?.convertPxToRem).toEqual({
                            enabled: true,
                            cssProperties: ['abc', 'def']
                        });
                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));
});
