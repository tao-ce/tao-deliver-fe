// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../fullscreenApi.js');

import { tick } from 'svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../../session/testSessionUserDataService.js';
import { getTestStateStore } from '../../../../testsStateStore.js';
import fullscreenApiFactory from '../fullscreenApi.js';

describe('fullscreen plugin', () => {
    let container;
    let getContainer;
    let getToolsArea;
    let getContentArea;
    let testProviderApi;
    let toolsStore;
    let fullscreenApiMock;
    const serviceCallId = 'test-session-jfm';

    function createTestRunner() {
        return testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });
    }

    function createFullscreenApiMock() {
        let callbackInstance;
        let isFullscreenResult = false;
        fullscreenApiMock = {
            isSupported: vi.fn().mockReturnValue(true),
            isFullscreen: vi.fn().mockImplementation(() => isFullscreenResult),
            enterFullscreen: vi.fn().mockImplementation(() => {
                //mock underlying native behavior:
                //this action triggers browser event to which we listen with `addChangeListener`
                //and also it changes return value of `isFullscreen`
                isFullscreenResult = true;
                callbackInstance();
            }),
            exitFullscreen: vi.fn().mockImplementation(() => {
                isFullscreenResult = false;
                callbackInstance();
            }),
            addChangeListener: vi.fn().mockImplementation(callback => {
                callbackInstance = callback;
            }),
            removeChangeListener: vi.fn()
        };
        return fullscreenApiMock;
    }

    beforeEach(() => {
        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getToolsArea,
                    getContentArea
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);
        toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
        fullscreenApiFactory.mockReturnValue(createFullscreenApiMock());
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        clearAllTestSessionsUserData();
        fullscreenApiFactory.mockClear();
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            expect.assertions(1);

            fullscreenApiMock.isSupported.mockReturnValue(true);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const pluginState = toolsStore.getTestToolState('fullscreen');
                    expect(pluginState || {}).not.toHaveProperty('visible'); //default is true

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('if fullscreen mode not supported, hides toolbar button', () =>
        new Promise(done => {
            expect.assertions(1);

            fullscreenApiMock.isSupported.mockReturnValue(false);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const pluginState = toolsStore.getTestToolState('fullscreen');
                    expect(pluginState).toEqual(
                        expect.objectContaining({
                            visible: false
                        })
                    );

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('on toolbar action toggles fullscreen mode and updates toolbar button state', () =>
        new Promise(done => {
            expect.assertions(8);

            fullscreenApiMock.isSupported.mockReturnValue(true);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(fullscreenApiMock.enterFullscreen).not.toHaveBeenCalled();
                    const pluginState = toolsStore.getTestToolState('fullscreen');
                    expect((pluginState || {}).open).toBeFalsy();

                    runner.trigger('toolbaraction', 'fullscreen');
                    tick()
                        .then(() => {
                            expect(fullscreenApiMock.enterFullscreen).toHaveBeenCalled();
                            fullscreenApiMock.enterFullscreen.mockClear();
                            expect(fullscreenApiMock.exitFullscreen).not.toHaveBeenCalled();

                            const pluginState2 = toolsStore.getTestToolState('fullscreen');
                            expect(pluginState2).toEqual(
                                expect.objectContaining({
                                    open: true
                                })
                            );

                            runner.trigger('toolbaraction', 'fullscreen');
                        })
                        .then(tick)
                        .then(() => {
                            expect(fullscreenApiMock.exitFullscreen).toHaveBeenCalled();
                            expect(fullscreenApiMock.enterFullscreen).not.toHaveBeenCalled();

                            const pluginState3 = toolsStore.getTestToolState('fullscreen');
                            expect(pluginState3).toEqual(
                                expect.objectContaining({
                                    open: false
                                })
                            );

                            runner.destroy();
                        });
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('on init checks actual fullscreen mode and overwrites store state with it', () =>
        new Promise(done => {
            expect.assertions(2);

            fullscreenApiMock.isSupported.mockReturnValue(true);
            toolsStore.setTestToolState('fullscreen', { open: true });
            const pluginState = toolsStore.getTestToolState('fullscreen');
            expect(pluginState).toEqual(
                expect.objectContaining({
                    open: true
                })
            );

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const pluginState2 = toolsStore.getTestToolState('fullscreen');
                    expect((pluginState2 || {}).open).toBeFalsy();

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('adds fullscreen mode change listener and removes it on destroy', () =>
        new Promise(done => {
            expect.assertions(3);

            fullscreenApiMock.isSupported.mockReturnValue(true);

            const runner = createTestRunner();
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(fullscreenApiMock.addChangeListener).toHaveBeenCalled();
                    expect(fullscreenApiMock.removeChangeListener).not.toHaveBeenCalled();

                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(fullscreenApiMock.removeChangeListener).toHaveBeenCalled();

                    done();
                })
                .init();
        }));
});
