// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
vi.mock('module');

import { tick } from 'svelte';
import { fireEvent } from '@testing-library/svelte';
import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore.js';
import preset from '../../navigator/test/testStoreMocks/presetOneSectionNonLinear.json';
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

function setupStore(serviceCallId, data) {
    const stateStore = getTestStateStore(serviceCallId);
    stateStore.setTestMap(data.testMap);
    stateStore.setTestContext(data.testContext);
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
    const serviceCallId = 'test-session-plswrk';

    const enableItemSpy = vi.fn().mockResolvedValue();
    const disableItemSpy = vi.fn().mockResolvedValue();
    const jumpSpy = vi.fn().mockResolvedValue();
    const skipSpy = vi.fn().mockResolvedValue();
    const finishSpy = vi.fn().mockResolvedValue();

    beforeEach(() => {
        enableItemSpy.mockClear();
        disableItemSpy.mockClear();
        jumpSpy.mockClear();
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
            skip: skipSpy,
            finish: finishSpy,
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
            expect.assertions(4);

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
                    //statusStore value is updated by runner implementation, so we can't check here that status is not 'overlay' (because runner is mocked)

                    tick().then(() => {
                        expect(getOverlayHeaderArea()).toBeEmptyDOMElement();
                        expect(getOverlayContentArea()).toBeEmptyDOMElement();
                        expect(getOverlayFooterArea()).toBeEmptyDOMElement();
                        done();
                    });
                })
                .init();
        }));

    it('jumps on events from overview component', () =>
        new Promise(done => {
            expect.assertions(2);

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
                            // click another item
                            const jumpOverviewButtons = getContainer().querySelectorAll(
                                '.overview .tabpanel:first-child .step'
                            );
                            const jumpToOtherOverviewButton = jumpOverviewButtons.item(2);
                            //jumpToOtherOverviewButton.click();
                            fireEvent.click(jumpToOtherOverviewButton); //= testOverviewContent.dispatch('move', {position: 2})

                            expect(jumpSpy).toBeCalledTimes(1);
                            expect(jumpSpy).toBeCalledWith(2, void 0);
                            done();
                        });
                })
                .init();
        }));

    it('finishes on events from overview component', () =>
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
                .after('disableitem.test', () => {
                    runner.off('disableitem.test');

                    tick()
                        .then(tick)
                        .then(() => {
                            // click another item
                            const finishButton = getContainer().querySelector('button[name="overview-finish"]');
                            fireEvent.click(finishButton);

                            expect(finishSpy).toBeCalledTimes(1);
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

    it('moves to next item on events from own components', () =>
        new Promise(done => {
            expect.assertions(1);

            testRunnerFactory.registerProvider(
                'foonext',
                Object.assign({}, testProviderApi, {
                    next(scope) {
                        expect(scope).toBe('item');
                        return Promise.resolve();
                    }
                })
            );
            const runner = testRunnerFactory('foonext', [pluginFactory], {
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

                    const nextButton = getNavigationArea().querySelector('button[name="next"]');
                    fireEvent.click(nextButton); //= testNavigator.dispatch('next')
                    done();
                })
                .init();
        }));

    it('moves to previous item on events from own components', () =>
        new Promise(done => {
            expect.assertions(1);

            testRunnerFactory.registerProvider(
                'fooprev',
                Object.assign({}, testProviderApi, {
                    previous(scope) {
                        expect(scope).toBe('item');
                        return Promise.resolve();
                    }
                })
            );
            const runner = testRunnerFactory('fooprev', [pluginFactory], {
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

                    const prevButton = getNavigationArea().querySelector('button[name="prev"]');
                    fireEvent.click(prevButton); //= testNavigator.dispatch('prev')
                    done();
                })
                .init();
        }));
});
