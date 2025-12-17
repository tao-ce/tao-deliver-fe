// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../../session/testSessionUserDataService.js';
import { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import { testSessionStatus } from '../../../../session/sessionStates.js';
import preset from '../../../navigation/navigator/test/testStoreMocks/presetFourSectionsNonLinear.json';

describe('calculator plugin', () => {
    let container;
    let getContainer;
    let getToolsArea;
    let getMainArea;
    let getTestRunnerArea;
    let testProviderApi;
    let statusStore;
    let testStateStore;
    let toolsStore;
    const serviceCallId = 'test-session-xyz';
    const pluginName = 'calculator';

    preset.testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item1'].categories = [
        'x-tao-option-calculatorBodmas'
    ];
    preset.testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item2'].categories = [
        'x-tao-option-calculator-scientific'
    ];
    preset.testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item3'].categories = [
        'x-tao-option-calculatorBodmas',
        'x-tao-option-calculator-scientific'
    ];
    //item4, item5 have no categories

    function createTestRunner() {
        return testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });
    }

    function setupLayout() {
        const div = document.createElement('div');
        div.classList.add('fixture');
        div.innerHTML = `
            <div class="test-runner">
                <div class="top-bar">
                </div>
                <main id="test-main" />
            </div>
        `;
        document.body.appendChild(div);

        return div;
    }

    function removeLayout() {
        const div = document.querySelector('.fixture');
        if (div) {
            div.remove();
        }
    }

    function expectInDOM(calculatorType) {
        expect(getMainArea().querySelectorAll(`.calculator`).length).toBe(1);
        expect(getMainArea().querySelectorAll(`.calculator.${calculatorType}`).length).toBe(1);
    }

    function expectNotInDOM() {
        expect(getMainArea().querySelectorAll(`.calculator`).length).toBe(0);
    }

    beforeEach(() => {
        container = setupLayout();

        getContainer = () => container;
        getToolsArea = () => container.querySelector('.top-bar');
        getMainArea = () => container.querySelector('#test-main');
        getTestRunnerArea = () => container.querySelector('.test-runner');

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getToolsArea,
                    getMainArea,
                    getTestRunnerArea
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            init() {}
        };

        testRunnerFactory.registerProvider('foo', testProviderApi);

        let presetData = Object.assign({}, preset);

        testStateStore = getTestStateStore(serviceCallId);
        testStateStore.setTestMap(presetData.testMap);
        testStateStore.setTestContext(presetData.testContext);

        statusStore = getTestSessionStatusStore(serviceCallId);
        statusStore.set(testSessionStatus.interacting);

        toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        removeLayout();
        clearAllTestSessionsUserData();
        statusStore.clear();
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    expectNotInDOM();
                    runner.destroy();
                })
                .on('destroy', () => {
                    expectNotInDOM();
                    done();
                })
                .init();
        }));

    test.each([
        ['bodmas', 'x-tao-option-calculatorBodmas', 'item1'],
        ['scientific', 'x-tao-option-calculator-scientific', 'item2'],
        ['scientific', 'x-tao-option-calculatorBodmas and x-tao-option-calculator-scientific', 'item3']
    ])(
        'opens and closes on headerbar action: %s calculator if %s category',
        (type, category, itemId) =>
            new Promise(done => {
                expect.assertions(7);

                const runner = createTestRunner();
                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('ready', () => {
                        preset.testContext.itemIdentifier = itemId;
                        runner.loadItem(itemId);
                    })
                    .on('renderitem', () => {
                        expectNotInDOM();
                        expect(toolsStore.getTestToolState(pluginName)).toEqual({ type, visible: true });

                        runner.trigger('toolbaraction', pluginName); //open
                        tick()
                            .then(() => {
                                expectInDOM(type);
                                expect(toolsStore.getTestToolState(pluginName)).toMatchSnapshot();

                                return tick();
                            })
                            .then(() => {
                                runner.trigger('toolbaraction', pluginName); //close
                                return tick();
                            })
                            .then(tick)
                            .then(() => {
                                expectNotInDOM();
                                expect(toolsStore.getTestToolState(pluginName)).toMatchSnapshot();
                                done();
                            });
                    })
                    .init();
            })
    );

    test.each([
        ['bodmas', 'item1'],
        ['scientific', 'item2'],
        ['scientific', 'item3']
    ])(
        'closes on leaving item with %s calculator',
        (type, itemId) =>
            new Promise(done => {
                expect.assertions(7);

                const runner = createTestRunner();
                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('ready', () => {
                        preset.testContext.itemIdentifier = itemId;
                        runner.loadItem(itemId);
                    })
                    .on('renderitem', () => {
                        expectNotInDOM();
                        expect(toolsStore.getTestToolState(pluginName)).toEqual({ type, visible: true });

                        runner.trigger('toolbaraction', pluginName); //open
                        tick().then(() => {
                            expectInDOM(type);
                            expect(toolsStore.getTestToolState(pluginName)).toMatchSnapshot();

                            runner.unloadItem(); //close
                        });
                    })
                    .on('unloaditem', () => {
                        tick().then(() => {
                            expectNotInDOM();
                            expect(toolsStore.getTestToolState(pluginName)).toMatchSnapshot();
                            done();
                        });
                    })
                    .init();
            })
    );

    it('does not render anything if item has no calculator categories', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item4';
                    runner.loadItem('item4');
                })
                .on('renderitem', () => {
                    expectNotInDOM();
                    expect(toolsStore.getTestToolState(pluginName)).toEqual({ visible: false });
                    done();
                })
                .init();
        }));
});
