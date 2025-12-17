// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
vi.mock('module');

import { tick } from 'svelte';
import { fireEvent } from '@testing-library/svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import proxyFactory from 'taoTests/runner/proxy.js';
import { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import preset from './testStoreMocks/presetOneSectionNonLinear.json';
import { testSessionStatus } from '../../../../session/sessionStates';
vi.mock('resize-observer-polyfill');

function setupLayout() {
    const div = document.createElement('div');
    div.innerHTML = `
        <nav aria-hidden="true"></nav>
        <div class="overlay">
            <div id="overlay-header"></div>
            <div id="overlay-content"></div>
            <div id="overlay-footer"></div>
        </div>`;
    return div;
}

const serviceCallId = 'test-session-plswrk';

function setupStore(testServiceCallId, data) {
    const stateStore = getTestStateStore(testServiceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
}

function expectNavEnabled(nav) {
    expect(nav.querySelectorAll('button:disabled').length).toBe(0);
}

function expectNavDisabled(nav) {
    expect(nav.querySelectorAll('button:disabled').length).toBeGreaterThan(0);
}

describe('navigator plugin', () => {
    let container;
    let getContainer;
    let getNavigationArea;
    let getOverlayHeaderArea;
    let getOverlayContentArea;
    let getOverlayFooterArea;
    let clearAreasContent;
    let testProviderApi;
    let statusStore;

    //plugin relies on test-runner to set status
    const enableItemSpy = vi.fn().mockImplementation(() => {
        statusStore.set(testSessionStatus.interacting);
        Promise.resolve();
    });
    const jumpSpy = vi.fn().mockImplementation(() => {
        statusStore.set(testSessionStatus.loading);
        Promise.resolve();
    });
    const nextSpy = vi.fn().mockImplementation(() => {
        statusStore.set(testSessionStatus.loading);
        Promise.resolve();
    });
    const skipSpy = vi.fn().mockImplementation(() => {
        statusStore.set(testSessionStatus.loading);
        Promise.resolve();
    });
    const disableItemSpy = vi.fn().mockResolvedValue();

    beforeEach(() => {
        enableItemSpy.mockClear();
        disableItemSpy.mockClear();
        jumpSpy.mockClear();
        nextSpy.mockClear();
        skipSpy.mockClear();

        container = setupLayout();

        getContainer = () => container;
        getNavigationArea = () => container.querySelector('nav');
        getOverlayHeaderArea = () => container.querySelector('#overlay-header');
        getOverlayContentArea = () => container.querySelector('#overlay-content');
        getOverlayFooterArea = () => container.querySelector('#overlay-footer');
        clearAreasContent = () => {
            getOverlayHeaderArea().innerHTML = '';
            getOverlayContentArea().innerHTML = '';
            getOverlayFooterArea().innerHTML = '';
        };

        testProviderApi = {
            loadAreaBroker() {
                return {
                    getContainer,
                    getNavigationArea,
                    getOverlayHeaderArea,
                    getOverlayContentArea,
                    getOverlayFooterArea,
                    clearAreasContent
                };
            },
            loadDataHolder() {
                return getTestStateStore(serviceCallId);
            },
            enableItem: enableItemSpy,
            disableItem: disableItemSpy,
            jump: jumpSpy,
            next: nextSpy,
            skip: skipSpy,
            init() {}
        };
        testRunnerFactory.registerProvider('foo', testProviderApi);

        setupStore(serviceCallId, Object.assign({}, preset));
        statusStore = getTestSessionStatusStore(serviceCallId);
    });

    afterEach(() => {
        testRunnerFactory.clearProviders();
        container.innerHTML = '';
        statusStore.clear();
    });

    it('renders and destroys without error', () =>
        new Promise(done => {
            expect.assertions(5);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', error => {
                    throw error;
                })
                .on('render', () => {
                    expect(container).toMatchSnapshot();
                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(getNavigationArea()).toBeEmptyDOMElement();
                    expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                    expect(getOverlayContentArea()).toBeEmptyDOMElement();
                    expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                    done();
                })
                .init();
        }));

    it('disables and enables nav on events', () =>
        new Promise(done => {
            expect.assertions(17);

            const nav = getNavigationArea();

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            runner
                .on('error', error => {
                    throw error;
                })
                .on('ready', () => {
                    expectNavDisabled(nav);
                    runner.loadItem('item4');
                })
                .on('renderitem', () => {
                    expectNavDisabled(nav);

                    runner.trigger('enablenav');
                    tick()
                        .then(tick)
                        // basic events without param
                        .then(() => {
                            expectNavEnabled(nav);
                            runner.trigger('disablenav');
                            return tick();
                        })
                        .then(() => {
                            expectNavDisabled(nav);
                            runner.trigger('enablenav');
                            return tick();
                        })
                        // events with typical reasons, 1 by 1
                        .then(() => {
                            expectNavEnabled(nav);
                            runner.trigger('disablenav', { reason: 'moving' });
                            return tick();
                        })
                        .then(() => {
                            expectNavDisabled(nav);
                            runner.trigger('disablenav', { reason: 'overlay' });
                            return tick();
                        })
                        .then(() => {
                            expectNavDisabled(nav);
                            runner.trigger('enablenav', { reason: 'moving' });
                            return tick();
                        })
                        .then(() => {
                            expectNavDisabled(nav);
                            runner.trigger('enablenav', { reason: 'overlay' });
                            return tick();
                        })
                        // events adding 2 different reasons, removing all in one go
                        .then(() => {
                            expectNavEnabled(nav);
                            runner.trigger('disablenav', { reason: 'pendingOps' });
                            return tick();
                        })
                        .then(() => {
                            expectNavDisabled(nav);
                            runner.trigger('disablenav', { reason: 'pciControlsNav' });
                            return tick();
                        })
                        .then(() => {
                            expectNavDisabled(nav);
                            runner.trigger('enablenav', { reason: ['pciControlsNav', 'pendingOps', 'moving'] });
                            return tick();
                        })
                        // events with a reason and a key, removing all in one go
                        .then(() => {
                            expectNavEnabled(nav);
                            runner.trigger('disablenav', { reason: 'pendingOps', key: 'foo' });
                            return tick();
                        })
                        .then(() => {
                            expectNavDisabled(nav);
                            runner.trigger('disablenav', { reason: 'pendingOps', key: 'bar' });
                            return tick();
                        })
                        .then(() => {
                            expectNavDisabled(nav);
                            runner.trigger('enablenav', { reason: 'pendingOps' });
                            return tick();
                        })
                        // event with reason, forceful removal
                        .then(() => {
                            expectNavEnabled(nav);
                            runner.trigger('disablenav', { reason: 'guidedNav' });
                            return tick();
                        })
                        .then(() => {
                            expectNavDisabled(nav);
                            runner.trigger('enablenav', { force: true });
                            return tick();
                        })
                        .then(() => {
                            expectNavEnabled(nav);
                            done();
                        });
                })
                .init();
        }));

    it('opens and closes overview on events from own components', () =>
        new Promise(done => {
            expect.assertions(10);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                renderTo: container,
                serviceCallId
            });

            const nav = container.querySelector('nav');

            runner
                .on('error', error => {
                    throw error;
                })
                .on('ready', () => {
                    runner.loadItem('item2');
                })
                .on('renderitem', () => {
                    runner.off('renderitem');

                    expect(statusStore.get()).not.toBe('overlay');
                    expect(nav.getAttribute('aria-hidden')).toBeNull();

                    const overviewButton = getContainer().querySelector('button[name="overview"]');
                    fireEvent.click(overviewButton); //= testNavigator.dispatch('overview')
                })
                .after('disableitem.test', () => {
                    runner.off('disableitem.test');

                    tick().then(() => {
                        expect(disableItemSpy).toBeCalledWith('item2');
                        expect(statusStore.get()).toBe('overlay');
                        expect(nav.getAttribute('aria-hidden')).toBe('true');
                        expect(container).toMatchSnapshot();

                        const closeButton = getContainer().querySelector('#overlay-header button');
                        fireEvent.click(closeButton); //= testOverview.dispatch('close')
                    });
                })
                .after('enableitem.test', () => {
                    expect(enableItemSpy).toBeCalledWith('item2');

                    tick().then(() => {
                        //statusStore value is updated by runner implementation, so we can't check here that status is not 'overlay' (because runner is mocked)
                        expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                        expect(getOverlayContentArea()).toBeEmptyDOMElement();
                        expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                        done();
                    });
                })
                .init();
        }));

    it('opens overview on event from host', () =>
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
                    runner.off('renderitem');

                    expect(statusStore.get()).not.toBe('overlay');

                    runner.trigger('open-overview');
                })
                .after('disableitem.test', () => {
                    runner.off('disableitem.test');

                    tick().then(() => {
                        expect(disableItemSpy).toBeCalledWith('item2');
                        expect(statusStore.get()).toBe('overlay');
                        expect(container).toMatchSnapshot();
                        done();
                    });
                })
                .init();
        }));

    it('disables and enables overview on events', () =>
        new Promise(done => {
            expect.assertions(7);

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
                    runner.off('renderitem');
                    const overviewButton = getContainer().querySelector('button[name="overview"]');
                    fireEvent.click(overviewButton);
                })
                .after('disableitem.test', () => {
                    runner.off('disableitem.test');
                    tick()
                        .then(() => {
                            expect(statusStore.get()).toBe('overlay');
                            expect(getOverlayContentArea().querySelectorAll('button:disabled').length).toBe(0);
                            expect(getOverlayFooterArea().querySelectorAll('button:disabled').length).toBe(0);

                            runner.trigger('disablenav');
                            return tick();
                        })
                        .then(() => {
                            expect(getOverlayContentArea().querySelectorAll('button:disabled').length).toBeGreaterThan(
                                0
                            );
                            expect(getOverlayFooterArea().querySelectorAll('button:disabled').length).toBeGreaterThan(
                                0
                            );

                            runner.trigger('enablenav');
                            return tick();
                        })
                        .then(() => {
                            expect(getOverlayContentArea().querySelectorAll('button:disabled').length).toBe(0);
                            expect(getOverlayFooterArea().querySelectorAll('button:disabled').length).toBe(0);
                            done();
                        });
                })
                .init();
        }));

    it('jumps on events from overview component', () =>
        new Promise(done => {
            expect.assertions(6);

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
                    runner.off('renderitem');

                    const overviewButton = getContainer().querySelector('button[name="overview"]');
                    fireEvent.click(overviewButton); //= testNavigator.dispatch('overview')
                })
                .after('disableitem.test', () => {
                    runner.off('disableitem.test');

                    tick()
                        .then(tick)
                        .then(() => {
                            expect(statusStore.get()).toBe(testSessionStatus.overlay);
                            // click another item
                            const jumpOverviewButtons = getContainer().querySelectorAll(
                                '.overview .tabpanel:first-child .step'
                            );
                            const jumpToOtherOverviewButton = jumpOverviewButtons.item(2);
                            fireEvent.click(jumpToOtherOverviewButton); //= testOverviewContent.dispatch('move', {position: 2})

                            expect(jumpSpy).toBeCalledTimes(1);
                            expect(jumpSpy).toBeCalledWith(2, void 0);
                            tick().then(() => {
                                //= overview was closed
                                //statusStore value is updated by runner implementation, so we can't check here that status is not 'overlay' (because runner is mocked)
                                expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                                expect(getOverlayContentArea()).toBeEmptyDOMElement();
                                expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                                done();
                            });
                        });
                })
                .init();
        }));

    it('submits item and moves to next testPart from overview component submit button', () =>
        new Promise(done => {
            expect.assertions(6);

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
                    runner.off('renderitem');

                    const overviewButton = getContainer().querySelector('button[name="overview"]');
                    fireEvent.click(overviewButton);
                })
                .after('disableitem', () => {
                    runner.off('disableitem');

                    tick()
                        .then(tick)
                        .then(() => {
                            expect(statusStore.get()).toBe(testSessionStatus.overlay);
                            const submitOverviewButton = getContainer().querySelector('button[name="overview-submit"]');
                            fireEvent.click(submitOverviewButton);

                            expect(nextSpy).toBeCalledTimes(1);
                            expect(nextSpy).toBeCalledWith('testPart');
                            tick().then(() => {
                                //= overview was closed
                                //statusStore value is updated by runner implementation, so we can't check here that status is not 'overlay' (because runner is mocked)
                                expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                                expect(getOverlayContentArea()).toBeEmptyDOMElement();
                                expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                                done();
                            });
                        });
                })
                .init();
        }));

    it('skips to next testPart from overview component submit button', () =>
        new Promise(done => {
            expect.assertions(3);

            const stateStore = getTestStateStore(serviceCallId);
            stateStore.setTestContext({
                ...preset.testContext,
                remainingAttempts: 1,
            });

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
                    runner.off('renderitem');

                    const overviewButton = getContainer().querySelector('button[name="overview"]');
                    fireEvent.click(overviewButton);
                })
                .after('disableitem', () => {
                    runner.off('disableitem');

                    tick()
                        .then(tick)
                        .then(() => {
                            expect(statusStore.get()).toBe(testSessionStatus.overlay);
                            const submitOverviewButton = getContainer().querySelector('button[name="overview-submit"]');
                            fireEvent.click(submitOverviewButton);

                            expect(skipSpy).toBeCalledTimes(1);
                            expect(skipSpy.mock.calls[0]).toEqual(['testPart', 'next', void 0]);
                            done();
                        });
                })
                .init();
        }));

    it('closes overview instead of navigating to current item', () =>
        new Promise(done => {
            expect.assertions(1);

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
                    runner.off('renderitem');

                    const overviewButton = getContainer().querySelector('button[name="overview"]');
                    fireEvent.click(overviewButton); //= testNavigator.dispatch('overview')
                })
                .on('disableitem', () => {
                    runner.off('disableitem');

                    tick()
                        .then(tick)
                        .then(() => {
                            // click current item
                            const jumpOverviewButtons = getContainer().querySelectorAll(
                                '.overview .tabpanel:first-child .step'
                            );
                            const jumpToCurrentOverviewButton = jumpOverviewButtons.item(1);
                            fireEvent.click(jumpToCurrentOverviewButton); //= testOverviewContent.dispatch('move', {position: 1})

                            expect(jumpSpy).not.toHaveBeenCalled();
                            jumpSpy.mockClear();
                        });
                })
                .on('enableitem', () => {
                    //= overview was closed
                    done();
                })
                .init();
        }));

    it('bookmarks current item on event from own components', () =>
        new Promise(done => {
            expect.assertions(10);

            const stateStore = getTestStateStore(serviceCallId);

            let resolveCallTestAction;
            const proxyCallTestAction = vi.fn(
                () =>
                    new Promise(resolve => {
                        resolveCallTestAction = resolve;
                    })
            );
            proxyFactory.registerProvider('foo', {
                init: () => {},
                callTestAction: proxyCallTestAction
            });
            testRunnerFactory.registerProvider(
                'fooWithProxy',
                Object.assign({}, testProviderApi, {
                    loadProxy() {
                        return proxyFactory('foo', {});
                    },
                    renderItem() {
                        this.trigger('enablenav');
                    },
                    init() {
                        return this.getProxy().init();
                    }
                })
            );

            const runnerWithProxy = testRunnerFactory('fooWithProxy', [pluginFactory], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runnerWithProxy
                .on('error', error => {
                    throw error;
                })
                .on('ready', () => {
                    runnerWithProxy.loadItem('item2');
                })
                .on('renderitem', () => {
                    runnerWithProxy.off('renderitem');

                    tick().then(() => {
                        const bookmarkButton = getNavigationArea().querySelector('button[name="bookmark"]');
                        expect(bookmarkButton).not.toHaveClass('visually-disabled');
                        expect(bookmarkButton.disabled).toBe(false);

                        fireEvent.click(bookmarkButton); //= testNavigator.dispatch('bookmark')

                        tick().then(() => {
                            expect(bookmarkButton).toHaveClass('visually-disabled');
                            expect(bookmarkButton.disabled).toBe(false);
                            expect(
                                stateStore.getTestMap().parts['testPart-1'].sections['assessmentSection-1'].items[
                                    'item2'
                                ].flagged
                            ).toBe(false);

                            resolveCallTestAction();

                            expect(proxyCallTestAction).toHaveBeenCalledWith(
                                'flagItem',
                                {
                                    position: '1',
                                    flag: true
                                },
                                void 0
                            );
                            new Promise(resolve => setTimeout(resolve, 100)).then(() => {
                                //wait for promise chain to finish
                                expect(bookmarkButton).not.toHaveClass('visually-disabled');
                                expect(bookmarkButton.disabled).toBe(false);
                                expect(
                                    stateStore.getTestMap().parts['testPart-1'].sections['assessmentSection-1'].items[
                                        'item2'
                                    ].flagged
                                ).toBe(true);
                                expect(proxyCallTestAction).toHaveBeenCalledTimes(1);

                                done();
                            });
                        });
                    });
                })
                .init();
        }));

    it('triggers runner error if bookmark proxy request fails', () =>
        new Promise(done => {
            proxyFactory.registerProvider('foo', {
                init: () => {},
                callTestAction: action =>
                    new Promise(() => {
                        if (action === 'flagItem') {
                            throw new Error('error-spy-for-flagItem');
                        }
                    })
            });
            testRunnerFactory.registerProvider(
                'fooWithProxy',
                Object.assign({}, testProviderApi, {
                    loadProxy() {
                        return proxyFactory('foo', {});
                    },
                    renderItem() {
                        this.trigger('enablenav');
                    },
                    init() {
                        return this.getProxy().init();
                    }
                })
            );
            const runnerWithProxy = testRunnerFactory('fooWithProxy', [pluginFactory], {
                serviceCallId,
                proxy: 'foo',
                renderTo: container
            });

            runnerWithProxy
                .on('error', error => {
                    throw error;
                })
                .on('ready', () => {
                    expect(runnerWithProxy.getState('ready')).toBe(true);
                    runnerWithProxy.loadItem('item2');
                })
                .on('renderitem', () => {
                    runnerWithProxy
                        .off('renderitem')
                        .off('error')
                        .on('error', error => {
                            if (error.message === 'error-spy-for-flagItem') {
                                done();
                            } else {
                                throw error;
                            }
                        });

                    tick().then(() => {
                        const bookmarkButton = getNavigationArea().querySelector('button[name="bookmark"]');
                        fireEvent.click(bookmarkButton); //= testNavigator.dispatch('bookmark')
                    });
                })
                .init();
        }));

    it('skips to next item on events from own components', () =>
        new Promise(done => {
            expect.assertions(2);

            testRunnerFactory.registerProvider(
                'fooskip',
                Object.assign({}, testProviderApi, {
                    skip(scope, direction) {
                        expect(scope).toBe(void 0);
                        expect(direction).toBe('next');
                        return Promise.resolve();
                    }
                })
            );
            const runner = testRunnerFactory('fooskip', [pluginFactory], {
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
                    const skipButton = getNavigationArea().querySelector('button[name="skip"]');
                    fireEvent.click(skipButton); //= testNavigator.dispatch('skip')
                    done();
                })
                .init();
        }));

    it('skips to previous item on events from own components', () =>
        new Promise(done => {
            expect.assertions(2);

            testRunnerFactory.registerProvider(
                'fooskip',
                Object.assign({}, testProviderApi, {
                    skip(scope, direction) {
                        expect(scope).toBe(void 0);
                        expect(direction).toBe('previous');
                        return Promise.resolve();
                    }
                })
            );
            const runner = testRunnerFactory('fooskip', [pluginFactory], {
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
                    const skipButton = getNavigationArea().querySelector('button[name="prev"]');
                    fireEvent.click(skipButton); //= testNavigator.dispatch('skip')
                    done();
                })
                .init();
        }));

    it('skips to other item on events from own components', () =>
        new Promise(done => {
            expect.assertions(3);

            const attemptsPreset = Object.assign({}, preset);
            attemptsPreset.testContext.remainingAttempts = 1;
            setupStore(serviceCallId, attemptsPreset);

            testRunnerFactory.registerProvider(
                'fooskip',
                Object.assign({}, testProviderApi, {
                    skip(scope, direction) {
                        expect(scope).toBe('item');
                        expect(direction).toBe('jump');
                        return Promise.resolve();
                    }
                })
            );
            const runner = testRunnerFactory('fooskip', [pluginFactory], {
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
                    runner.off('renderitem');

                    const overviewButton = getContainer().querySelector('button[name="overview"]');
                    fireEvent.click(overviewButton);
                })
                .after('disableitem.test', () => {
                    runner.off('disableitem.test');

                    tick()
                        .then(tick)
                        .then(() => {
                            expect(statusStore.get()).toBe(testSessionStatus.overlay);
                            // click another item
                            const jumpOverviewButtons = getContainer().querySelectorAll(
                                '.overview .tabpanel:first-child .step'
                            );
                            const jumpToOtherOverviewButton = jumpOverviewButtons.item(2);
                            fireEvent.click(jumpToOtherOverviewButton);
                            done();
                        });
                })
                .init();
        }));
});
