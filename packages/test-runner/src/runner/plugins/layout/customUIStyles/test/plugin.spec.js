// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import preset from '../../../navigation/navigator/test/testStoreMocks/presetFourSectionsNonLinear.json';
import { testSessionStatus } from '../../../../session/sessionStates.js';

describe('customUiStyles plugin', () => {
    let container;
    let getContainer;
    let getArea;
    let testProviderApi;
    let testStateStore;
    let statusStore;

    const serviceCallId = 'test-session-123';

    const areaIdToDomId = {
        testRunner: 'test-runner',
        content: 'content'
    };

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
            <div class="test-runner" id="test-runner">
                <div id="content">
                    <main id="test-main">
                        <section class="qti-item">
                            <div class="item-itself">I am item</div>
                        </section>
                    </main>
                </div>
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

    beforeEach(() => {
        container = setupLayout();
        getContainer = () => container;
        getArea = areaId => container.querySelector(`#${areaIdToDomId[areaId]}`);
        const getTestRunnerArea = () => getArea('testRunner');
        const getContentArea = () => getArea('content');

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getArea,
                    getTestRunnerArea,
                    getContentArea
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
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        removeLayout();
    });

    it("adds custom ui classes to test runner container and itemContainer's child", () =>
        new Promise(done => {
            const runner = createTestRunner();
            const testConfig = runner.getConfig();
            testConfig.options = {
                customUiId: 'core1'
            };

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item'
            });

            const itemIdentifier = 'item1';

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem(itemIdentifier);
                })
                .after(`renderitem`, () => {
                    const testRunnerContainer = getContainer().querySelector('.test-runner');
                    const itemContainer = getContainer().querySelector('.qti-item');
                    expect(testRunnerContainer).toHaveClass('custom-ui');
                    expect(testRunnerContainer).toHaveClass('core1');
                    expect(itemContainer.firstElementChild).toHaveClass('core1');
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('adds custom style tag to head, and removes it on destroy', () =>
        new Promise(done => {
            const runner = createTestRunner();
            const testConfig = runner.getConfig();
            testConfig.options = {
                customUiId: 'core1'
            };
            const customCss = '.core1 {background-color: silver}';
            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                core1: customCss
            });

            const itemIdentifier = 'item1';

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem(itemIdentifier);
                })
                .after(`renderitem`, () => {
                    expect(document.head.querySelector('style[data-custom-ui-id="core1"]').textContent).toBe(customCss);
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(document.head.querySelector('style[data-custom-ui-id="core1"]')).toBeNull();
                    done();
                })
                .init();
        }));

    it('adds multiple custom style tags to head, and removes them on destroy', () =>
        new Promise(done => {
            const runner = createTestRunner();
            const testConfig = runner.getConfig();
            testConfig.options = {
                customUiId: ['core1', 'core2']
            };
            const customCss1 = '.core1 {background-color: silver}';
            const customCss2 = 'body {outline: 1px solid gold}';
            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                core1: customCss1,
                core2: customCss2
            });

            const itemIdentifier = 'item1';

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem(itemIdentifier);
                })
                .after(`renderitem`, () => {
                    expect(document.head.querySelector('style[data-custom-ui-id="core1"]').textContent).toBe(
                        customCss1
                    );
                    expect(document.head.querySelector('style[data-custom-ui-id="core2"]').textContent).toBe(
                        customCss2
                    );
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(document.head.querySelector('style[data-custom-ui-id="core1"]')).toBeNull();
                    expect(document.head.querySelector('style[data-custom-ui-id="core2"]')).toBeNull();
                    done();
                })
                .init();
        }));
});
