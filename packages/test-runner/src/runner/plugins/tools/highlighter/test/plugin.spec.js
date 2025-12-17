// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-core/highlighter/highlighter.js', async () => {
    const originalModule = await vi.importActual('@oat-sa-private/ui-core/highlighter/highlighter.js');
    return Object.assign({ __esModule: true }, originalModule, {
        default: function (...args) {
            const instance = originalModule.default(...args);
            instance.highlightFromIndex = fromModel => {
                instance.mockLastModelSetToDom = fromModel;
            };
            instance.getHighlightIndex = () => ({
                highlightModel: instance.mockLastModelSetToDom
            });
            return instance;
        }
    });
});

import { tick } from 'svelte';
import highlighterPluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../../session/testSessionUserDataService.js';
import { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import { testSessionStatus } from '../../../../session/sessionStates';
import preset from './testStoreMocks/presetOneSectionNonLinear.json';
import { fireEvent } from '@testing-library/svelte';

describe('highlighter plugin', () => {
    let container;
    let getContainer;
    let getToolsArea;
    let getContentArea;
    let testProviderApi;
    let statusStore;
    let testStateStore;
    let toolsStore;
    let mockedAreaBroker;
    let dataHolder;
    const serviceCallId = 'test-session-iuy';

    window.postMessage = vi.fn().mockImplementation(payload => {
        const event = new Event('message');
        event.data = payload;
        fireEvent(window, event);
    });

    vi.useFakeTimers();

    function createTestRunner() {
        return testRunnerFactory('foo', [highlighterPluginFactory], {
            renderTo: container,
            serviceCallId
        });
    }

    function addItemDataMock(runner, itemData) {
        // basic mock for itemData
        const mockItemData = {
            data: {
                body: {
                    body: ''
                }
            },
            assets: {}
        };
        runner.itemRunner = {
            getData() {
                return {
                    itemData: itemData || mockItemData
                };
            }
        };
    }

    function setupLayout() {
        const div = document.createElement('div');
        div.classList.add('fixture');
        div.innerHTML = `
            <div class="top-bar">
                <div class="floating-toolbars-wrapper">
                    <div class="floating-toolbars">
                        <div class="toolbar-highlighter" />
                    </div>
                </div>
            </div>
            <main id="test-main">
                <div class="qti-item-container">
                    <div class="qti-item"><span>A</span><span>B</span><span>C</span></div>
                </div>
            </main>
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
        expect(getToolsArea().querySelectorAll('.highlighter-bar').length).toBe(inDom ? 1 : 0);
    }

    beforeEach(() => {
        container = setupLayout();

        getContainer = () => container;
        getToolsArea = () => container.querySelector('.floating-toolbars-wrapper');
        getContentArea = () => container.querySelector('.qti-item-container');
        mockedAreaBroker = {
            getContainer,
            getToolsArea,
            getContentArea
        };
        dataHolder = getTestStateStore(serviceCallId);

        testProviderApi = {
            loadAreaBroker() {
                return mockedAreaBroker;
            },
            loadDataHolder() {
                return dataHolder;
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
        postMessage.mockClear();
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expectInDOM(false);
                    runner.destroy();
                })
                .on('destroy', () => {
                    expectInDOM(false);
                    done();
                })
                .init();
        }));

    it('hides top bar button and toolbar if x-tao-option-highlighter not present', () =>
        new Promise(done => {
            expect.assertions(5);

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item4');
                })
                .on('renderitem', () => {
                    addItemDataMock(runner);
                })
                .after('renderitem', () => {
                    expectInDOM(false);

                    const highlighterState = toolsStore.getTestToolState('highlighter');
                    expect(highlighterState).toBe(void 0);

                    runner.trigger('toolbaraction', 'highlighter');
                    tick()
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(getToolsArea()).toMatchSnapshot();

                            const highlighterState2 = toolsStore.getTestToolState('highlighter');
                            expect(highlighterState2).toEqual({ open: false, visible: false });

                            runner.destroy();
                        });
                })
                .on('destroy', () => {
                    tick()
                        .then(tick)
                        .then(() => {
                            expectInDOM(false);
                            done();
                        });
                })
                .init();
        }));

    it('opens highlighter toolbar when top bar button is clicked', () =>
        new Promise(done => {
            expect.assertions(5);

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item3');
                })
                .on('renderitem', () => {
                    addItemDataMock(runner);
                })
                .after('renderitem', () => {
                    expectInDOM(false);

                    tick()
                        .then(() => {
                            const highlighterState1 = toolsStore.getTestToolState('highlighter');
                            expect(highlighterState1).toEqual({ visible: true });

                            runner.trigger('toolbaraction', 'highlighter');
                        })
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            const highlighterState2 = toolsStore.getTestToolState('highlighter');
                            expect(highlighterState2).toEqual(expect.objectContaining({ open: true, visible: true }));
                            expect(getToolsArea()).toMatchSnapshot();
                            runner.destroy();
                        });
                })
                .on('destroy', () => {
                    tick()
                        .then(tick)
                        .then(() => {
                            expectInDOM(false);
                            done();
                        });
                })
                .init();
        }));

    test.each([
        ['closes on "highlighter-hide" event', { open: true }, { event: 'highlighter-hide' }, { open: false }],
        ['opens on "highlighter-show" event', { open: false }, { event: 'highlighter-show' }, { open: true }],
        [
            'restores on highlighter-restoreHighlights" event',
            { open: false },
            {
                event: 'highlighter-restoreHighlights',
                payload: [{ c: 'yellow', path2: [0, 5, -1] }],
                itemId: 'item4'
            },
            {
                open: false,
                highlightsByKey: {
                    item4: [{ c: 'yellow', path2: [0, 5, -1] }]
                }
            }
        ]
    ])(
        'external message listener: %s',
        (message, initialStoreState, evt, expectedStoreState) =>
            new Promise(done => {
                expect.assertions(2);

                toolsStore.setTestToolState('highlighter', initialStoreState);

                const runner = createTestRunner();
                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('ready', () => {
                        testStateStore.setTestContext({
                            ...testStateStore.getTestContext(),
                            itemIdentifier: 'item4',
                            itemPosition: 2
                        });
                        runner.loadItem('item4');
                    })
                    .on('renderitem', () => {
                        addItemDataMock(runner);
                    })
                    .after('renderitem', () => {
                        expect(toolsStore.getTestToolState('highlighter')).toEqual(initialStoreState);
                        window.postMessage(evt);

                        expect(toolsStore.getTestToolState('highlighter')).toEqual(expectedStoreState);
                        runner.destroy();
                    })
                    .on('destroy', () => {
                        done();
                    })
                    .init();
            })
    );

    it('with inlineComments plugin: waits for restore event, sends listener-toggled event', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item3');
                })
                .on('loaditem', () => {
                    runner.trigger('inlineComments-highlighter', { action: 'enabled' });
                })
                .on('renderitem', () => {
                    addItemDataMock(runner);
                })
                .after('renderitem', () => {
                    tick().then(() => {
                        const highlighterState1 = toolsStore.getTestToolState('highlighter');
                        expect(highlighterState1).toEqual(void 0);

                        runner.trigger('inlineComments-highlighter', {
                            action: 'comments-restored',
                            payload: { itemRef: 'item3' }
                        });
                    });
                })
                .after('inlineComments-highlighter', ({ action }) => {
                    if (action === 'comments-restored') {
                        tick().then(() => {
                            const highlighterState2 = toolsStore.getTestToolState('highlighter');
                            expect(highlighterState2).toEqual({ visible: true });

                            runner.trigger('toolbaraction', 'highlighter');

                            tick().then(() => {
                                getToolsArea().querySelector('.eraser-btn').click();
                            });
                        });
                    }
                })
                .on('highlighter-inlineComments', ({ action, payload }) => {
                    if (action === 'toggle-listener-mode') {
                        expect(payload).toEqual({ toggleOn: true });
                        runner.destroy();
                    }
                })
                .on('destroy', () => {
                    tick()
                        .then(tick)
                        .then(() => {
                            done();
                        });
                })
                .init();
        }));
});
