// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { vi } from 'vitest';
import markingSymbolsPluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import { clearAllTestSessionsUserData } from '../../../../session/testSessionUserDataService.js';
import { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import { testSessionStatus } from '../../../../session/sessionStates';
import preset from '../../highlighter/test/testStoreMocks/presetOneSectionNonLinear.json';

vi.setConfig({ testTimeout: 15000 });

function setupLayout() {
    const div = document.createElement('div');
    div.classList.add('fixture');
    div.innerHTML = `
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

function dispatchMessage(data) {
    const event = new Event('message');
    event.data = data;
    window.dispatchEvent(event);
}

describe('markingSymbols plugin', () => {
    let container;
    let getContainer;
    let getMainArea;
    let getContentArea;
    let testProviderApi;
    let statusStore;
    let testStateStore;
    let mockedAreaBroker;
    let dataHolder;
    let parentPostMessageSpy;
    let saveScoringAnnotationCommentSpy;
    const serviceCallId = 'test-session-iuy';

    function createTestRunner() {
        const runnerInstance = testRunnerFactory('foo', [markingSymbolsPluginFactory], {
            renderTo: container,
            serviceCallId
        });
        const proxy = runnerInstance.getProxy && runnerInstance.getProxy();
        if (proxy) {
            proxy.saveScoringAnnotationComment = saveScoringAnnotationCommentSpy;
        }
        return runnerInstance;
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

    function expectInDOM(inDom) {
        expect(getMainArea().querySelectorAll('.marking-symbols-bar').length).toBe(inDom ? 1 : 0);
    }

    beforeEach(() => {
        container = setupLayout();

        parentPostMessageSpy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
        saveScoringAnnotationCommentSpy = vi.fn().mockResolvedValue({});

        getContainer = () => container;
        getMainArea = () => container.querySelector('#test-main');
        getContentArea = () => container.querySelector('.qti-item-container');
        mockedAreaBroker = {
            getContainer,
            getMainArea,
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
            loadProxy() {
                return proxyFactory('foo', {});
            },
            init() {}
        };

        proxyFactory.registerProvider('foo', {
            init: () => {},
            saveScoringAnnotationComment: (...args) => saveScoringAnnotationCommentSpy(...args)
        });

        testRunnerFactory.registerProvider('foo', testProviderApi);

        let presetData = Object.assign({}, preset);
        testStateStore = getTestStateStore(serviceCallId);
        testStateStore.setTestMap(presetData.testMap);
        testStateStore.setTestContext(presetData.testContext);

        statusStore = getTestSessionStatusStore(serviceCallId);
        statusStore.set(testSessionStatus.interacting);
    });

    afterEach(() => {
        parentPostMessageSpy.mockRestore();
        testRunnerFactory.clearProviders();
        if (typeof proxyFactory.clearProviders === 'function') {
            proxyFactory.clearProviders();
        }
        removeLayout();
        clearAllTestSessionsUserData();
        statusStore.clear();
    });

    it('opens and closes via postMessage events', () =>
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
                .on('renderitem', () => {
                    addItemDataMock(runner);
                })
                .after('renderitem', async () => {
                    expectInDOM(false);

                    dispatchMessage({ event: 'markingSymbols-show' });

                    await tick();
                    expectInDOM(true);
                    dispatchMessage({ event: 'markingSymbols-hide' });

                    await tick();
                    expectInDOM(false);
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('loads default symbols when no config is provided', () =>
        new Promise(done => {
            expect.assertions(2);

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
                    dispatchMessage({ event: 'markingSymbols-show' });

                    tick().then(() => {
                        const buttons = getMainArea().querySelectorAll('.marking-symbols-bar .symbol-btn');
                        expect(buttons.length).toBe(2);
                        expect(getMainArea().textContent).toContain('Content mistake');
                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('applies config to toolbar', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = createTestRunner();
            const marks = [
                {
                    items: [
                        { label: 'First', color: '#ff0000', shapeId: 'circle' },
                        { label: 'Second', color: '#00ff00', shapeId: 'star' }
                    ]
                }
            ];

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
                    dispatchMessage({
                        event: 'markingSymbols-config',
                        payload: { marks }
                    });
                    dispatchMessage({ event: 'markingSymbols-show' });

                    tick().then(() => {
                        const buttons = getMainArea().querySelectorAll('.marking-symbols-bar .symbol-btn');
                        expect(buttons.length).toBe(2);
                        expect(getMainArea().textContent).toContain('First');
                        expect(getMainArea().textContent).toContain('Second');
                        runner.destroy();
                    });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('groups markers sharing the same offset', () =>
        new Promise((resolve, reject) => {
            expect.assertions(3);

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    runner.destroy();
                    reject(err);
                })
                .on('ready', () => {
                    runner.loadItem('item3');
                })
                .on('renderitem', () => {
                    addItemDataMock(runner);
                })
                .after('renderitem', () => {
                    const pluginApi = runner.getPlugin && runner.getPlugin('markingSymbols');
                    const itemId = runner.getTestContext().itemIdentifier;
                    const [firstSymbol, secondSymbol] = pluginApi.symbols;
                    const markers = [
                        { symbolId: firstSymbol.id, icon: firstSymbol.icon, color: firstSymbol.color, offset: 0 },
                        { symbolId: secondSymbol.id, icon: secondSymbol.icon, color: secondSymbol.color, offset: 0 }
                    ];
                    pluginApi.setMarkersForItem(itemId, markers);
                    pluginApi.restoreItemMarkers();

                    tick()
                        .then(tick)
                        .then(() => {
                            const groups = getMainArea().querySelectorAll('.marking-symbols-group');
                            const renderedMarkers = getMainArea().querySelectorAll('.marking-symbol-marker');
                            expect(groups.length).toBe(1);
                            expect(renderedMarkers.length).toBe(2);
                            expect(renderedMarkers[0].parentElement).toBe(groups[0]);
                            runner.destroy();
                        });
                })
                .on('destroy', () => resolve())
                .init();
        }));

    it('adds marker to existing group when clicking marker group', async () => {
        expect.assertions(3);

        const runner = createTestRunner();
        try {
            await new Promise((resolve, reject) => {
                runner
                    .on('error', err => {
                        reject(err);
                    })
                    .on('ready', () => runner.loadItem('item3'))
                    .on('renderitem', () => {
                        addItemDataMock(runner);
                    })
                    .after('renderitem', () => resolve())
                    .init();
            });

            const pluginApi = runner.getPlugin && runner.getPlugin('markingSymbols');
            pluginApi.isReadOnly = false;
            const [firstSymbol, secondSymbol] = pluginApi.symbols;
            const target = getMainArea().querySelector('.qti-item span');

            pluginApi.setOpenState(true);
            pluginApi.activeSymbolId = firstSymbol.id;
            pluginApi.handleItemClick({
                button: 0,
                target,
                clientX: 0,
                clientY: 0,
                preventDefault() {}
            });

            await tick();
            pluginApi.activeSymbolId = secondSymbol.id;
            const group = getMainArea().querySelector('.marking-symbols-group');
            pluginApi.handleItemClick({
                button: 0,
                target: group,
                clientX: 0,
                clientY: 0,
                preventDefault() {}
            });

            await tick();
            const markers = pluginApi.getCurrentMarkers();
            const groups = getMainArea().querySelectorAll('.marking-symbols-group');
            const renderedMarkers = getMainArea().querySelectorAll('.marking-symbol-marker');
            expect(markers.length).toBe(2);
            expect(groups.length).toBe(1);
            expect(renderedMarkers.length).toBe(2);
        } finally {
            runner.destroy();
        }
    });

    it('toggles active symbol when clicking the same toolbar button', () =>
        new Promise((resolve, reject) => {
            expect.assertions(2);

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    runner.destroy();
                    reject(err);
                })
                .on('ready', () => {
                    runner.loadItem('item3');
                })
                .on('renderitem', () => {
                    addItemDataMock(runner);
                })
                .after('renderitem', () => {
                    const pluginApi = runner.getPlugin && runner.getPlugin('markingSymbols');
                    pluginApi.isReadOnly = false;
                    const [firstSymbol] = pluginApi.symbols;
                    pluginApi.setOpenState(true);
                    pluginApi.activeSymbolId = null;
                    pluginApi.syncToolbarProps();

                    pluginApi.renderToolbar();
                    const symbolBtn = document.querySelector('.symbol-btn');

                    symbolBtn.click();
                    const afterFirst = pluginApi.activeSymbolId;
                    expect(afterFirst).toBe(firstSymbol.id);

                    symbolBtn.click();
                    const afterSecond = pluginApi.activeSymbolId;
                    expect(afterSecond).toBeNull();

                    runner.destroy();
                })
                .on('destroy', () => resolve())
                .init();
        }));

    it('posts deliverData on marker updates', async () => {
        expect.assertions(6);

        const runner = createTestRunner();
        const marks = [
            {
                items: [{ label: 'First', color: '#ff0000', shapeId: 'circle' }]
            }
        ];
        const expectedMarker = {
            symbolId: 'first',
            icon: 'marker-circle-12',
            color: '#ff0000',
            offset: 0
        };
        const originalCaretRange = document.caretRangeFromPoint;
        const originalCaretPosition = document.caretPositionFromPoint;

        try {
            await new Promise((resolve, reject) => {
                runner
                    .on('error', err => reject(err))
                    .on('ready', () => runner.loadItem('item3'))
                    .on('renderitem', () => {
                        addItemDataMock(runner);
                    })
                    .after('renderitem', () => resolve())
                    .init();
            });

            dispatchMessage({
                event: 'markingSymbols-config',
                payload: { marks }
            });
            dispatchMessage({ event: 'markingSymbols-show' });

            await tick();
            const pluginApi = runner.getPlugin && runner.getPlugin('markingSymbols');
            pluginApi.isReadOnly = false;
            if (!document.caretRangeFromPoint && !document.caretPositionFromPoint) {
                document.caretRangeFromPoint = () => {
                    const range = document.createRange();
                    const textNode = getMainArea().querySelector('.qti-item span').firstChild;
                    range.setStart(textNode, 0);
                    range.collapse(true);
                    return range;
                };
            }

            const button = getMainArea().querySelector('.marking-symbols-bar .symbol-btn');
            button.click();

            const target = getMainArea().querySelector('.qti-item span');
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 1, clientY: 1 }));

            await tick();

            expect(parentPostMessageSpy).toHaveBeenCalledWith(
                { event: 'markingSymbols-deliverData', payload: [expectedMarker] },
                '*'
            );
            expect(saveScoringAnnotationCommentSpy).toHaveBeenCalledTimes(1);
            const [savedItemId, savedPayload] = saveScoringAnnotationCommentSpy.mock.calls[0];
            expect(savedItemId).toBe(runner.getTestContext().itemIdentifier);
            expect(savedPayload).toEqual({ markingSymbols: [expectedMarker] });
            const contentSpan = getMainArea().querySelector('.qti-item span');
            expect(contentSpan.querySelector('.marking-symbol-marker')).toBeNull();
            expect(getMainArea().querySelectorAll('.marking-symbol-marker').length).toBe(1);
        } finally {
            if (originalCaretRange) {
                document.caretRangeFromPoint = originalCaretRange;
            } else {
                delete document.caretRangeFromPoint;
            }
            if (originalCaretPosition) {
                document.caretPositionFromPoint = originalCaretPosition;
            } else {
                delete document.caretPositionFromPoint;
            }
            runner.destroy();
        }
    });

    it('restores markers from annotations data', () =>
        new Promise((resolve, reject) => {
            expect.assertions(4);

            const markersFromBackend = [{ symbolId: 'first', icon: 'marker-circle-12', color: '#ff0000', offset: 1 }];
            const runner = createTestRunner();

            runner
                .on('error', err => {
                    runner.destroy();
                    reject(err);
                })
                .on('ready', () => {
                    runner.loadItem('item3');
                })
                .on('loaditem', (itemRef, itemData) => {
                    const payload = itemData || {};
                    payload.extraData = {
                        scoring: {
                            comments: {
                                annotations: { markingSymbols: markersFromBackend }
                            }
                        }
                    };
                    addItemDataMock(runner, payload);
                })
                .after('renderitem', () => {
                    tick()
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            try {
                                const pluginApi = runner.getPlugin && runner.getPlugin('markingSymbols');
                                expect(pluginApi).toBeTruthy();
                                const itemId = runner.getTestContext().itemIdentifier;
                                pluginApi.setMarkersForItem(itemId, markersFromBackend);
                                pluginApi.restoreItemMarkers();
                                expect(pluginApi.getCurrentMarkers().length).toBe(1);
                                const markers = getMainArea().querySelectorAll('.marking-symbol-marker');
                                expect(markers.length).toBe(1);
                                expect(markers[0].getAttribute('data-symbol-id')).toBe('first');
                                runner.destroy();
                            } catch (err) {
                                runner.destroy();
                                reject(err);
                            }
                        });
                })
                .on('destroy', () => {
                    resolve();
                })
                .init();
        }));
});
