// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getTestStateStore } from '../../../../testsStateStore.js';
import {
    getTestSessionUserDataService,
    clearAllTestSessionsUserData
} from '../../../../session/testSessionUserDataService.js';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { tick } from 'svelte';
import { fireEvent } from '@testing-library/svelte';
import preset from '../../../navigation/navigator/test/testStoreMocks/presetOneSectionNonLinear.json';

describe('scratchpad plugin', () => {
    let testProviderApi;
    let container;
    let getContainer;
    let getTopBarArea;
    let getMainArea;
    let testStateStore;

    const serviceCallId = 'test-serviceCallId';
    let toolsStore;

    //setup preset with appropriate category
    const categoryName = 'x-tao-option-scratchpad';
    preset.testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item1'].categories = [categoryName];
    preset.testMap.parts['testPart-1'].sections['assessmentSection-1'].items['item3'].categories = [categoryName];

    function setupLayout() {
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="top-bar"></div>
            <main></main>
            `;

        window.innerWidth = 1280;
        window.innerHeight = 1024;

        return div;
    }

    function loadItem(runner, itemId) {
        preset.testContext.itemIdentifier = itemId;
        preset.testContext.sectionId = 'assessmentSection-1';
        preset.testContext.testPartId = 'testPart-1';
        runner.loadItem(itemId);
    }

    beforeEach(() => {
        container = setupLayout();

        getContainer = () => container;
        getMainArea = () => container.querySelector('main');
        getTopBarArea = () => container.querySelector('.top-bar');

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getMainArea,
                    getTopBarArea
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            init() {}
        };

        testStateStore = getTestStateStore(serviceCallId);
        testStateStore.setTestMap(preset.testMap);
        testStateStore.setTestContext(preset.testContext);

        testRunnerFactory.registerProvider('foo', testProviderApi);
        toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        clearAllTestSessionsUserData();
        container.innerHTML = '';
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            expect.assertions(3);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                    expect(getMainArea()).toBeEmptyDOMElement();
                    runner.destroy();
                })
                .on('renderitem', () => {
                    expect(toolsStore.getTestToolState('scratchpad')).toEqual({ visible: true });
                    done();
                })
                .on('destroy', () => {
                    expect(getMainArea()).toBeEmptyDOMElement();
                    done();
                })
                .init();
        }));

    it('adds scratchpad to main area and removes when destroyed', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            expect.assertions(2);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                })
                .on('renderitem', () => {
                    runner.trigger('toolbaraction', 'scratchpad');
                    tick()
                        .then(tick)
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            expect(getMainArea()).toMatchSnapshot();
                            runner.destroy();
                        });
                })
                .on('destroy', () => {
                    tick().then(() => {
                        expect(getMainArea()).toBeEmptyDOMElement();
                        done();
                    });
                })
                .init();
        }));

    it('reacts to scratchpad close event', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            expect.assertions(1);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                })
                .on('renderitem', () => {
                    runner.trigger('toolbaraction', 'scratchpad');
                    tick()
                        .then(tick)
                        .then(tick)
                        .then(tick)
                        .then(() => {
                            const closeBtn = container.querySelector('button');
                            fireEvent.click(closeBtn);

                            return tick();
                        })
                        .then(() => {
                            expect(getMainArea()).toBeEmptyDOMElement();
                            done();
                        });
                })
                .init();
        }));

    it('saves the scratchpad state in the user session', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            expect.assertions(5);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                })
                .on('renderitem', () => {
                    expect(toolsStore.getTestToolState('scratchpad')).toEqual({ visible: true });

                    runner.trigger('toolbaraction', 'scratchpad');
                    tick()
                        .then(() => {
                            expect(getMainArea()).toMatchSnapshot();
                            const rectToolButton = container.querySelector('[data-test-id="scratchpadTool-rectangle"]');
                            fireEvent.mouseDown(rectToolButton, { buttons: 1 });
                            fireEvent.mouseUp(rectToolButton);

                            const svg = container.querySelector('.scratchpad-container>svg');
                            fireEvent.mouseDown(svg, { clientX: 50, clientY: 50, buttons: 1 });
                            fireEvent.mouseMove(window, { clientX: 100, clientY: 100, buttons: 1 });
                            fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });

                            return tick();
                        })
                        .then(() => {
                            expect(getMainArea()).toMatchSnapshot();

                            const state = toolsStore.getTestToolState('scratchpad');
                            expect(state.shapes).toHaveLength(1);
                            expect(state).toMatchSnapshot();

                            done();
                        });
                })
                .init();
        }));

    it('respects item category', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            expect.assertions(5);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                })
                .on('renderitem', () => {
                    runner.off('renderitem');
                    expect(toolsStore.getTestToolState('scratchpad')).toEqual({ visible: true });

                    runner.trigger('toolbaraction', 'scratchpad');

                    tick().then(() => {
                        expect(toolsStore.getTestToolState('scratchpad').open).toBe(true);
                        loadItem(runner, 'item2'); //item2 doesn't have required category
                        runner.on('renderitem', () => {
                            runner.off('renderitem');
                            expect(toolsStore.getTestToolState('scratchpad').visible).toBe(false);
                            expect(toolsStore.getTestToolState('scratchpad').open).toBe(true);
                            loadItem(runner, 'item3');
                            runner.on('renderitem', () => {
                                expect(toolsStore.getTestToolState('scratchpad').visible).toBe(true);
                                done();
                            });
                        });
                    });
                })
                .init();
        }));

    it('if open, closes on headerbar readAloud open action', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            expect.assertions(4);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                })
                .on('renderitem', () => {
                    runner.trigger('toolbaraction', 'scratchpad'); //open
                    tick()
                        .then(tick)
                        .then(() => {
                            expect(getMainArea()).not.toBeEmptyDOMElement();
                            expect(toolsStore.getTestToolState('scratchpad')).toEqual(
                                expect.objectContaining({
                                    visible: true,
                                    open: true
                                })
                            );
                            return tick();
                        })
                        .then(() => {
                            runner.trigger('toolbaraction', 'readAloud'); //close because of another tool
                            return tick();
                        })
                        .then(tick)
                        .then(() => {
                            expect(getMainArea()).toBeEmptyDOMElement();
                            expect(toolsStore.getTestToolState('scratchpad')).toEqual(
                                expect.objectContaining({
                                    visible: true,
                                    open: false
                                })
                            );
                            runner.destroy();
                        });
                })
                .on('destroy', () => {
                    tick().then(() => {
                        done();
                    });
                })
                .init();
        }));

    it('restores the scratchpad state from the user session', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            toolsStore.setTestToolState('scratchpad', {
                height: 50,
                top: 0,
                width: 50,
                left: 0,
                open: true,
                shapes: [
                    {
                        geometry: {
                            height: 10,
                            width: 10,
                            x: 10,
                            y: 10
                        },
                        key: 'tao-rectangle-123',
                        selected: false,
                        type: 'rectangle'
                    }
                ],
                tools: [
                    {
                        expanded: false,
                        icon: 'type-16',
                        key: 'text',
                        label: 'Text',
                        selected: false,
                        type: 'text'
                    },
                    {
                        icon: 'rectangle-16',
                        key: 'rectangle',
                        label: 'Rectangle',
                        opener: true,
                        selected: true,
                        type: 'rectangle'
                    }
                ]
            });

            expect.assertions(1);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                })
                .on('renderitem', () => {
                    tick().then(() => {
                        expect(getMainArea()).toMatchSnapshot();

                        done();
                    });
                })
                .init();
        }));

    it('goes to previous saved canvas state on undo', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            expect.assertions(6);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                })
                .on('renderitem', () => {
                    expect(toolsStore.getTestToolState('scratchpad')).toEqual({ visible: true });

                    runner.trigger('toolbaraction', 'scratchpad');
                    tick()
                        .then(() => {
                            expect(getMainArea()).toMatchSnapshot();
                            const rectToolButton = container.querySelector('[data-test-id="scratchpadTool-rectangle"]');
                            fireEvent.mouseDown(rectToolButton, { buttons: 1 });
                            fireEvent.mouseUp(rectToolButton);

                            const svg = container.querySelector('.scratchpad-container>svg');
                            fireEvent.mouseDown(svg, { clientX: 50, clientY: 50, buttons: 1 });
                            fireEvent.mouseMove(window, { clientX: 100, clientY: 100, buttons: 1 });
                            fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });

                            return tick();
                        })
                        .then(() => {
                            const undoButton = container.querySelector('.draggable-modal button[title="undo"]');
                            expect(undoButton).toBeEnabled();
                            fireEvent.click(undoButton);

                            return tick();
                        })
                        .then(() => {
                            expect(getMainArea()).toMatchSnapshot();

                            const state = toolsStore.getTestToolState('scratchpad');
                            expect(state.shapes).toHaveLength(0);
                            expect(state).toMatchSnapshot();

                            done();
                        });
                })
                .init();
        }));

    it('goes to next saved canvas state on redo', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            expect.assertions(7);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                })
                .on('renderitem', () => {
                    expect(toolsStore.getTestToolState('scratchpad')).toEqual({ visible: true });

                    runner.trigger('toolbaraction', 'scratchpad');
                    tick()
                        .then(() => {
                            expect(getMainArea()).toMatchSnapshot();
                            const rectToolButton = container.querySelector('[data-test-id="scratchpadTool-rectangle"]');
                            fireEvent.mouseDown(rectToolButton, { buttons: 1 });
                            fireEvent.mouseUp(rectToolButton);

                            const svg = container.querySelector('.scratchpad-container>svg');
                            fireEvent.mouseDown(svg, { clientX: 50, clientY: 50, buttons: 1 });
                            fireEvent.mouseMove(window, { clientX: 100, clientY: 100, buttons: 1 });
                            fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });

                            return tick();
                        })
                        .then(() => {
                            const undoButton = container.querySelector('.draggable-modal button[title="undo"]');
                            expect(undoButton).toBeEnabled();
                            fireEvent.click(undoButton);

                            return tick();
                        })
                        .then(() => {
                            const redoButton = container.querySelector('.draggable-modal button[title="redo"]');
                            expect(redoButton).toBeEnabled();
                            fireEvent.click(redoButton);

                            return tick();
                        })
                        .then(() => {
                            expect(getMainArea()).toMatchSnapshot();

                            const state = toolsStore.getTestToolState('scratchpad');
                            expect(state.shapes).toHaveLength(1);
                            expect(state).toMatchSnapshot();

                            done();
                        });
                })
                .init();
        }));

    it('flushes next saved canvas states if change was made', () =>
        new Promise(done => {
            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            expect.assertions(9);

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    loadItem(runner, 'item1');
                })
                .on('renderitem', () => {
                    expect(toolsStore.getTestToolState('scratchpad')).toEqual({ visible: true });

                    runner.trigger('toolbaraction', 'scratchpad');
                    tick()
                        .then(() => {
                            expect(getMainArea()).toMatchSnapshot();
                            expect(toolsStore.getTestToolState('scratchpad').open).toBe(true);
                            const rectToolButton = container.querySelector('[data-test-id="scratchpadTool-rectangle"]');
                            fireEvent.mouseDown(rectToolButton, { buttons: 1 });
                            fireEvent.mouseUp(rectToolButton);

                            const svg = container.querySelector('.scratchpad-container>svg');
                            fireEvent.mouseDown(svg, { clientX: 50, clientY: 50, buttons: 1 });
                            fireEvent.mouseMove(window, { clientX: 100, clientY: 100, buttons: 1 });
                            fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });

                            return tick();
                        })
                        .then(() => {
                            const svg = container.querySelector('.scratchpad-container>svg');
                            fireEvent.mouseDown(svg, { clientX: 30, clientY: 30, buttons: 1 });
                            fireEvent.mouseMove(window, { clientX: 200, clientY: 200, buttons: 1 });
                            fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

                            return tick();
                        })
                        .then(() => {
                            const undoButton = container.querySelector('.draggable-modal button[title="undo"]');
                            expect(undoButton).toBeEnabled();
                            fireEvent.click(undoButton);

                            return tick();
                        })
                        .then(() => {
                            const redoButton = container.querySelector('.draggable-modal button[title="redo"]');
                            expect(redoButton).toBeEnabled();

                            const svg = container.querySelector('.scratchpad-container>svg');
                            fireEvent.mouseDown(svg, { clientX: 30, clientY: 30, buttons: 1 });
                            fireEvent.mouseMove(window, { clientX: 200, clientY: 200, buttons: 1 });
                            fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

                            return tick();
                        })
                        .then(() => {
                            const redoButton = container.querySelector('.draggable-modal button[title="redo"]');
                            expect(redoButton).toBeDisabled();
                            expect(getMainArea()).toMatchSnapshot();

                            const state = toolsStore.getTestToolState('scratchpad');
                            expect(state.shapes).toHaveLength(2);
                            expect(state).toMatchSnapshot();

                            done();
                        });
                })
                .init();
        }));
});
