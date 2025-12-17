// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/ui-core', async () => {
    const originalModule = await vi.importActual('@oat-sa-private/ui-core');
    return Object.assign({ __esModule: true }, originalModule, { ResizeObserver: vi.fn() });
});

import { tick } from 'svelte';
import { fireEvent } from '@testing-library/svelte';
import { ResizeObserver } from '@oat-sa-private/ui-core';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import {
    getTestSessionStatusStore,
    getTestStateStore
} from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';
import preset from './testStoreMocks/presetTwoPartsFourSectionsNonLinear.json';

function setupLayout() {
    const div = document.createElement('div');
    div.innerHTML = '<nav></nav>';
    return div;
}

const serviceCallId = 'test-session-plswrk';

function setupStore(testServiceCallId, data) {
    const stateStore = getTestStateStore(testServiceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
}

const createResizeObserverImplementation = width =>
    function (callback) {
        return {
            observe() {
                callback([
                    {
                        target: {
                            getBoundingClientRect: () => ({
                                width,
                                height: 800
                            })
                        }
                    }
                ]);
            },
            unobserve() {},
            disconnect() {}
        };
    };

describe('previewerNavigator plugin', () => {
    let container;
    let getContainer;
    let getNavigationArea;
    let clearAreasContent;
    let testProviderApi;
    let statusStore;

    const jumpSpy = vi.fn();
    const nextSpy = vi.fn();
    const previousSpy = vi.fn();

    beforeEach(() => {
        jumpSpy.mockClear();
        nextSpy.mockClear();
        previousSpy.mockClear();

        container = setupLayout();

        getContainer = () => container;
        getNavigationArea = () => container.querySelector('nav');
        clearAreasContent = () => {};

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getNavigationArea,
                    clearAreasContent
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            jump: jumpSpy,
            next: nextSpy,
            previous: previousSpy,
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);

        setupStore(serviceCallId, Object.assign({}, preset));
        statusStore = getTestSessionStatusStore(serviceCallId);

        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => callback());
        ResizeObserver.mockImplementation(createResizeObserverImplementation(1200));
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        container.innerHTML = '';
        statusStore.clear();

        ResizeObserver.mockClear();
        window.requestAnimationFrame.mockRestore();
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(container).toMatchSnapshot();
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(getNavigationArea()).toBeEmptyDOMElement();
                    done();
                })
                .init();
        }));

    it('disables and enables nav on events', () =>
        new Promise(done => {
            expect.assertions(4);

            const nav = getNavigationArea();

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('ready', () => {
                    expect(nav.querySelectorAll('button:disabled').length).toBeGreaterThan(0);
                    runner.loadItem('item4');
                })
                .on('renderitem', () => {
                    expect(nav.querySelectorAll('button:disabled').length).toBeGreaterThan(0);

                    runner.trigger('enablenav');
                    tick()
                        .then(tick)
                        .then(() => {
                            expect(nav.querySelectorAll('button:disabled').length).toBe(0);
                            runner.trigger('disablenav');
                            return tick();
                        })
                        .then(() => {
                            expect(nav.querySelectorAll('button:disabled').length).toBeGreaterThan(0);
                            done();
                        });
                })
                .init();
        }));

    it('moves to next item on events from own components', () =>
        new Promise(done => {
            expect.assertions(4);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });
            runner
                .on('error', error => {
                    throw error;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', () => {
                    runner.trigger('enablenav');
                    tick()
                        .then(() => {
                            expect(nextSpy).not.toHaveBeenCalled();
                            const button = getNavigationArea().querySelector('button[name="next"]:enabled');
                            expect(button).toBeTruthy();
                            fireEvent.click(button);

                            return tick();
                        })
                        .then(() => {
                            expect(nextSpy).toHaveBeenCalled();
                            expect(nextSpy).toHaveBeenCalledWith('item');

                            done();
                        });
                })
                .init();
        }));

    it('moves to previous item on events from own components', () =>
        new Promise(done => {
            expect.assertions(4);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });
            runner
                .on('error', error => {
                    throw error;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', () => {
                    runner.trigger('enablenav');
                    tick()
                        .then(() => {
                            expect(previousSpy).not.toHaveBeenCalled();
                            const button = getNavigationArea().querySelector('button[name="prev"]:enabled');
                            expect(button).toBeTruthy();
                            fireEvent.click(button);

                            return tick();
                        })
                        .then(() => {
                            expect(previousSpy).toHaveBeenCalled();
                            expect(previousSpy).toHaveBeenCalledWith('item');

                            done();
                        });
                })
                .init();
        }));

    it('moves to other item on events from own components', () =>
        new Promise(done => {
            expect.assertions(4);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });
            runner
                .on('error', error => {
                    throw error;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', () => {
                    runner.trigger('enablenav');
                    tick()
                        .then(() => {
                            expect(jumpSpy).not.toHaveBeenCalled();

                            const buttons = Array.from(getNavigationArea().querySelectorAll('button.step:enabled'));
                            const button = buttons.find(btn => btn.textContent.trim() === '4');
                            expect(button).toBeTruthy();
                            fireEvent.click(button);

                            return tick();
                        })
                        .then(() => {
                            expect(jumpSpy).toHaveBeenCalled();
                            expect(jumpSpy).toHaveBeenCalledWith(3, void 0);

                            done();
                        });
                })
                .init();
        }));
});
