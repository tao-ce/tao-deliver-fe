// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
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
import preset from '../../../navigation/navigator/test/testStoreMocks/presetOneSectionNonLinear.json';

describe('lineReader plugin', () => {
    let container;
    let getContainer;
    let getToolsArea;
    let getContentArea;
    let getMainArea;
    let getTestRunnerArea;
    let testProviderApi;
    let statusStore;
    let testStateStore;
    let toolsStore;
    const serviceCallId = 'test-session-xyz';
    const pluginName = 'lineReader';

    // item1 will have the LineReader category, item2 & item3  will not
    preset.testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item1'].categories = [
        'x-tao-option-lineReader'
    ];

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
                <main id="test-main">
                    <div class="qti-item-container">
                        <div class="qti-item">Item content</div>
                    </div>
                </main>
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

    function expectInDOM(inDom) {
        expect(getTestRunnerArea().querySelectorAll('.line-reader').length).toBe(inDom ? 1 : 0);
        expect(getMainArea().querySelectorAll('.item-content-overlay').length).toBe(inDom ? 2 : 0);
    }

    beforeEach(() => {
        container = setupLayout();

        getContainer = () => container;
        getToolsArea = () => container.querySelector('.top-bar');
        getContentArea = () => container.querySelector('.qti-item-container');
        getMainArea = () => container.querySelector('#test-main');
        getTestRunnerArea = () => container.querySelector('.test-runner');

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getToolsArea,
                    getContentArea,
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
            expect.assertions(4);

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
                    expectInDOM(false);
                    runner.destroy();
                })
                .on('destroy', () => {
                    expectInDOM(false);
                    done();
                })
                .init();
        }));

    it('opens and closes on headerbar action, and updates state', () =>
        new Promise(done => {
            expect.assertions(8);

            const runner = createTestRunner();
            expectInDOM(false);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('renderitem', () => {
                    runner.trigger('toolbaraction', pluginName); //open
                    tick()
                        .then(() => {
                            expectInDOM(true);
                            expect(toolsStore.getTestToolState(pluginName)).toEqual({ open: true, visible: true });

                            return tick();
                        })
                        .then(() => {
                            runner.trigger('toolbaraction', pluginName); //close
                            return tick();
                        })
                        .then(tick)
                        .then(() => {
                            expectInDOM(false);
                            expect(toolsStore.getTestToolState(pluginName)).toEqual({ open: false, visible: true });
                            done();
                        });
                })
                .init();
        }));

    it('does not render anything if the category x-tao-option-lineReader is absent', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item2';
                    runner.loadItem('item2');
                })
                .on('renderitem', () => {
                    expectInDOM(false);
                    expect(toolsStore.getTestToolState(pluginName)).toEqual({ visible: false });
                    done();
                })
                .init();
        }));

    it('adds 5.5rem padding to item content on open and removes on close', () =>
        new Promise(done => {
            const runner = createTestRunner();

            expect.assertions(2);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    preset.testContext.itemIdentifier = 'item1';
                    runner.loadItem('item1');
                })
                .on('render', () => {
                    const testRunnerArea = getTestRunnerArea();
                    runner.trigger('toolbaraction', pluginName);
                    return tick()
                        .then(() => {
                            expect(testRunnerArea.style.getPropertyValue('--testrunner-item-bottom-padding')).toBe(
                                '5.5rem'
                            );

                            runner.trigger('toolbaraction', pluginName);

                            return tick();
                        })
                        .then(() => {
                            expect(testRunnerArea.style.getPropertyValue('--testrunner-item-bottom-padding')).toBe('');
                            done();
                        });
                })
                .init();
        }));
});
