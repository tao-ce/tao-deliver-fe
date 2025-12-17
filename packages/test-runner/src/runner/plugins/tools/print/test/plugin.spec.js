// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

import { tick } from 'svelte';
import { cloneDeep } from 'lodash';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import testsStateStore, { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../../session/testSessionUserDataService.js';
import { testSessionStatus } from '../../../../session/sessionStates.js';
import preset from '../../../navigation/navigator/test/testStoreMocks/presetOneSectionNonLinear.json';

const serviceCallId = 'test-session-plswrk';
const pluginName = 'print';
const category = 'x-tao-printable';

const showOnPrintStyle =
    '@media print { html body, html .test-runner, html .qti-item-container { display: block !important } }';

function setupStore(testServiceCallId, data) {
    const stateStore = getTestStateStore(testServiceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
    return stateStore;
}

function createPrintSpy() {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => void 0);
    return printSpy;
}

function dispatchBeforeprint() {
    window.dispatchEvent(new Event('beforeprint'));
}

function dispatchAfterprint() {
    window.dispatchEvent(new Event('afterprint'));
}

function setupLayout() {
    const root = document.createElement('div');
    root.innerHTML = `
    <div class="qti-item-container">
        <div class="qti-interaction qti-choiceInteraction"></div>
        <div class="qti-interaction qti-customInteraction" data-type-identifier="textReaderInteraction">
            <div class="qti-interaction textReaderInteraction"></div>
        </div>
        <div class="qti-interaction qti-orderInteraction"></div>
        <div class="qti-interaction qti-customInteraction" data-type-identifier="demoPCI"></div>
    </div>`;
    return root;
}

function expectNoNotPrintableInteractions(container) {
    expect(container.querySelector('.not-printable-interaction')).toBeFalsy();
}
function expectPrintableInteraction(selector, container) {
    expect(container.querySelector(selector)).not.toHaveClass('not-printable-interaction');
}
function expectNotPrintableInteraction(selector, container) {
    expect(container.querySelector(selector)).toHaveClass('not-printable-interaction');
}

describe('print plugin', () => {
    let container;
    let testProviderApi;
    let runner;
    let stateStore;
    let statusStore;
    let toolsStore;
    let printSpy;
    let getPluginConfigSpy;

    beforeEach(() => {
        container = setupLayout();
        const getContainer = () => container;
        const getContentArea = () => container.querySelector('.qti-item-container');

        testProviderApi = {
            loadAreaBroker() {
                return { getContainer, getContentArea };
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
            init: () => {}
        });
        testRunnerFactory.registerProvider('foo', testProviderApi);

        stateStore = setupStore(serviceCallId, cloneDeep(preset));
        statusStore = getTestSessionStatusStore(serviceCallId);
        toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();

        printSpy = createPrintSpy();
        getPluginConfigSpy = vi.fn().mockImplementation(() => void 0);

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
        testsStateStore.clear();
        testRunnerFactory.clearProviders();
        clearAllTestSessionsUserData();
        printSpy.mockRestore();
    });

    it('renders and destroys without error, no toolbar button by default', () =>
        new Promise(done => {
            expect.assertions(1);

            const testMap = stateStore.getTestMap();
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item2'].categories = ['x-tao-something'];
            stateStore.setTestMap(testMap);
            statusStore.set(testSessionStatus.interacting);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', async () => {
                    try {
                        await tick();
                        expect(toolsStore.getTestToolState(pluginName)).toEqual({ visible: false });
                        runner.destroy();

                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('if x-tao-printable item category, shows toolbar button which prints current item', () =>
        new Promise(done => {
            expect.assertions(14);

            const testMap = stateStore.getTestMap();
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item2'].categories = [
                'x-tao-something',
                category
            ];
            stateStore.setTestMap(testMap);
            statusStore.set(testSessionStatus.interacting);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem.test', async () => {
                    runner.off('renderitem.test');

                    try {
                        await tick();
                        expect(toolsStore.getTestToolState(pluginName)).toEqual({ visible: true });
                        expect(document.head.innerHTML).toContain(showOnPrintStyle);
                        expect(printSpy).not.toHaveBeenCalled();

                        runner.trigger('toolbaraction', pluginName);
                        expect(printSpy).toHaveBeenCalled();
                        expect(document.head.innerHTML).toContain(showOnPrintStyle);

                        expectNoNotPrintableInteractions(container);
                        dispatchBeforeprint();
                        expectPrintableInteraction('[data-type-identifier="textReaderInteraction"]', container);
                        expectNotPrintableInteraction('[data-type-identifier="demoPCI"]', container);
                        expectNotPrintableInteraction('.qti-choiceInteraction', container);
                        expectNotPrintableInteraction('.qti-orderInteraction', container);
                        dispatchAfterprint();
                        expectNoNotPrintableInteractions(container);

                        //move to not-printable item: shouldn't add styles
                        let renderItem3Promise = new Promise(resolve => runner.on('renderitem.test2', resolve));
                        stateStore.setTestContext({
                            ...stateStore.getTestContext(),
                            itemIdentifier: 'item3',
                            itemPosition: 2
                        });
                        runner.loadItem('item3');
                        await renderItem3Promise;

                        await tick();
                        expect(toolsStore.getTestToolState(pluginName)).toEqual({ visible: false });
                        expect(document.head.innerHTML).toBe('');
                        window.print(); //Ctrl+P or browser menu click
                        expect(printSpy).toHaveBeenCalled();

                        runner.destroy();

                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('printInteractions=true & printPCIs=true options can be set in config', () =>
        new Promise(done => {
            expect.assertions(3);

            getPluginConfigSpy.mockReturnValue({
                printInteractions: true,
                printPCIs: true
            });

            const testMap = stateStore.getTestMap();
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item2'].categories = [
                'x-tao-something',
                category
            ];
            stateStore.setTestMap(testMap);
            statusStore.set(testSessionStatus.interacting);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem.test', async () => {
                    runner.off('renderitem.test');

                    try {
                        await tick();
                        runner.trigger('toolbaraction', pluginName);
                        expect(printSpy).toHaveBeenCalled();
                        expect(document.head.innerHTML).toContain(showOnPrintStyle);

                        dispatchBeforeprint();
                        expectNoNotPrintableInteractions(container);

                        runner.destroy();

                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('printInteractions=false & printPCIs=false options can be set in config', () =>
        new Promise(done => {
            expect.assertions(6);

            getPluginConfigSpy.mockReturnValue({
                printInteractions: false,
                printPCIs: false
            });

            const testMap = stateStore.getTestMap();
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item2'].categories = [
                'x-tao-something',
                category
            ];
            stateStore.setTestMap(testMap);
            statusStore.set(testSessionStatus.interacting);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem.test', async () => {
                    runner.off('renderitem.test');

                    try {
                        await tick();
                        runner.trigger('toolbaraction', pluginName);
                        expect(printSpy).toHaveBeenCalled();
                        expect(document.head.innerHTML).toContain(showOnPrintStyle);

                        dispatchBeforeprint();
                        expectNotPrintableInteraction('[data-type-identifier="textReaderInteraction"]', container);
                        expectNotPrintableInteraction('[data-type-identifier="demoPCI"]', container);
                        expectNotPrintableInteraction('.qti-choiceInteraction', container);
                        expectNotPrintableInteraction('.qti-orderInteraction', container);

                        runner.destroy();

                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('printInteractions=array & printPCIs=array options can be set in config', () =>
        new Promise(done => {
            expect.assertions(6);

            getPluginConfigSpy.mockReturnValue({
                printInteractions: ['choiceInteraction', 'someInteraction'],
                printPCIs: ['demoPCI', 'somePCI']
            });

            const testMap = stateStore.getTestMap();
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item2'].categories = [
                'x-tao-something',
                category
            ];
            stateStore.setTestMap(testMap);
            statusStore.set(testSessionStatus.interacting);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem.test', async () => {
                    runner.off('renderitem.test');

                    try {
                        await tick();
                        runner.trigger('toolbaraction', pluginName);
                        expect(printSpy).toHaveBeenCalled();
                        expect(document.head.innerHTML).toContain(showOnPrintStyle);

                        dispatchBeforeprint();
                        expectNotPrintableInteraction('[data-type-identifier="textReaderInteraction"]', container);
                        expectPrintableInteraction('[data-type-identifier="demoPCI"]', container);
                        expectPrintableInteraction('.qti-choiceInteraction', container);
                        expectNotPrintableInteraction('.qti-orderInteraction', container);

                        runner.destroy();

                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('hideToolbarButton=true can be set in config', () =>
        new Promise(done => {
            expect.assertions(5);

            getPluginConfigSpy.mockReturnValue({
                hideToolbarButton: true
            });

            const testMap = stateStore.getTestMap();
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item2'].categories = [
                'x-tao-something',
                category
            ];
            stateStore.setTestMap(testMap);
            statusStore.set(testSessionStatus.interacting);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem.test', async () => {
                    runner.off('renderitem.test');

                    try {
                        await tick();
                        expect(toolsStore.getTestToolState(pluginName)).toEqual({ visible: false });
                        expect(document.head.innerHTML).toContain(showOnPrintStyle);

                        expectNoNotPrintableInteractions(container);
                        window.print(); //Ctrl+P or browser menu click
                        dispatchBeforeprint();
                        expectPrintableInteraction('[data-type-identifier="textReaderInteraction"]', container);

                        runner.destroy();
                        await tick();
                        expect(document.head.innerHTML).toBe('');

                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));
});
