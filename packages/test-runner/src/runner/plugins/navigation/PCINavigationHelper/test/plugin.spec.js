// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import testRunnerFactory from 'taoTests/runner/runner.js';
import pluginFactory from '../plugin.js';
import { getTestStateStore } from '../../../../testsStateStore.js';

describe('PCINavigationHelper plugin', () => {
    let container;
    const serviceCallId = 'test-session-foo';
    let runner;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        const testProviderApi = {
            init() {},
            loadAreaBroker() {
                return {
                    getContentArea() {
                        return container;
                    }
                };
            }
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);

        runner = testRunnerFactory('foo', [pluginFactory], {
            renderTo: container,
            serviceCallId
        });
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(runner.getState('ready')).toBe(true);
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('listens for navigate event', () =>
        new Promise(done => {
            expect.assertions(2);

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                pciContainerSelector: '.qti-customInteraction > div',
                allowedMoves: {
                    next: ['testPart']
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-source"></div>
                        </div>
                    </div>
                `;

                    runner.trigger('renderitem');
                })
                .after('renderitem', () => {
                    const eventSource = container.querySelector('.event-source');
                    const event = new CustomEvent('navigate', {
                        detail: { direction: 'next', scope: 'testPart' },
                        bubbles: true
                    });
                    eventSource.dispatchEvent(event);
                })
                .on('move', (direction, scope) => {
                    expect(direction).toBe('next');
                    expect(scope).toBe('testPart');

                    runner.trigger('unloaditem');
                })
                .after('unloaditem', () => {
                    // listener should be removed in plugin, so no new assertions

                    const eventSource = container.querySelector('.event-source');
                    const event = new CustomEvent('navigate', {
                        detail: { direction: 'next', scope: 'testPart' },
                        bubbles: true
                    });
                    eventSource.dispatchEvent(event); // should not move

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('fires a renderitem event on a PCI', () =>
        new Promise(done => {
            expect.assertions(1);

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                pciContainerSelector: '.qti-customInteraction > div'
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-target"></div>
                        </div>
                    </div>
                `;
                    const eventTarget = container.querySelector('.event-target');
                    eventTarget.addEventListener('renderitem', () => {
                        runner.destroy();
                    });
                    runner.trigger('renderitem');
                })
                .on('destroy', () => {
                    expect(runner.getState('destroy')).toBe(true);
                    done();
                })
                .init();
        }));

    it('does not move when not allowed', () =>
        new Promise(done => {
            expect.assertions(1);

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                pciContainerSelector: '.qti-customInteraction > div',
                allowedMoves: {
                    next: ['testPart']
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-source"></div>
                        </div>
                    </div>
                `;

                    runner.trigger('renderitem');
                })
                .after('renderitem', () => {
                    const eventSource = container.querySelector('.event-source');
                    const event = new CustomEvent('navigate', {
                        detail: { direction: 'next', scope: 'test' },
                        bubbles: true
                    });
                    eventSource.dispatchEvent(event);
                    runner.destroy();
                })
                .on('move', () => {
                    throw new Error('Should not move');
                })
                .on('destroy', () => {
                    expect(runner.getState('destroy')).toBe(true);
                    done();
                })
                .init();
        }));

    it('does not move to previous, when there is no previous item', () =>
        new Promise(done => {
            expect.assertions(1);

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                pciContainerSelector: '.qti-customInteraction > div',
                allowedMoves: {
                    previous: ['item']
                }
            });

            const testStateStore = getTestStateStore(serviceCallId);

            testStateStore.setTestContext({
                testPartId: 'testPartId',
                sectionId: 'sectionId',
                itemIdentifier: 'itemIdentifier'
            });

            testStateStore.setTestMap({
                parts: {
                    testPartId: {
                        position: 0,
                        sections: {
                            sectionId: {
                                items: {
                                    itemIdentifier: {
                                        position: 0
                                    }
                                }
                            }
                        }
                    }
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-source"></div>
                        </div>
                    </div>
                `;

                    runner.trigger('renderitem');
                })
                .after('renderitem', () => {
                    const eventSource = container.querySelector('.event-source');
                    const event = new CustomEvent('navigate', {
                        detail: { direction: 'previous', scope: 'item' },
                        bubbles: true
                    });
                    eventSource.dispatchEvent(event);
                    runner.destroy();
                })
                .on('move', () => {
                    throw new Error('Should not move');
                })
                .on('destroy', () => {
                    expect(runner.getState('destroy')).toBe(true);
                    done();
                })
                .init();
        }));

    it('disables navigation/enables navigation', () =>
        new Promise(done => {
            expect.assertions(2);

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                pciContainerSelector: '.qti-customInteraction > div',
                allowedMoves: {
                    next: ['section']
                }
            });

            let allowMove = false;
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-source"></div>
                        </div>
                    </div>
                `;

                    runner.trigger('renderitem');
                })
                .after('renderitem', () => {
                    const eventSource = container.querySelector('.event-source');
                    const event = new CustomEvent('disableNavigation', {
                        bubbles: true
                    });
                    eventSource.dispatchEvent(event); // 1. disable navigation
                })
                .on('disablenav', () => {
                    // 2. fires disablenav event

                    const eventSource = container.querySelector('.event-source');
                    const navigateEvent = new CustomEvent('navigate', {
                        // 3. try to navigate
                        detail: { direction: 'next', scope: 'section' },
                        bubbles: true
                    });
                    eventSource.dispatchEvent(navigateEvent);

                    const enableEvent = new CustomEvent('enableNavigation', {
                        // 4. enable navigation
                        bubbles: true
                    });

                    eventSource.dispatchEvent(enableEvent);
                })
                .on('enablenav', () => {
                    allowMove = true;

                    const eventSource = container.querySelector('.event-source');
                    const navigateEvent = new CustomEvent('navigate', {
                        // 5. try to navigate
                        detail: { direction: 'next', scope: 'section' },
                        bubbles: true
                    });

                    eventSource.dispatchEvent(navigateEvent);
                })
                .on('move', (direction, scope) => {
                    if (!allowMove) {
                        throw new Error('Should not move');
                    }

                    expect(direction).toBe('next'); // 6. fires move event
                    expect(scope).toBe('section');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('disables navigation/enables navigation with direction', () =>
        new Promise(done => {
            expect.assertions(4);

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                pciContainerSelector: '.qti-customInteraction > div',
                allowedMoves: {
                    next: ['section']
                }
            });

            let allowMove = false;
            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-source"></div>
                        </div>
                    </div>
                `;

                    runner.trigger('renderitem');
                })
                .after('renderitem', () => {
                    const eventSource = container.querySelector('.event-source');
                    const event = new CustomEvent('disableNavigation', {
                        detail: { direction: 'next' },
                        bubbles: true
                    });
                    eventSource.dispatchEvent(event); // 1. disable navigation
                })
                .on('disablenav', e => {
                    expect(e.detail.direction).toBe('next'); // 2. fires disablenav event

                    const eventSource = container.querySelector('.event-source');
                    const navigateEvent = new CustomEvent('navigate', {
                        // 3. try to navigate
                        detail: { direction: 'next', scope: 'section' },
                        bubbles: true
                    });
                    eventSource.dispatchEvent(navigateEvent);

                    const enableEvent = new CustomEvent('enableNavigation', {
                        // 4. enable navigation
                        detail: { direction: 'next' },
                        bubbles: true
                    });

                    eventSource.dispatchEvent(enableEvent);
                })
                .on('enablenav', e => {
                    expect(e.detail.direction).toBe('next');

                    allowMove = true;

                    const eventSource = container.querySelector('.event-source');
                    const navigateEvent = new CustomEvent('navigate', {
                        // 5. try to navigate
                        detail: { direction: 'next', scope: 'section' },
                        bubbles: true
                    });

                    eventSource.dispatchEvent(navigateEvent);
                })
                .on('move', (direction, scope) => {
                    if (!allowMove) {
                        throw new Error('Should not move');
                    }

                    expect(direction).toBe('next'); // 6. fires move event
                    expect(scope).toBe('section');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('does not move when PCI prevents event', () =>
        new Promise(done => {
            expect.assertions(6);

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                pciContainerSelector: '.qti-customInteraction > div',
                allowedMoves: {
                    next: ['test']
                }
            });

            let shouldPrevent = true;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-target"></div>
                        </div>
                    </div>
                `;
                    runner.trigger('loaditem');
                })
                .after('loaditem', () => {
                    runner.trigger('renderitem');
                })
                .after('renderitem', () => {
                    const eventTarget = container.querySelector('.event-target');

                    eventTarget.addEventListener('navigation', e => {
                        expect(e.detail.direction).toBe('next');
                        expect(e.detail.scope).toBe('test');
                        if (shouldPrevent) {
                            e.preventDefault();
                        }
                    });

                    // this will be prevented
                    runner.trigger('move', 'next', 'test');

                    // this will not be prevented
                    shouldPrevent = false;
                    runner.trigger('move', 'next', 'test');
                })
                .on('move', (direction, scope) => {
                    if (shouldPrevent) {
                        throw new Error('Should not move');
                    }

                    expect(direction).toBe('next');
                    expect(scope).toBe('test');
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('PCINavigationHelper-beforemove: does not move when PCI prevents event, waits for other plugin handler', () =>
        new Promise(done => {
            expect.assertions(11);

            const beforeMoveCustomEventSpy = vi.fn();

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                pciContainerSelector: '.qti-customInteraction > div',
                allowedMoves: {
                    next: ['test']
                }
            });

            let shouldPrevent = true;
            let otherPluginShouldPrevent = true;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-target"></div>
                        </div>
                    </div>
                `;
                    runner.trigger('loaditem');
                })
                .after('loaditem', () => {
                    runner.trigger('PCINavigationHelper-beforemove-register');
                    runner.trigger('renderitem');
                })
                .after('renderitem', () => {
                    const eventTarget = container.querySelector('.event-target');

                    eventTarget.addEventListener('navigation', e => {
                        expect(e.detail.direction).toBe('next');
                        expect(e.detail.scope).toBe('test');
                        if (shouldPrevent) {
                            e.preventDefault();
                        }
                    });

                    // this will be prevented
                    runner.trigger('move', 'next', 'test', 'dummyRef0');
                    expect(beforeMoveCustomEventSpy).not.toHaveBeenCalled();

                    //this will not be prevented by this plugin,
                    //but will be prevented by external one
                    beforeMoveCustomEventSpy.mockImplementation(() => {
                        runner.trigger('PCINavigationHelper-beforemove-handled', { proceed: false });
                    });
                    shouldPrevent = false;
                    runner.trigger('move', 'next', 'test', 'dummyRef1');

                    expect(beforeMoveCustomEventSpy).toHaveBeenCalledWith({
                        direction: 'next',
                        scope: 'test',
                        ref: 'dummyRef1',
                        event: expect.objectContaining({})
                    });
                    beforeMoveCustomEventSpy.mockReset();

                    //this will not be prevented by this plugin,
                    //and will not be prevented by external one
                    otherPluginShouldPrevent = false;
                    beforeMoveCustomEventSpy.mockImplementation(() => {
                        runner.trigger('PCINavigationHelper-beforemove-handled', { proceed: true });
                    });
                    runner.trigger('move', 'next', 'test', 'dummyRef2');
                })
                .on('move', (direction, scope) => {
                    if (shouldPrevent) {
                        throw new Error('Should not move (this plugin)');
                    }
                    if (otherPluginShouldPrevent) {
                        throw new Error('Should not move (other plugin');
                    }

                    expect(beforeMoveCustomEventSpy).toHaveBeenCalledWith({
                        direction: 'next',
                        scope: 'test',
                        ref: 'dummyRef2',
                        event: expect.objectContaining({})
                    });
                    expect(direction).toBe('next');
                    expect(scope).toBe('test');
                    runner.destroy();
                })
                .on('PCINavigationHelper-beforemove', beforeMoveCustomEventSpy)
                .on('destroy', () => {
                    done();
                })
                .init()
                .trigger('PCINavigationHelper-beforemove-register');
        }));

    it('does not block navigation on timeout', () =>
        new Promise(done => {
            expect.assertions(4);

            runner.getPluginConfig = () => ({
                qtiItemContainerSelector: '.qti-item',
                pciContainerSelector: '.qti-customInteraction > div',
                allowedMoves: {
                    next: ['item']
                }
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-source"></div>
                        </div>
                    </div>
                `;

                    runner.trigger('renderitem');
                })
                .after('renderitem', () => {
                    const eventSource = container.querySelector('.event-source');
                    const event = new CustomEvent('disableNavigation', {
                        detail: { direction: 'next' },
                        bubbles: true
                    });
                    eventSource.dispatchEvent(event);

                    eventSource.addEventListener('navigation', e => {
                        expect(e.detail.direction).toBe('next');
                        expect(e.detail.scope).toBe('test');
                        e.preventDefault();
                    });

                    runner.trigger('timeout');
                })
                .on('timeout', () => {
                    runner.next('test');
                })
                .on('move', (direction, scope) => {
                    expect(direction).toBe('next');
                    expect(scope).toBe('test');
                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));

    it('re-renders and destroys without error', () =>
        new Promise(done => {
            expect.assertions(2);

            let onRenderCallback;

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    runner.itemRunner = {
                        on(event, callback) {
                            if (event === 'render') {
                                onRenderCallback = callback;
                            }
                        }
                    };
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-source"></div>
                        </div>
                    </div>
                `;

                    runner.trigger('renderitem');
                })
                .after('renderitem', () => {
                    // updating DOM
                    container.innerHTML = `
                    <div class="qti-item">
                        <div class="qti-customInteraction">
                            <div class="event-source"></div>
                        </div>
                    </div>
                `;
                    onRenderCallback(); // emulates re-render event
                    const eventSource = container.querySelector('.event-source');
                    const event = new CustomEvent('navigate', {
                        detail: { direction: 'next', scope: 'testPart' },
                        bubbles: true
                    });
                    eventSource.dispatchEvent(event);
                })
                .on('move', (direction, scope) => {
                    expect(direction).toBe('next'); // checking the event listeners are working still
                    expect(scope).toBe('testPart');

                    runner.destroy();
                })
                .on('destroy', () => {
                    done();
                })
                .init();
        }));
});
