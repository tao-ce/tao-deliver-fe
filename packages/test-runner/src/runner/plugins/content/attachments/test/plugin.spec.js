// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { tick } from 'svelte';
import { fireEvent } from '@testing-library/svelte';
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

    async function persistAttachmentPageForNavigation(attachmentsPlugin, attachmentId, page) {
        const currentItemId = attachmentsPlugin.getCurrentItemId();
        attachmentsPlugin.state.byId[attachmentId] = {
            ...attachmentsPlugin.state.byId[attachmentId],
            page
        };
        attachmentsPlugin.saveState(currentItemId);
        attachmentsPlugin.destroyAttachment(false);
        await tick();
    }

    async function openAttachmentAndPersistPageForNavigation(attachmentsPlugin, attachmentId, page) {
        attachmentsPlugin.renderAttachment(attachmentId);

        await wait(1);
        await tick();
        await tick();

        await persistAttachmentPageForNavigation(attachmentsPlugin, attachmentId, page);
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
                }
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

    it('preserves selected attachment on same-item rerender when persisted item state is empty', () =>
        new Promise(done => {
            expect.assertions(4);

            const testContext = {
                ...preset.testContext,
                itemIdentifier: 'item3' // 2 attachments
            };
            const testMap = JSON.parse(JSON.stringify(preset.testMap));
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments[1] = {
                ...testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments[1],
                url: '//api/v1/attachment2.pdf',
                type: 'application/pdf'
            };

            testStateStore.setTestMap(testMap);
            testStateStore.setTestContext(testContext);

            const runner = createTestRunner();
            let renderCount = 0;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item3');
                })
                .on('unloaditem.rerender', () => {
                    runner.off('unloaditem.rerender');

                    toolsStore.setItemToolState('item3', 'attachments', {});
                    runner.loadItem('item3');
                })
                .after('renderitem', async () => {
                    renderCount += 1;

                    await tick();
                    await tick();

                    if (renderCount === 1) {
                        runner.trigger('toolbaraction', 'attachments');

                        await tick();
                        await tick();

                        const secondAttachmentButton = container.querySelector(
                            'button[aria-label="Open attachment Attachment 2"]'
                        );
                        expect(secondAttachmentButton).not.toBeNull();

                        await fireEvent.click(secondAttachmentButton);

                        await wait(1); // Attachment 'mount' event
                        await tick();
                        await tick();
                        expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 2');

                        runner.unloadItem('item3');
                        return;
                    }

                    expectAttachmentInDOM(true);
                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 2');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('restores the currently open PDF and its page across consecutive items in both directions', () =>
        new Promise(done => {
            expect.assertions(9);

            const testContext = {
                ...preset.testContext,
                itemIdentifier: 'item2'
            };
            const testMap = JSON.parse(JSON.stringify(preset.testMap));
            const sharedAttachments = [
                {
                    id: '1',
                    url: '//api/v1/item2-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                },
                {
                    id: '2',
                    url: '//api/v1/item2-attachment2.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                }
            ];

            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item2.attachments = sharedAttachments.map(
                attachment => ({
                    ...attachment
                })
            );
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments = [
                {
                    id: '1',
                    url: '//api/v1/item3-attachment1-refreshed.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                },
                {
                    id: '2',
                    url: '//api/v1/item3-attachment2-refreshed.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                }
            ];

            testStateStore.setTestMap(testMap);
            testStateStore.setTestContext(testContext);

            const runner = createTestRunner();
            let renderCount = 0;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    renderCount += 1;

                    await tick();
                    await tick();

                    const attachmentsPlugin = runner.getPlugin('attachments');

                    if (renderCount === 1) {
                        runner.trigger('toolbaraction', 'attachments');

                        await tick();
                        await tick();

                        const secondAttachmentButton = container.querySelector(
                            'button[aria-label="Open attachment Attachment 2"]'
                        );
                        expect(secondAttachmentButton).not.toBeNull();

                        await fireEvent.click(secondAttachmentButton);

                        await wait(1);
                        await tick();
                        await tick();

                        await persistAttachmentPageForNavigation(attachmentsPlugin, '2', 7);

                        runner.loadItem('item3');
                        return;
                    }

                    if (renderCount === 2) {
                        expectAttachmentInDOM(true);
                        expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 2');
                        expect(attachmentsPlugin.currentAttachment.id).toBe('2');
                        expect(attachmentsPlugin.currentAttachment.page).toBe(7);

                        await openAttachmentAndPersistPageForNavigation(attachmentsPlugin, '1', 3);

                        runner.loadItem('item2');
                        return;
                    }

                    expectAttachmentInDOM(true);
                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 1');
                    expect(attachmentsPlugin.currentAttachment.id).toBe('1');
                    expect(attachmentsPlugin.currentAttachment.page).toBe(3);

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('does not carry selected attachment across items when the attachment sets do not exactly match', () =>
        new Promise(done => {
            expect.assertions(4);

            const testMap = JSON.parse(JSON.stringify(preset.testMap));
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item2.attachments = [
                {
                    id: '1',
                    url: '//api/v1/item2-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                },
                {
                    id: '2',
                    url: '//api/v1/item2-attachment2.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                }
            ];
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments = [
                {
                    id: '1',
                    url: '//api/v1/item3-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                },
                {
                    id: '2',
                    url: '//api/v1/item3-attachment2.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                },
                {
                    id: '3',
                    url: '//api/v1/item3-attachment3.pdf',
                    name: 'Attachment 3',
                    type: 'application/pdf'
                }
            ];

            testStateStore.setTestMap(testMap);
            testStateStore.setTestContext({
                ...preset.testContext,
                itemIdentifier: 'item2'
            });

            const runner = createTestRunner();
            let renderCount = 0;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    renderCount += 1;

                    await tick();
                    await tick();

                    const attachmentsPlugin = runner.getPlugin('attachments');

                    if (renderCount === 1) {
                        runner.trigger('toolbaraction', 'attachments');

                        await tick();
                        await tick();

                        const secondAttachmentButton = container.querySelector(
                            'button[aria-label="Open attachment Attachment 2"]'
                        );
                        expect(secondAttachmentButton).not.toBeNull();

                        await fireEvent.click(secondAttachmentButton);

                        await wait(1);
                        await tick();
                        await tick();

                        await persistAttachmentPageForNavigation(attachmentsPlugin, '2', 7);

                        runner.loadItem('item3');
                        return;
                    }

                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 1');
                    expect(attachmentsPlugin.currentAttachment.id).toBe('1');
                    expect(attachmentsPlugin.currentAttachment.page).toBe(1);

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('keeps PDF page state in sync for the same attachment id even when attachment sets do not exactly match', () =>
        new Promise(done => {
            expect.assertions(3);

            const testMap = JSON.parse(JSON.stringify(preset.testMap));
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item2.attachments = [
                {
                    id: '1',
                    url: '//api/v1/item2-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                },
                {
                    id: '2',
                    url: '//api/v1/item2-attachment2.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                }
            ];
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments = [
                {
                    id: '1',
                    url: '//api/v1/item3-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                }
            ];

            testStateStore.setTestMap(testMap);
            testStateStore.setTestContext({
                ...preset.testContext,
                itemIdentifier: 'item2'
            });

            const runner = createTestRunner();
            let renderCount = 0;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    renderCount += 1;

                    await tick();
                    await tick();

                    const attachmentsPlugin = runner.getPlugin('attachments');

                    if (renderCount === 1) {
                        await openAttachmentAndPersistPageForNavigation(attachmentsPlugin, '1', 7);

                        runner.loadItem('item3');
                        return;
                    }

                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 1');
                    expect(attachmentsPlugin.currentAttachment.id).toBe('1');
                    expect(attachmentsPlugin.currentAttachment.page).toBe(7);

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('carries selected attachment across items when the attachments are the same in a different order', () =>
        new Promise(done => {
            expect.assertions(4);

            const testMap = JSON.parse(JSON.stringify(preset.testMap));
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item2.attachments = [
                {
                    id: '1',
                    url: '//api/v1/item2-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                },
                {
                    id: '2',
                    url: '//api/v1/item2-attachment2.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                }
            ];
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments = [
                {
                    id: '2',
                    url: '//api/v1/item3-attachment2.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                },
                {
                    id: '1',
                    url: '//api/v1/item3-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                }
            ];

            testStateStore.setTestMap(testMap);
            testStateStore.setTestContext({
                ...preset.testContext,
                itemIdentifier: 'item2'
            });

            const runner = createTestRunner();
            let renderCount = 0;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    renderCount += 1;

                    await tick();
                    await tick();

                    const attachmentsPlugin = runner.getPlugin('attachments');

                    if (renderCount === 1) {
                        await openAttachmentAndPersistPageForNavigation(attachmentsPlugin, '1', 5);

                        runner.loadItem('item3');
                        return;
                    }

                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 1');
                    expect(attachmentsPlugin.currentAttachment.id).toBe('1');
                    expect(attachmentsPlugin.currentAttachment.page).toBe(5);
                    expect(attachmentsPlugin.getAttachmentSignature(testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item2.attachments)).toBe(
                        attachmentsPlugin.getAttachmentSignature(testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments)
                    );

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('keeps stored selection when persisted signature only differs by attachment order', () =>
        new Promise(done => {
            expect.assertions(3);

            const testMap = JSON.parse(JSON.stringify(preset.testMap));
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments = [
                {
                    id: '1',
                    url: '//api/v1/item3-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                },
                {
                    id: '2',
                    url: '//api/v1/item3-attachment2.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                }
            ];

            testStateStore.setTestMap(testMap);
            testStateStore.setTestContext({
                ...preset.testContext,
                itemIdentifier: 'item3'
            });

            toolsStore.setTestToolState('attachments', {
                visible: true,
                open: true,
                ui: {
                    areaName: 'asideEnd',
                    toolbarOpen: false,
                    attachmentRendered: true
                }
            });
            toolsStore.setItemToolState('item3', 'attachments', {
                attachmentSignature: JSON.stringify(['2', '1']),
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

                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 2');
                    expect(runner.getPlugin('attachments').currentAttachment.id).toBe('2');
                    expect(toolsStore.getItemToolState('item3', 'attachments')).toEqual(
                        expect.objectContaining({ attachmentSignature: JSON.stringify(['1', '2']) })
                    );

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('restores the original item selection when returning through an item with a different attachment set', () =>
        new Promise(done => {
            expect.assertions(5);

            const testMap = JSON.parse(JSON.stringify(preset.testMap));
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item2.attachments = [
                {
                    id: '1',
                    url: '//api/v1/item2-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                },
                {
                    id: '2',
                    url: '//api/v1/item2-attachment2.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                }
            ];
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments = [
                {
                    id: '1',
                    url: '//api/v1/item3-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                }
            ];

            testStateStore.setTestMap(testMap);
            testStateStore.setTestContext({
                ...preset.testContext,
                itemIdentifier: 'item2'
            });

            const runner = createTestRunner();
            let renderCount = 0;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    renderCount += 1;

                    await tick();
                    await tick();

                    const attachmentsPlugin = runner.getPlugin('attachments');

                    if (renderCount === 1) {
                        runner.trigger('toolbaraction', 'attachments');

                        await tick();
                        await tick();

                        const secondAttachmentButton = container.querySelector(
                            'button[aria-label="Open attachment Attachment 2"]'
                        );
                        expect(secondAttachmentButton).not.toBeNull();

                        await fireEvent.click(secondAttachmentButton);

                        await wait(1);
                        await tick();
                        await tick();

                        runner.loadItem('item3');
                        return;
                    }

                    if (renderCount === 2) {
                        expect(attachmentsPlugin.currentAttachment.id).toBe('1');
                        runner.loadItem('item2');
                        return;
                    }

                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 2');
                    expect(attachmentsPlugin.currentAttachment.id).toBe('2');
                    expect(toolsStore.getItemToolState('item2', 'attachments')).toEqual(
                        expect.objectContaining({ selectedAttachmentId: '2' })
                    );

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('persists the restored attachment selection for the destination item when current item id is temporarily unavailable', () =>
        new Promise(done => {
            expect.assertions(4);

            const sharedAttachments = [
                {
                    id: '1',
                    url: '//api/v1/item2-attachment1.pdf',
                    name: 'Attachment 1',
                    type: 'application/pdf'
                },
                {
                    id: '2',
                    url: '//api/v1/item2-attachment2.pdf',
                    name: 'Attachment 2',
                    type: 'application/pdf'
                }
            ];
            const testMap = JSON.parse(JSON.stringify(preset.testMap));

            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item2.attachments = sharedAttachments.map(
                attachment => ({
                    ...attachment
                })
            );
            testMap.parts['testPart-1'].sections['assessmentSection-1'].items.item3.attachments = sharedAttachments.map(
                attachment => ({
                    ...attachment
                })
            );

            testStateStore.setTestMap(testMap);
            testStateStore.setTestContext({
                ...preset.testContext,
                itemIdentifier: 'item2'
            });

            const runner = createTestRunner();
            let renderCount = 0;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    renderCount += 1;

                    await tick();
                    await tick();

                    const attachmentsPlugin = runner.getPlugin('attachments');

                    if (renderCount === 1) {
                        await openAttachmentAndPersistPageForNavigation(attachmentsPlugin, '2', 7);

                        testStateStore.setTestContext({
                            ...preset.testContext,
                            itemIdentifier: 'item3'
                        });

                        const originalGetCurrentItemIdentifier = runner.getCurrentItemIdentifier;
                        runner.getCurrentItemIdentifier = () => undefined;
                        runner.trigger('renderitem', 'item3');
                        runner.getCurrentItemIdentifier = originalGetCurrentItemIdentifier;
                        return;
                    }

                    expect(attachmentsPlugin.currentAttachment.id).toBe('2');
                    expect(toolsStore.getItemToolState('item3', 'attachments')).toEqual(
                        expect.objectContaining({ selectedAttachmentId: '2' })
                    );

                    attachmentsPlugin.destroyAttachment();
                    attachmentsPlugin.saveState('item3');

                    runner.trigger('toolbaraction', 'attachments');

                    await wait(1);
                    await tick();
                    await tick();

                    expect(container.querySelector('.attachment-box h3')).toHaveTextContent('Attachment 2');
                    expect(attachmentsPlugin.currentAttachment.id).toBe('2');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('persists item attachment state on unload using the event item id when current item resolution is unavailable', () =>
        new Promise(done => {
            expect.assertions(1);

            const testContext = {
                ...preset.testContext,
                itemIdentifier: 'item3'
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

                    const attachmentsPlugin = runner.getPlugin('attachments');
                    attachmentsPlugin.getItemState('item3', attachmentsPlugin.getItemAttachments('item3')).selectedAttachmentId =
                        '2';
                    attachmentsPlugin.state.activeItemContext = null;

                    const originalGetCurrentItemIdentifier = runner.getCurrentItemIdentifier;
                    runner.getCurrentItemIdentifier = () => undefined;
                    runner.trigger('unloaditem', 'item3');
                    runner.getCurrentItemIdentifier = originalGetCurrentItemIdentifier;

                    expect(toolsStore.getItemToolState('item3', 'attachments')).toEqual(
                        expect.objectContaining({ selectedAttachmentId: '2' })
                    );

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
