// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

import { tick } from 'svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import testsStateStore, { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import { clearAllTestSessionsUserData } from '../../../../session/testSessionUserDataService.js';
import { testSessionStatus } from '../../../../session/sessionStates.js';
import { fireEvent } from '@testing-library/svelte';
import { generateElementId } from '@oat-sa-private/ui-core';

const serviceCallId = 'test-session-plswrk';

const itemDataWithComments = {
    extraData: {
        scoring: {
            comments: {
                inline: {
                    responses: {
                        respA: {
                            highlights: [
                                {
                                    groupId: '1',
                                    c: '1234',
                                    offsetBefore: 0,
                                    textLength: 'Lorem'.length,
                                    beforeWasSplit: 'true',
                                    afterWasSplit: 'true',
                                    path2: [0, -1]
                                },
                                {
                                    groupId: '2',
                                    c: '5678',
                                    offsetBefore: 'Lorem '.length,
                                    textLength: 'ipsum'.length,
                                    beforeWasSplit: 'true',
                                    afterWasSplit: 'true',
                                    path2: [0, -1]
                                }
                            ],
                            comments: {
                                1234: 'summer winter',
                                5678: 'spring autumn'
                            }
                        }
                    }
                }
            }
        }
    }
};

function setupLayout() {
    const root = document.createElement('div');
    root.innerHTML = `
    <div class="qti-item-container">
        <div class="qti-item">
            <div class="qti-extendedTextInteraction" data-response-id="respA">
                <div class="text-container"><p>Lorem ipsum dolor amet</p></div>
            </div>
        </div>
    </div>`;
    document.body.append(root);
    return root;
}

const viewModeConfig = { mode: ['read'] };
const editModeConfig = { mode: ['read', 'write'] };
function getCommentElements() {
    return [...document.body.querySelectorAll('.tao-comment-txt')];
}
function getHighlightContainer() {
    return document.body.querySelector('.text-container');
}
function getCommentViewer() {
    return document.body.querySelector('.comment-viewer');
}
function getCommentButton() {
    return document.body.querySelector('.comment-highlight-button-flyout button');
}
function getCommentEditor() {
    return document.body.querySelector('.comment-editor');
}
function selectText(childIdx, startOffset, endOffset) {
    const pEl = document.body.querySelector('p');
    const range = document.createRange();
    range.setStart(pEl.childNodes[childIdx], startOffset);
    range.setEnd(pEl.childNodes[childIdx], endOffset);
    window.getSelection().addRange(range);
    fireEvent(
        document,
        new Event('selectionchange', {
            bubbles: false,
            cancelable: false
        })
    );
    fireEvent.mouseUp(getHighlightContainer());
}
function discardSelection() {
    window.getSelection().removeAllRanges();
    fireEvent(
        document,
        new Event('selectionchange', {
            bubbles: false,
            cancelable: false
        })
    );
}

