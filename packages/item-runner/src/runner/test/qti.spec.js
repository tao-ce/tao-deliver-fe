// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// mock store for custom interaction
vi.mock('core/store', () => {
    const store = () =>
        // eslint-disable-next-line implicit-arrow-linebreak
        Promise.resolve({
            getItem() {
                return Promise.resolve();
            },
            setItem() {
                return Promise.resolve(true);
            }
        });
    store.backends = {
        memory: 'memory'
    };
    return {
        __esModule: true,
        default: store
    };
});
vi.mock('../util/scroll.js');

vi.mock('../interactions/extendedText/uploadAdapter.js', () => ({
    __esModule: true,
    default: vi.fn(),
    cancelAllExtendedTextUploads: vi.fn()
}));
vi.mock('../services/upload/uploadService.js', () => ({
    __esModule: true,
    default: vi.fn(),
    cancelAllServicesUploads: vi.fn()
}));

import { get } from 'svelte/store';
import itemRunner from 'taoItems/runner/api/itemRunner';
import qtiItemRunnerProvider from '../qti.js';
import { getItemStateStore } from '../itemsStateStore.js';
import { getItemSettingsStore, releaseItemSettingsStore } from '../itemsSettingsStore.js';
import { getItemToolsStateStore, releaseItemToolsStateStore } from '../itemsToolsStateStore.js';
import samples from '../../../samples/index';
import { fireEvent } from '@testing-library/dom';
import itemsSessionStatusStore, { getItemSessionStatusStore } from '../itemsSessionStatusStore.js';
import itemSessionStatus from '../itemSessionStatus.js';
import assetManagerFactory from 'taoItems/assets/manager';
import assetStrategies from 'taoItems/assets/strategies';
import { cloneDeep } from 'lodash';
import { getItemPendingOperationsStore } from '../itemsPendingOperationsStore.js';
import { cancelAllExtendedTextUploads } from '../interactions/extendedText/uploadAdapter.js';
import { cancelAllServicesUploads } from '../services/upload/uploadService.js';

const { itemData } = samples.americaDiscovery;
itemData.itemData.data.stylesheets = {}; // because unable to mock StylesheetLoader

const assetManager = assetManagerFactory([
    assetStrategies.packedUrl,
    assetStrategies.baseUrl,
    assetStrategies.base64,
    assetStrategies.external
]);

