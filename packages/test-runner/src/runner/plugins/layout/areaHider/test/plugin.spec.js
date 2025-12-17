// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import { testSessionStatus } from '../../../../session/sessionStates.js';

import preset from '../../../navigation/navigator/test/testStoreMocks/presetFourSectionsNonLinear.json';

describe('areaHider plugin', () => {
    let container;
    let getContainer;
    let getArea;
    let testProviderApi;
    let testStateStore;
    let statusStore;

    const serviceCallId = 'test-session-123';

    const areaIdToDomId = {
        topBar: 'test-top-bar',
        navigation: 'test-navigation'
    };

    preset.testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item1'].categories = [
        'x-tao-option-areaHider-topBar'
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
                <div id="test-top-bar">
                </div>
                <main id="test-main" />
                <div id="test-navigation">
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

    function expectNotHidden(areaId) {
        expect(getContainer().querySelector(`#${areaIdToDomId[areaId]}`).style.display).not.toEqual('none');
    }

    function expectHidden(areaId) {
        expect(getContainer().querySelector(`#${areaIdToDomId[areaId]}`).style.display).toEqual('none');
    }

    beforeEach(() => {
        container = setupLayout();

        getContainer = () => container;
        getArea = areaId => container.querySelector(`#${areaIdToDomId[areaId]}`);

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getArea
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
        statusStore.clear();
    });

    it('hides specified layout elements on item load', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .after(`loaditem.item1`, () => {
                    expectHidden('topBar'); //item1 has category to hide topBar
                    runner.destroy();
                })
                .on('destroy', () => {
                    expectNotHidden('topBar'); //topbar is visible again on destroy
                    done();
                })
                .init();
        }));

    it('unhides specified layout elements on item unload', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item1');
                })
                .after(`loaditem.item1`, () => {
                    expectHidden('topBar');
                    runner.unloadItem('item1');
                })
                .after(`unloaditem.item1`, () => {
                    expectNotHidden('topBar'); //on item unload area is unhidden
                    runner.destroy();
                })
                .on('destroy', () => {
                    expectNotHidden('topBar');
                    done();
                })
                .init();
        }));
});
