// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { testSessionStatus } from '../../../../session/sessionStates.js';
import testsStateStore, { getTestStateStore, getTestSessionStatusStore } from '../../../../testsStateStore.js';
import { getTimersStore, clearAllTimersStores } from '../../../../timers/timersStore.js';
import preset from '../../../navigation/navigator/test/testStoreMocks/presetOneSectionNonLinear.json';

function setupLayout() {
    const section = document.createElement('section');
    section.innerHTML = `
    <header tabindex="-1"></header>
    <main>
        <h2 id="a11y-main" tabindex="-1"></h2>
    </main>
 `;
    document.body.appendChild(section); //for focus test
    return section;
}

describe('title plugin', () => {
    afterEach(() => {
        testsStateStore.clear();
        clearAllTimersStores();
    });

    it('renders and destroys', () =>
        new Promise(done => {
            const container = setupLayout();
            const getHeaderArea = vi.fn(() => container.querySelector('header'));
            const getContainer = vi.fn(() => container);
            testRunnerFactory.registerProvider('foo', {
                loadAreaBroker() {
                    return {
                        getHeaderArea,
                        getContainer
                    };
                },
                init() {}
            });
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId: 'test-session-12'
            });

            expect(container).toMatchSnapshot();
            expect(getHeaderArea).not.toHaveBeenCalled();
            expect(getContainer).not.toHaveBeenCalled();

            runner
                .on('render', () => {
                    expect(container).toMatchSnapshot();
                    expect(getHeaderArea).toHaveBeenCalled();
                    expect(getContainer).toHaveBeenCalled();

                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(container).toMatchSnapshot();
                    done();
                })
                .init();
        }));

    it('mounts components', () =>
        new Promise(done => {
            vi.useFakeTimers();
            expect.assertions(3);

            const container = setupLayout();
            const getHeaderArea = () => container.querySelector('header');
            const getContainer = () => container;
            testRunnerFactory.registerProvider('foo', {
                loadAreaBroker() {
                    return {
                        getHeaderArea,
                        getContainer
                    };
                },
                init() {}
            });

            const serviceCallId = 'test-session-123';
            const presetData = Object.assign({}, preset);
            const stateStore = getTestStateStore(serviceCallId);
            const statusStore = getTestSessionStatusStore(serviceCallId);
            const timersStore = getTimersStore(serviceCallId);
            stateStore.setTestMap(presetData.testMap);
            stateStore.setTestContext(presetData.testContext);
            statusStore.set(testSessionStatus.interacting);
            timersStore.initializeTimers([
                {
                    level: 'item',
                    id: 'item2',
                    timerValue: {
                        timeAssigned: 60000,
                        timeLeft: 60000,
                        timeStr: '1min'
                    }
                }
            ]);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('init', () => {})
                .on('ready', () => {
                    vi.runAllTimers();
                    tick().then(() => {
                        expect(getHeaderArea().querySelector('.timer-aria-live')).toBeTruthy(); //TimersAriaLive
                        expect(getHeaderArea().querySelector('.breadcrumb')).toBeTruthy(); //TestTitle
                        expect(getContainer().querySelector('#a11y-main span')).toBeTruthy(); //HiddenContentTitle

                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('sets focus on hidden title when sessionStatus switches to interacting', () =>
        new Promise(done => {
            expect.assertions(4);

            const container = setupLayout();
            const getHeaderArea = () => container.querySelector('header');
            const getContainer = () => container;
            testRunnerFactory.registerProvider('foo', {
                loadAreaBroker() {
                    return {
                        getHeaderArea,
                        getContainer
                    };
                },
                init() {}
            });
            const serviceCallId = 'test-session-123';
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            const hiddenTitleContainer = getContainer().querySelector('#a11y-main');

            runner
                .on('init', () => {
                    const stateStore = getTestStateStore(serviceCallId);
                    stateStore.setTestMap({});
                    stateStore.setTestContext({});
                })
                .on('ready', () => {
                    expect(hiddenTitleContainer).toBeTruthy();
                    expect(hiddenTitleContainer).not.toHaveFocus();

                    const statusStore = getTestSessionStatusStore(serviceCallId);

                    Promise.resolve()
                        .then(() => clearFocus())
                        .then(() => checkFocus(testSessionStatus.interacting))
                        .then(() => done());

                    function checkFocus(status) {
                        return new Promise(res => {
                            statusStore.set(status);

                            tick().then(() => {
                                expect(hiddenTitleContainer).toHaveFocus();

                                res();
                            });
                        });
                    }

                    function clearFocus() {
                        getHeaderArea().focus();
                        expect(hiddenTitleContainer).not.toHaveFocus();
                    }
                })
                .init();
        }));
});