describe('provider', () => {
    afterEach(() => {
        delete itemRunner.providers;
    });

    describe('API', () => {
        test.each(['init', 'render', 'getState', 'setState', 'clear', 'getResponses'])(
            'should provide %s function',
            functionName => {
                expect(typeof qtiItemRunnerProvider[functionName]).toBe('function');
            }
        );
    });

    describe('Init', () => {
        beforeEach(() => {
            itemRunner.register('qti', qtiItemRunnerProvider);
        });

        it('can be registered as provider', () => {
            expect(itemRunner.providers.qti).toBe(qtiItemRunnerProvider);
        });

        it('can provide item data', () =>
            new Promise(done => {
                itemRunner('qti', itemData)
                    .on('init', function () {
                        expect(this.getData()).toBe(itemData);
                        done();
                    })
                    .init();
            }));
    });

    describe('Render and clear', () => {
        beforeEach(() => {
            itemRunner.register('qti', qtiItemRunnerProvider);
        });

        it('renders item to the given container', () =>
            new Promise(done => {
                const container = document.createElement('div');
                container.innerHTML = '<span>Some other content</span>';

                itemRunner('qti', itemData)
                    .on('render', async function () {
                        expect(container).toMatchSnapshot();
                        this.clear();
                    })
                    .on('clear', function () {
                        expect(container).toMatchSnapshot();
                        done();
                    })
                    .init()
                    .render(container);
            }));

        it('listens for item render error', () =>
            new Promise(done => {
                itemRunner('qti', itemData)
                    .on('error', function (err) {
                        expect(err).toBeInstanceOf(Error);
                        this.clear();
                        done();
                    })
                    .on('render', function () {
                        // simulate item error event
                        this.item.$$.callbacks.error[0](
                            new CustomEvent('Render error', { detail: new Error('Error rendering item') })
                        );
                    })
                    .init()
                    .render(document.body);
            }));

        it('renders with provided renderer', () =>
            new Promise(done => {
                const container = document.createElement('div');

                itemRunner('qti', samples.photo.itemData, { renderer: 'review' })
                    .on('render', () => {
                        expect(container).toMatchSnapshot();
                        done();
                    })
                    .init()
                    .render(container);
            }));

        it('applies itemContainerHeight option when rendering', () =>
            new Promise(done => {
                const container = document.createElement('div');

                itemRunner('qti', itemData, { itemContainerHeight: 'var(--some-name)' })
                    .on('render', () => {
                        expect(
                            container.querySelector('.qti-item').style.getPropertyValue('--item-container-height')
                        ).toBe('var(--some-name)');
                        done();
                    })
                    .init()
                    .render(container);
            }));

        it('handles the rubric block option', () =>
            new Promise(done => {
                const container = document.createElement('div');
                const options = { testContext: { rubricBlock: '<div>Rubric Block Body</div>' } };

                itemRunner('qti', itemData, options)
                    .on('render', function () {
                        expect(this.options).toMatchObject({
                            testContext: { rubricBlock: '<div>Rubric Block Body</div>' },
                            state: {}
                        });
                        this.clear();
                    })
                    .on('clear', function () {
                        done();
                    })
                    .init()
                    .render(container);
            }));

        it('if writing-mode-vertical-rl item, sets class on body', () =>
            new Promise(done => {
                expect.assertions(3);
                const bodyClass = 'item-writing-mode-vertical-rl';

                const container = document.createElement('div');
                document.body.append(container);
                const verticalItemData = cloneDeep(itemData);
                verticalItemData.itemData.data.attributes.class = 'writing-mode-vertical-rl';

                itemRunner('qti', verticalItemData)
                    .on('init', () => {
                        expect(document.body).not.toHaveClass(bodyClass);
                    })
                    .on('render', function () {
                        expect(document.body).toHaveClass(bodyClass);
                        this.clear();
                    })
                    .on('clear', function () {
                        expect(document.body).not.toHaveClass(bodyClass);
                        container.remove();
                        done();
                    })
                    .init()
                    .render(container);
            }));
    });

    describe('Session lifecycle', () => {
        beforeEach(() => {
            itemRunner.register('qti', qtiItemRunnerProvider);
            document.body.innerHTML = '';
        });
        afterEach(() => itemsSessionStatusStore.clear());

        it('renders, suspend, resume and clear', () =>
            new Promise(done => {
                expect.assertions(5);

                const container = document.createElement('div');

                const sessionStatusStore = getItemSessionStatusStore(itemData.itemIdentifier);
                itemRunner('qti', itemData)
                    .on('init', () => {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.initial);
                    })
                    .on('render', async function () {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.interacting);
                        await this.suspend();
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.suspended);
                        await this.resume();
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.interacting);
                        this.clear();
                    })
                    .on('clear', function () {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.initial);
                        done();
                    })
                    .init()
                    .render(container);
            }));

        it('renders, close and clear', () =>
            new Promise(done => {
                expect.assertions(4);

                const container = document.createElement('div');

                const sessionStatusStore = getItemSessionStatusStore(itemData.itemIdentifier);
                itemRunner('qti', itemData)
                    .on('error', err => {
                        throw err;
                    })
                    .on('init', () => {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.initial);
                    })
                    .on('render', async function () {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.interacting);
                        this.close();
                    })
                    .on('close', function () {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.closed);
                        this.clear();
                    })
                    .on('clear', function () {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.initial);
                        done();
                    })
                    .init()
                    .render(container);
            }));
    });

    describe('State', () => {
        let runner;
        beforeEach(() => {
            itemRunner.register('qti', qtiItemRunnerProvider);
        });

        afterEach(() => {
            if (runner) {
                runner.clear();
                runner = null;
            }
        });

        it('should be able to get initial state', () => {
            const itemState = { RESPONSE: { response: { base: { integer: 0 } } } };
            runner = itemRunner('qti', Object.assign({}, itemData, { itemState })).init();

            expect(runner.getState()).toBe(itemState);
            expect(runner.getResponses()).toMatchObject({ RESPONSE: itemState.RESPONSE.response });
        });

        it('should listen for item state store modification', () =>
            new Promise(done => {
                const itemState = { RESPONSE: { response: { base: { integer: 0 } } } };
                runner = itemRunner('qti', itemData)
                    .on('init', function () {
                        this.render(document.body);
                    })
                    .on('render', function () {
                        this.on('statechange', state => {
                            expect(state).toBe(itemState);
                        }).on('responsechange', responses => {
                            expect(responses.RESPONSE).toBe(itemState.RESPONSE.response);
                            done();
                        });
                        // simulate rendered item modifies store
                        getItemStateStore(itemData.itemIdentifier).set(itemState);
                    })
                    .init();
            }));

        it('modify store on setState call', () =>
            new Promise(done => {
                const itemState = { RESPONSE: { response: { base: { integer: 0 } } } };
                // rendered item modifies store
                const itemStateStore = getItemStateStore(itemData.itemIdentifier);

                runner = itemRunner('qti', itemData)
                    .on('init', function () {
                        this.render(document.body);
                    })
                    .on('render', () => {
                        let isFirstCall = true;
                        const unsubscribe = itemStateStore.subscribe(newState => {
                            if (isFirstCall) {
                                // svelte store subscribe do an initial call on listener function
                                // but it is not triggered by item provider, so this condition avoid it
                                isFirstCall = false;
                            } else {
                                expect(newState).toBe(itemState);
                                unsubscribe();
                                done();
                            }
                        });

                        runner.setState(itemState);
                    });
                runner.init();
            }));

        it('requests item to update state on getState call', () =>
            new Promise(done => {
                expect.assertions(2);
                const itemState = { RESPONSE: { response: { base: { integer: -99 } } } };

                const itemRunnerInstance = itemRunner('qti', itemData)
                    .on('render', function () {
                        const { itemIdentifier } = itemData;
                        const context = this.item.$$.context.get(itemIdentifier);
                        context.on('stateupdate', () => {
                            expect(true).toBe(true);
                            const itemStateStore = getItemStateStore(itemIdentifier);
                            itemStateStore.set(itemState);
                        });

                        expect(itemRunnerInstance.getState()).toMatchObject(itemState);
                        done();
                    })
                    .init()
                    .render(document.body);
            }));

        it('requests item to update response on getResponse call', () =>
            new Promise(done => {
                expect.assertions(2);
                const itemState = { RESPONSE: { response: { base: { integer: -99 } } } };

                const itemRunnerInstance = itemRunner('qti', itemData)
                    .on('render', function () {
                        const { itemIdentifier } = itemData;
                        const context = this.item.$$.context.get(itemIdentifier);
                        context.on('stateupdate', () => {
                            expect(true).toBe(true);
                            const itemStateStore = getItemStateStore(itemIdentifier);
                            itemStateStore.set(itemState);
                        });

                        expect(itemRunnerInstance.getResponses()).toMatchObject({
                            RESPONSE: itemState.RESPONSE.response
                        });
                        done();
                    })
                    .init()
                    .render(document.body);
            }));
    });

    describe('Events', () => {
        beforeEach(() => {
            itemRunner.register('qti', qtiItemRunnerProvider);
            document.body.innerHTML = '';
        });

        it('emits pendingoperationschange events', () =>
            new Promise(done => {
                expect.assertions(8);

                const container = document.createElement('div');

                const sessionStatusStore = getItemSessionStatusStore(itemData.itemIdentifier);
                const pendingOpsStore = getItemPendingOperationsStore(itemData.itemIdentifier);

                const pendingOpsChangeSpy = vi.fn();

                itemRunner('qti', itemData)
                    .on('error', err => {
                        throw err;
                    })
                    .on('pendingoperationschange', pendingOpsChangeSpy)
                    .on('init', () => {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.initial);
                        expect(pendingOpsChangeSpy).not.toHaveBeenCalled();

                        pendingOpsStore.add('upload-123');
                        expect(pendingOpsChangeSpy).toHaveBeenCalledWith({
                            addedKey: 'upload-123',
                            size: 1
                        });

                        pendingOpsStore.add('upload-456');
                        expect(pendingOpsChangeSpy).toHaveBeenCalledWith({
                            addedKey: 'upload-456',
                            size: 2
                        });

                        pendingOpsStore.delete('upload-123');
                        expect(pendingOpsChangeSpy).toHaveBeenCalledWith({
                            deletedKey: 'upload-123',
                            size: 1
                        });
                    })
                    .on('render', function () {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.interacting);
                        this.clear();
                    })
                    .on('clear', function () {
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.initial);
                        expect(pendingOpsChangeSpy).toHaveBeenCalledWith({
                            cleared: true,
                            size: 0
                        });
                        done();
                    })
                    .init()
                    .render(container);
            }));
    });

    describe('Uploads', () => {
        beforeEach(() => {
            itemRunner.register('qti', qtiItemRunnerProvider);
            document.body.innerHTML = '';
        });

        it('cancelAllUploads calls through to upload services', () =>
            new Promise(done => {
                expect.assertions(2);

                const container = document.createElement('div');

                const runner = itemRunner('qti', itemData)
                    .on('error', err => {
                        throw err;
                    })
                    .on('render', function () {
                        runner.cancelAllUploads();
                        expect(cancelAllExtendedTextUploads).toHaveBeenCalled();
                        expect(cancelAllServicesUploads).toHaveBeenCalled();
                        done();
                    })
                    .init()
                    .render(container);
            }));
    });

    describe('Asset resolver', () => {
        beforeEach(() => {
            itemRunner.register('qti', qtiItemRunnerProvider);
            document.body.innerHTML = '';
        });

        it('resolves assets from external mapping', () =>
            new Promise(done => {
                expect.assertions(4);

                const testHost = 'http://localhost:3000'; // from Vitest
                const container = document.createElement('div');
                const introItemData = samples.introduction.itemData;
                introItemData.itemData.data.stylesheets = {}; // because unable to mock StylesheetLoader
                document.body.appendChild(container);

                expect(container.querySelectorAll('img')).toHaveLength(0);
                expect(introItemData.itemData.assets.img).toMatchObject({
                    'intro.png': 'introduction/intro.png'
                });

                itemRunner('qti', introItemData, { assetManager })
                    .on('error', err => {
                        throw err;
                    })
                    .on('init', function () {
                        this.render(container);

                        //for image loading because jsdom doesn't
                        setTimeout(() => {
                            for (let image of document.body.querySelectorAll('img')) {
                                fireEvent(image, new UIEvent('load'));
                            }
                        }, 10);
                    })
                    .on('render', function () {
                        expect(container.querySelectorAll('img')).toHaveLength(1);
                        const resolvedImage = container.querySelector('img');
                        expect(resolvedImage.src).toEqual(`${testHost}/assets/introduction/intro.png`);

                        this.clear();
                    })
                    .on('clear', function () {
                        done();
                    })
                    .init();
            }));
    });

    describe('Settings', () => {
        afterEach(() => releaseItemSettingsStore(itemData.itemIdentifier));

        it('Settings store is filled from options', () =>
            new Promise(done => {
                expect.assertions(2);

                itemRunner.register('qti', qtiItemRunnerProvider);

                const itemSettingsStore = getItemSettingsStore(itemData.itemIdentifier);
                expect(get(itemSettingsStore)).toMatchObject({});

                const runner = itemRunner('qti', itemData, { settings: { choiceElimination: true } })
                    .on('init', function () {
                        this.render(document.body);
                    })
                    .on('render', function () {
                        expect(get(itemSettingsStore)).toMatchObject({ choiceElimination: true });
                        done();
                    });

                runner.init();
            }));

        it('Update settings when options are set', () =>
            new Promise(done => {
                expect.assertions(4);

                itemRunner.register('qti', qtiItemRunnerProvider);

                const itemSettingsStore = getItemSettingsStore(itemData.itemIdentifier);
                expect(get(itemSettingsStore)).toMatchObject({});

                const runner = itemRunner('qti', itemData, { settings: { choiceElimination: true } })
                    .on('init', function () {
                        this.render(document.body);
                    })
                    .on('render', function () {
                        expect(get(itemSettingsStore)).toMatchObject({ choiceElimination: true });

                        runner.setOptions({ foo: true });
                        expect(get(itemSettingsStore)).toMatchObject({ choiceElimination: true });

                        runner.setOptions({ settings: { choiceElimination: false } });
                        expect(get(itemSettingsStore)).toMatchObject({ choiceElimination: false });
                        done();
                    });

                runner.init();
            }));
    });

    describe('Tool State', () => {
        afterEach(() => releaseItemToolsStateStore(itemData.itemIdentifier));

        it('Tools state store is filled from options', () =>
            new Promise(done => {
                expect.assertions(2);

                itemRunner.register('qti', qtiItemRunnerProvider);

                const toolsStateStore = getItemToolsStateStore(itemData.itemIdentifier);
                expect(toolsStateStore.getToolState('choiceElimination')).toBeUndefined();

                const runner = itemRunner('qti', itemData, { toolsState: { choiceElimination: ['c1', 'c2'] } })
                    .on('init', function () {
                        this.render(document.body);
                    })
                    .on('render', function () {
                        expect(toolsStateStore.getToolState('choiceElimination')).toMatchObject(['c1', 'c2']);
                        done();
                    });

                runner.init();
            }));

        it('triggers a tool state change event', () =>
            new Promise(done => {
                expect.assertions(4);

                itemRunner.register('qti', qtiItemRunnerProvider);

                const toolsStateStore = getItemToolsStateStore(itemData.itemIdentifier);
                expect(toolsStateStore.getToolState('choiceElimination')).toBeUndefined();

                const runner = itemRunner('qti', itemData, { toolsState: { choiceElimination: ['c1', 'c2'] } })
                    .on('init', function () {
                        this.render(document.body);
                    })
                    .on('render', function () {
                        expect(toolsStateStore.getToolState('choiceElimination')).toMatchObject(['c1', 'c2']);

                        this.on('toolsstatechange', value => {
                            expect(toolsStateStore.getToolState('choiceElimination')).toMatchObject(['c3']);
                            expect(value).toMatchObject({ choiceElimination: ['c3'] });
                            done();
                        });
                        toolsStateStore.setToolState('choiceElimination', ['c3']);
                    });

                runner.init();
            }));
    });

    describe('Modal feedback', () => {
        const feedbacks = {
            feedback_modalfeedback_111: {
                identifier: 'feedbackModal_1',
                serial: 'feedback_modalfeedback_111',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_1',
                    outcomeIdentifier: 'FEEDBACK_1',
                    showHide: 'show',
                    title: '111'
                },
                body: {
                    body: '1 Modal feedback content 1'
                }
            },
            feedback_modalfeedback_222: {
                identifier: 'feedbackModal_2',
                serial: 'feedback_modalfeedback_222',
                qtiClass: 'modalFeedback',
                attributes: {
                    identifier: 'feedbackModal_2',
                    outcomeIdentifier: 'FEEDBACK_2',
                    showHide: 'show',
                    title: '222'
                },
                body: {
                    body: '2 Modal feedback content 2'
                }
            }
        };

        beforeEach(() => {
            itemRunner.register('qti', qtiItemRunnerProvider);
            document.body.innerHTML = '';
        });
        afterEach(() => itemsSessionStatusStore.clear());

        it('renderFeedbacks renders multiple feedbacks in sequence, and calls `onBeforeRenderFeedbacks` and `done` callbacks', () =>
            new Promise(done => {
                expect.assertions(11);

                const container = document.createElement('div');
                const navContainer = document.createElement('div');
                const sessionStatusStore = getItemSessionStatusStore(itemData.itemIdentifier);
                const runner = itemRunner('qti', itemData);
                runner
                    .on('error', err => {
                        throw err;
                    })
                    .on('render.test', function () {
                        runner.off('render.test');
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.interacting);
                        const itemElem = container.querySelector('.qti-item');
                        expect(itemElem.innerHTML.indexOf('American contienent discovered') >= 0).toBe(true);

                        const itemSession = {
                            FEEDBACK_1: { base: { identifier: 'feedbackModal_1' } },
                            FEEDBACK_2: { base: { identifier: 'feedbackModal_2' } },
                            onBeforeRenderFeedbacks: vi.fn(),
                            modalFeedbackNavigatorArea: navContainer
                        };
                        const doneSpy = vi.fn().mockImplementation(() => {
                            expect(navContainer.innerHTML).toBe('');
                            runner.clear();
                        });
                        runner.renderFeedbacks(feedbacks, itemSession, doneSpy);

                        //feedback 1
                        expect(itemSession.onBeforeRenderFeedbacks).toHaveBeenCalled();
                        itemSession.onBeforeRenderFeedbacks.mockClear();
                        runner.after('render.test', () => {
                            runner.off('render.test');
                            expect(sessionStatusStore.get()).toEqual(itemSessionStatus.modalFeedback);
                            const itemElem1 = container.querySelector('.qti-item');
                            expect(itemElem1).toMatchSnapshot(); //
                            expect(navContainer).toMatchSnapshot(); //
                            navContainer.querySelector('button').click(); //continue

                            //feedback 2
                            runner.after('render.test', () => {
                                runner.off('render.test');
                                expect(sessionStatusStore.get()).toEqual(itemSessionStatus.modalFeedback);
                                expect(itemSession.onBeforeRenderFeedbacks).not.toHaveBeenCalled();
                                const itemElem2 = container.querySelector('.qti-item');
                                expect(itemElem2).toMatchSnapshot();
                                expect(navContainer).toMatchSnapshot();
                                navContainer.querySelector('button').click(); //continue
                            });
                        });
                    })
                    .on('clear', function () {
                        done();
                    })
                    .init()
                    .render(container);
            }));

        it('renderFeedbacks does nothing and calls `done` callback, if no matching feedbacks to show', () => {
            expect.assertions(6);

            const navContainer = document.createElement('div');
            const container = document.createElement('div');
            const sessionStatusStore = getItemSessionStatusStore(itemData.itemIdentifier);
            const runner = itemRunner('qti', itemData);
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', function () {
                    expect(sessionStatusStore.get()).toEqual(itemSessionStatus.interacting);
                    const itemElem = container.querySelector('.qti-item');
                    const itemHtml = itemElem.innerHTML;

                    const itemSession = {
                        FEEDBACK_1: { base: null },
                        onBeforeRenderFeedbacks: vi.fn(),
                        modalFeedbackNavigatorArea: navContainer
                    };
                    const doneSpy = vi.fn().mockImplementation(() => {
                        expect(itemSession.onBeforeRenderFeedbacks).not.toHaveBeenCalled();
                        expect(sessionStatusStore.get()).toEqual(itemSessionStatus.interacting);
                        expect(container.querySelector('.qti-item') === itemElem).toBe(true);
                        expect(container.querySelector('.qti-item').innerHTML === itemHtml).toBe(true);
                        expect(navContainer.innerHTML).toBe('');
                        this.clear();
                    });
                    runner.renderFeedbacks(feedbacks, itemSession, doneSpy);
                })
                .on('clear', function () {})
                .init()
                .render(container);
        });
    });
});