describe('inlineComments plugin', () => {
    let container;
    let testProviderApi;
    let runner;
    let statusStore;
    let getPluginConfigSpy;
    let loadItemSpy;
    let saveScoringInlineCommentsSpy;

    beforeAll(() => {
        //jsdom doesn't implement this? For blacklist of selectionListener
        vi.spyOn(window.getSelection(), 'containsNode').mockReturnValue(false);
    });

    beforeEach(() => {
        container = setupLayout();
        const getContainer = () => container;
        const getContentArea = () => container.querySelector('.qti-item-container');
        loadItemSpy = vi.fn();
        saveScoringInlineCommentsSpy = vi.fn();

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
            },
            loadItem() {
                return loadItemSpy();
            }
        };
        proxyFactory.registerProvider('foo', {
            init: () => {}
        });
        testRunnerFactory.registerProvider('foo', testProviderApi);
        statusStore = getTestSessionStatusStore(serviceCallId);
        getPluginConfigSpy = vi.fn().mockImplementation(() => void 0);

        runner = testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        }).on('error', err => {
            runner.destroy();
            throw err;
        });
        runner.getPluginConfig = getPluginConfigSpy;
        runner.getResponseDisplay = vi.fn(() => 'answer');
        runner.getProxy().saveScoringInlineComments = saveScoringInlineCommentsSpy;
    });

    afterEach(() => {
        testsStateStore.clear();
        testRunnerFactory.clearProviders();
        clearAllTestSessionsUserData();
        document.body.innerHTML = '';
        discardSelection();
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            statusStore.set(testSessionStatus.interacting);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    try {
                        await tick();
                        expect(container).toMatchSnapshot();
                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('view mode: shows comments, can click on comment to read it', () =>
        new Promise(done => {
            statusStore.set(testSessionStatus.interacting);
            getPluginConfigSpy.mockReturnValue(viewModeConfig);
            loadItemSpy.mockReturnValue(itemDataWithComments);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    try {
                        await tick();
                        const commentElements = getCommentElements();
                        expect(commentElements.length).toBe(2);
                        expect(getCommentViewer()).toBeFalsy();

                        commentElements[0].click();
                        await tick();
                        expect(getCommentViewer()).toBeTruthy();
                        expect(getCommentViewer().textContent).toContain('summer winter');

                        commentElements[1].click();
                        await tick();
                        expect(getCommentViewer()).toBeTruthy();
                        expect(getCommentViewer().textContent).toContain('spring autumn');
                        expect(container).toMatchSnapshot();

                        commentElements[1].click(); //close
                        await tick();
                        expect(getCommentViewer()).toBeFalsy();

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('edit mode: shows comments, can click on comment to read it', () =>
        new Promise(done => {
            statusStore.set(testSessionStatus.interacting);
            getPluginConfigSpy.mockReturnValue(editModeConfig);
            loadItemSpy.mockReturnValue(itemDataWithComments);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    try {
                        await tick();
                        const commentElements = getCommentElements();
                        expect(commentElements.length).toBe(2);
                        expect(getCommentEditor()).toBeFalsy();
                        expect(container).toMatchSnapshot();

                        //view
                        commentElements[0].click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        expect(getCommentEditor().querySelector('textarea').value).toBe('summer winter');

                        //view another
                        commentElements[1].click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        expect(getCommentEditor().querySelector('textarea').value).toContain('spring autumn');

                        //close
                        getCommentEditor().querySelector('[name="cancel-comment"]').click();
                        await tick();
                        expect(getCommentEditor()).toBeFalsy();

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('edit mode: create/edit/delete comment', () =>
        new Promise(done => {
            statusStore.set(testSessionStatus.interacting);
            getPluginConfigSpy.mockReturnValue(editModeConfig);

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .after('renderitem', async () => {
                    try {
                        await tick();

                        //select
                        selectText(0, 0, 'Lorem'.length);
                        await tick();
                        expect(getCommentButton()).toBeTruthy();
                        expect(container).toMatchSnapshot();

                        //click to create
                        generateElementId.mockReturnValueOnce('cmt-A');
                        getCommentButton().click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        expect(getCommentElements().length).toBe(1);
                        discardSelection();
                        await tick();
                        expect(getCommentButton()).toBeFalsy();
                        expect(container).toMatchSnapshot();

                        //enter text and save
                        fireEvent.input(getCommentEditor().querySelector('textarea'), {
                            target: { value: 'here it is' }
                        });
                        await tick();
                        expect(saveScoringInlineCommentsSpy).not.toHaveBeenCalled();
                        getCommentEditor().querySelector('button[type="submit"]').click();
                        await tick();
                        expect(getCommentElements().length).toBe(1);
                        expect(saveScoringInlineCommentsSpy).toHaveBeenCalledWith(
                            'item2',
                            expect.objectContaining({
                                responses: {
                                    respA: { highlights: expect.anything(), comments: { 'cmt-A': 'here it is' } }
                                }
                            })
                        );
                        expect(saveScoringInlineCommentsSpy.mock.calls[0][1]).toMatchSnapshot();
                        saveScoringInlineCommentsSpy.mockClear();
                        await tick();
                        expect(getCommentEditor()).toBeFalsy();

                        //click on created comment to edit, change text and save
                        getCommentElements()[0].click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        fireEvent.input(getCommentEditor().querySelector('textarea'), {
                            target: { value: 'there it was' }
                        });
                        await tick();
                        getCommentEditor().querySelector('button[type="submit"]').click();
                        await tick();
                        expect(getCommentElements().length).toBe(1);
                        expect(saveScoringInlineCommentsSpy).toHaveBeenCalledWith(
                            'item2',
                            expect.objectContaining({
                                responses: {
                                    respA: { highlights: expect.anything(), comments: { 'cmt-A': 'there it was' } }
                                }
                            })
                        );
                        expect(saveScoringInlineCommentsSpy.mock.calls[0][1]).toMatchSnapshot();
                        saveScoringInlineCommentsSpy.mockClear();
                        await tick();
                        expect(getCommentEditor()).toBeFalsy();

                        //delete
                        getCommentElements()[0].click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        getCommentEditor().querySelector('.button-link').click();
                        await tick();
                        expect(getCommentElements().length).toBe(0);
                        expect(saveScoringInlineCommentsSpy).toHaveBeenCalledWith('item2', {});
                        await tick();
                        expect(getCommentEditor()).toBeFalsy();

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('edit mode: notify highlighter-plugin on create/edit/delete', () =>
        new Promise(done => {
            statusStore.set(testSessionStatus.interacting);
            getPluginConfigSpy.mockReturnValue(editModeConfig);
            const highlighterNotifySpy = vi.fn();

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('inlineComments-highlighter', highlighterNotifySpy)
                .after('loaditem', () => {
                    try {
                        expect(highlighterNotifySpy).toHaveBeenNthCalledWith(1, { action: 'enabled' });
                        expect(highlighterNotifySpy).toHaveBeenNthCalledWith(2, {
                            action: 'has-unsaved',
                            payload: { hasUnsaved: false, restorePreviousModel: false }
                        });
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .after('renderitem', async () => {
                    try {
                        await tick();
                        expect(highlighterNotifySpy).toHaveBeenNthCalledWith(3, {
                            action: 'comments-restored',
                            payload: { itemRef: 'item2' }
                        });

                        //select
                        selectText(0, 0, 'Lorem'.length);
                        await tick();
                        expect(getCommentButton()).toBeTruthy();

                        //click to create
                        generateElementId.mockReturnValueOnce('cmt-A');
                        getCommentButton().click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        expect(getCommentElements().length).toBe(1);
                        discardSelection();
                        expect(highlighterNotifySpy).toHaveBeenNthCalledWith(4, {
                            action: 'has-unsaved',
                            payload: { hasUnsaved: true }
                        });
                        expect(highlighterNotifySpy).toHaveBeenNthCalledWith(5, {
                            action: 'erase-overlapping'
                        });

                        //enter text and save
                        fireEvent.input(getCommentEditor().querySelector('textarea'), {
                            target: { value: 'here it is' }
                        });
                        await tick();
                        getCommentEditor().querySelector('button[type="submit"]').click();
                        await tick();
                        expect(highlighterNotifySpy).toHaveBeenNthCalledWith(6, {
                            action: 'has-unsaved',
                            payload: { hasUnsaved: false, restorePreviousModel: false }
                        });

                        //click on created comment to edit, change text and save
                        getCommentElements()[0].click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        fireEvent.input(getCommentEditor().querySelector('textarea'), {
                            target: { value: 'there it was' }
                        });
                        await tick();
                        getCommentEditor().querySelector('button[type="submit"]').click();
                        await tick();
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(6);

                        //delete
                        getCommentElements()[0].click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        getCommentEditor().querySelector('.button-link').click();
                        await tick();
                        expect(getCommentElements().length).toBe(0);
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(6);

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('edit mode: delete/update cancellation', () =>
        new Promise(done => {
            statusStore.set(testSessionStatus.interacting);
            getPluginConfigSpy.mockReturnValue(editModeConfig);
            loadItemSpy.mockReturnValue(itemDataWithComments);
            const highlighterNotifySpy = vi.fn();
            saveScoringInlineCommentsSpy.mockRejectedValue();

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('inlineComments-highlighter', highlighterNotifySpy)
                .after('renderitem', async () => {
                    try {
                        await tick();
                        expect(getCommentElements().length).toBe(2);
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(3);

                        //delete error
                        getCommentElements()[0].click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        getCommentEditor().querySelector('.button-link').click();
                        await tick();
                        await tick();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        expect(saveScoringInlineCommentsSpy).toHaveBeenCalled();
                        //also check that model includes other highlights when one is being deleted
                        expect(saveScoringInlineCommentsSpy.mock.calls[0][1]).toEqual({
                            responses: { respA: { highlights: expect.anything(), comments: { 5678: 'spring autumn' } } }
                        });
                        expect(saveScoringInlineCommentsSpy.mock.calls[0][1]).toMatchSnapshot();
                        saveScoringInlineCommentsSpy.mockClear();
                        getCommentEditor().querySelector('[name="cancel-comment"]').click();
                        await tick();
                        expect(getCommentEditor()).toBeFalsy();
                        expect(getCommentElements().length).toBe(2);
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(3);

                        //update error
                        getCommentElements()[1].click();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        expect(getCommentEditor().querySelector('textarea').value).toContain('spring autumn');
                        fireEvent.input(getCommentEditor().querySelector('textarea'), {
                            target: { value: 'here it is' }
                        });
                        await tick();
                        getCommentEditor().querySelector('button[type="submit"]').click();
                        await tick();
                        await tick();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        expect(saveScoringInlineCommentsSpy).toHaveBeenCalled();
                        //also check that model includes all highlights when only one is being updated
                        expect(saveScoringInlineCommentsSpy.mock.calls[0][1]).toEqual({
                            responses: {
                                respA: {
                                    highlights: expect.anything(),
                                    comments: { 1234: 'summer winter', 5678: 'here it is' }
                                }
                            }
                        });
                        expect(saveScoringInlineCommentsSpy.mock.calls[0][1]).toMatchSnapshot();
                        saveScoringInlineCommentsSpy.mockClear();
                        getCommentEditor().querySelector('[name="cancel-comment"]').click();
                        await tick();
                        expect(getCommentEditor()).toBeFalsy();
                        expect(getCommentElements().length).toBe(2);
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(3);

                        //update cancel
                        getCommentElements()[1].click();
                        await tick();
                        expect(getCommentEditor().querySelector('textarea').value).toContain('spring autumn');
                        fireEvent.input(getCommentEditor().querySelector('textarea'), {
                            target: { value: 'there it was' }
                        });
                        await tick();
                        getCommentEditor().querySelector('[name="cancel-comment"]').click();
                        await tick();
                        expect(getCommentEditor()).toBeFalsy();
                        expect(saveScoringInlineCommentsSpy).not.toHaveBeenCalled();
                        getCommentElements()[1].click();
                        await tick();
                        expect(getCommentEditor().querySelector('textarea').value).toContain('spring autumn');
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(3);

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));

    it('edit mode: create cancellation', () =>
        new Promise(done => {
            statusStore.set(testSessionStatus.interacting);
            getPluginConfigSpy.mockReturnValue(editModeConfig);
            loadItemSpy.mockReturnValue(itemDataWithComments);
            const highlighterNotifySpy = vi.fn();
            saveScoringInlineCommentsSpy.mockRejectedValue();

            runner
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('inlineComments-highlighter', highlighterNotifySpy)
                .after('renderitem', async () => {
                    try {
                        await tick();
                        expect(getCommentElements().length).toBe(2);
                        const initialHtml = getHighlightContainer().innerHTML;
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(3);

                        //create cancel
                        selectText(3, 1, 1 + 'dolor'.length);
                        await tick();
                        expect(getCommentButton()).toBeTruthy();
                        generateElementId.mockReturnValueOnce('cmt-A');
                        getCommentButton().click();
                        discardSelection();
                        await tick();
                        expect(getCommentElements().length).toBe(3);
                        getCommentElements()[2].click();
                        await tick();
                        fireEvent.input(getCommentEditor().querySelector('textarea'), {
                            target: { value: 'here it is' }
                        });
                        await tick();
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(5);
                        getCommentEditor().querySelector('[name="cancel-comment"]').click();
                        await tick();
                        expect(getCommentEditor()).toBeFalsy();
                        expect(saveScoringInlineCommentsSpy).not.toHaveBeenCalled();
                        expect(getCommentElements().length).toBe(2);
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(6);
                        expect(highlighterNotifySpy).toHaveBeenNthCalledWith(6, {
                            action: 'has-unsaved',
                            payload: { hasUnsaved: false, restorePreviousModel: true }
                        });

                        //create error
                        selectText(3, 1, 1 + 'dolor'.length);
                        await tick();
                        expect(getCommentButton()).toBeTruthy();
                        generateElementId.mockReturnValueOnce('cmt-B');
                        getCommentButton().click();
                        discardSelection();
                        await tick();
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(8);
                        expect(getCommentElements().length).toBe(3);
                        getCommentElements()[2].click();
                        await tick();
                        fireEvent.input(getCommentEditor().querySelector('textarea'), {
                            target: { value: 'there it was' }
                        });
                        await tick();
                        getCommentEditor().querySelector('button[type="submit"]').click();
                        await tick();
                        await tick();
                        await tick();
                        expect(getCommentEditor()).toBeTruthy();
                        expect(saveScoringInlineCommentsSpy).toHaveBeenCalled();
                        saveScoringInlineCommentsSpy.mockClear();
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(8);
                        getCommentEditor().querySelector('[name="cancel-comment"]').click();
                        await tick();
                        expect(getCommentEditor()).toBeFalsy();
                        expect(getCommentElements().length).toBe(2);
                        expect(getHighlightContainer().innerHTML).toBe(initialHtml);
                        expect(highlighterNotifySpy).toHaveBeenCalledTimes(9);
                        expect(highlighterNotifySpy).toHaveBeenNthCalledWith(9, {
                            action: 'has-unsaved',
                            payload: { hasUnsaved: false, restorePreviousModel: true }
                        });

                        runner.destroy();
                        done();
                    } catch (err) {
                        runner.destroy();
                        throw err;
                    }
                })
                .init();
        }));
});
