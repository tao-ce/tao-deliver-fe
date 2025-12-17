// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
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
import { testSessionStatus } from '../../../../session/sessionStates';
import preset from './presetItemAttachments.json';
import { wait } from '../../../../util/common.js';

describe('Attachments plugin', () => {
    let container;
    let getContainer;
    let getTopBarArea;
    let getToolsArea;
    let getAsideEndArea;
    let testProviderApi;
    let statusStore;
    let testStateStore;
    let toolsStore;
    let mockedAreaBroker;
    let dataHolder;
    const serviceCallId = 'test-session-iuy';

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
            <div class="top-bar">
                <div class="floating-toolbars-wrapper">
                    <div class="floating-toolbars">
                        <div class="toolbar-attachments" />
                    </div>
                </div>
            </div>
            <main id="test-main"></main>
            <aside id="test-content-aside-end"></aside>
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

    function expectToolbarInDOM(inDom) {
        expect(getToolsArea().querySelectorAll('.attachments-bar').length).toBe(inDom ? 1 : 0);
    }

    function expectAttachmentInDOM(inDom) {
        expect(getAsideEndArea().querySelectorAll('.attachment-box').length).toBe(inDom ? 1 : 0);
    }

    beforeEach(() => {
        container = setupLayout();

        getContainer = () => container;
        getTopBarArea = () => container.querySelector('.top-bar');
        getToolsArea = () => container.querySelector('.floating-toolbars-wrapper');
        getAsideEndArea = () => container.querySelector('#test-content-aside-end');
        mockedAreaBroker = {
            getContainer,
            getTopBarArea,
            getToolsArea,
            getAsideEndArea,
            getArea: getAsideEndArea
        };
        dataHolder = getTestStateStore(serviceCallId);

        testProviderApi = {
            loadAreaBroker() {
                return mockedAreaBroker;
            },
            loadDataHolder() {
                return dataHolder;
            },
            install() {
                this.getAssetManager = () => ({ resolve: vi.fn() });
                this.getCurrentItemIdentifier = () => this.getTestContext().itemIdentifier;
            },
            init() {}
        };

        testRunnerFactory.registerProvider('foo', testProviderApi);

        let presetData = Object.assign({}, preset);
        testStateStore = getTestStateStore(serviceCallId);
        testStateStore.setTestMap(presetData.testMap); // 3 items
        testStateStore.setTestContext(presetData.testContext); // item1: 0 attachments

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
                .on('render', () => {
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);
                    runner.destroy();
                })
                .on('destroy', () => {
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);
                    done();
                })
                .init();
        }));

    it('hides top bar button if no attachments present', () =>
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
                .after('renderitem', () => {
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    const toolState = toolsStore.getTestToolState('attachments');
                    expect(toolState).toMatchObject({ visible: false });
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('renders and destroys first Attachment when toolbar button is clicked, if single attachment', () =>
        new Promise(done => {
            expect.assertions(13);

            const testContext = {
                ...preset.testContext,
                itemIdentifier: 'item2' // 1 attachment
            };
            testStateStore.setTestContext(testContext);

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    await tick();
                    await tick();
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    const toolState1 = toolsStore.getTestToolState('attachments');
                    expect(toolState1.visible).toBeTruthy();
                    expect(toolState1.open).toBeFalsy();

                    runner.trigger('toolbaraction', 'attachments');

                    await wait(1); // Attachment 'mount' event
                    await tick();
                    await tick();
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(true);

                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 1');

                    const toolState2 = toolsStore.getTestToolState('attachments');
                    expect(toolState2).toEqual(expect.objectContaining({ open: true, visible: true }));

                    runner.trigger('toolbaraction', 'attachments');

                    await tick();
                    await tick();
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    const toolState3 = toolsStore.getTestToolState('attachments');
                    expect(toolState3).toEqual(expect.objectContaining({ open: false, visible: true }));

                    runner.destroy();
                })
                .on('destroy', () => {
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    done();
                })
                .init();
        }));

    it('renders and destroys AttachmentsOverlayBox when toolbar button is clicked, if multiple attachments', () =>
        new Promise(done => {
            expect.assertions(12);

            const testContext = {
                ...preset.testContext,
                itemIdentifier: 'item3' // 2 attachments
            };
            testStateStore.setTestContext(testContext);

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item3');
                })
                .after('renderitem', async () => {
                    await tick();
                    await tick();
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    const toolState1 = toolsStore.getTestToolState('attachments');
                    expect(toolState1.visible).toBeTruthy();
                    expect(toolState1.open).toBeFalsy();

                    runner.trigger('toolbaraction', 'attachments');

                    await tick();
                    await tick();
                    expectToolbarInDOM(true);
                    expectAttachmentInDOM(false);

                    const toolState2 = toolsStore.getTestToolState('attachments');
                    expect(toolState2).toEqual(expect.objectContaining({ open: true, visible: true }));

                    runner.trigger('toolbaraction', 'attachments');

                    await tick();
                    await tick();
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    const toolState3 = toolsStore.getTestToolState('attachments');
                    expect(toolState3).toEqual(expect.objectContaining({ open: false, visible: true }));

                    runner.destroy();
                })
                .on('destroy', () => {
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    done();
                })
                .init();
        }));

    it('renders and destroys previous Attachments when toolbar button is clicked, if multiple attachments and one was opened', () =>
        new Promise(done => {
            expect.assertions(13);

            const testContext = {
                ...preset.testContext,
                itemIdentifier: 'item3' // 2 attachments
            };
            testStateStore.setTestContext(testContext);

            toolsStore.setItemToolState('item3', 'attachments', {
                selectedAttachmentId: '2'
            });

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item3');
                })
                .after('renderitem', async () => {
                    await tick();
                    await tick();
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    const toolState1 = toolsStore.getTestToolState('attachments');
                    expect(toolState1.visible).toBeTruthy();
                    expect(toolState1.open).toBeFalsy();

                    runner.trigger('toolbaraction', 'attachments');

                    await wait(1); // Attachment 'mount' event
                    await tick();
                    await tick();
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(true);

                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 2');

                    const toolState2 = toolsStore.getTestToolState('attachments');
                    expect(toolState2).toEqual(expect.objectContaining({ open: true, visible: true }));

                    runner.trigger('toolbaraction', 'attachments');

                    await tick();
                    await tick();
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    const toolState3 = toolsStore.getTestToolState('attachments');
                    expect(toolState3).toEqual(expect.objectContaining({ open: false, visible: true }));

                    runner.destroy();
                })
                .on('destroy', () => {
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(false);

                    done();
                })
                .init();
        }));

    it('restores last UI state and selectedAttachmentId on item load', () =>
        new Promise(done => {
            expect.assertions(3);

            const testContext = {
                ...preset.testContext,
                itemIdentifier: 'item3' // 2 attachments
            };
            testStateStore.setTestContext(testContext);

            toolsStore.setTestToolState('attachments', {
                visible: true,
                open: true,
                ui: {
                    areaName: 'asideEnd',
                    toolbarOpen: false,
                    attachmentRendered: true
                },
                byId: {} // can't really test page/zoom/scroll properties
            });
            toolsStore.setItemToolState('item3', 'attachments', {
                selectedAttachmentId: '2'
            });

            const runner = createTestRunner();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item3');
                })
                .after('renderitem', async () => {
                    await tick();
                    await tick();
                    expectToolbarInDOM(false);
                    expectAttachmentInDOM(true);

                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 2');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
