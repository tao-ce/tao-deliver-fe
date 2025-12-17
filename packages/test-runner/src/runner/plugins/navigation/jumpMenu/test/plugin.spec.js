// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from '../plugin.js';
import testRunnerFactory from 'taoTests/runner/runner.js';
import { tick } from 'svelte';
import testsStateStore, { getTestSessionStatusStore, getTestStateStore } from '../../../../testsStateStore';
import { testSessionStatus } from '../../../../session/sessionStates';
import { fireEvent } from '@testing-library/svelte';

const testMap = {
    stats: {
        answered: 6,
        flagged: 0,
        questions: 6,
        questionsViewed: 6,
        total: 6,
        viewed: 6
    },
    parts: {
        p1: {
            sections: {
                s1: {
                    items: {
                        i2: {
                            position: 1,
                            answered: false
                        }
                    }
                }
            },
            stats: {
                total: 1
            }
        },
        p2: {
            sections: {
                s1: {
                    items: {
                        i2: {
                            position: 1,
                            answered: false
                        }
                    }
                }
            },
            stats: {
                total: 5
            }
        }
    }
};
const testContext = {
    testPartId: 'p1',
    sectionId: 's1',
    itemIdentifier: 'i2'
};

function getLayout() {
    const layout = document.createElement('div');

    layout.innerHTML = `
        <div id="top-bar-area">
          <div class="headerbar">
              <aside>
                <button></button>
              </aside>
          </div>
        </div>
        <div id="main-area" tabindex="0">
            <aside id="test-content-aside-start"></aside>
            <div class="qti-item-container"></div>
            <div id="a11y-main"></div>
            <aside id="test-content-aside-end"><button>pdf</button></aside>
        </div>
        <div id="navigation"><button></button></div>
        <div id="modalfeedbacknav-area"><button></button></div>
        <div id="overview-area">
            <div class="tabpanel">
                <button class="step">1</button>
            </div>
        </div>
        <div id="jump-menu"></div>`;

    // mock offsetParent because it's always null in jsdom
    [
        layout.querySelector('#top-bar-area .headerbar aside'),
        layout.querySelector('#top-bar-area .headerbar aside button'),
        layout.querySelector('.qti-item-container'),
        layout.querySelector('#main-area'),
        layout.querySelector('#navigation'),
        layout.querySelector('#navigation button'),
        layout.querySelector('#modalfeedbacknav-area'),
        layout.querySelector('#modalfeedbacknav-area button'),
        layout.querySelector('#overview-area'),
        layout.querySelector('#overview-area .tabpanel'),
        layout.querySelector('#overview-area .step'),
        layout.querySelector('#a11y-main'),
        layout.querySelector('#test-content-aside-start'),
        layout.querySelector('#test-content-aside-end'),
        layout.querySelector('#test-content-aside-end button')
    ].forEach(elt => {
        Object.defineProperty(elt, 'offsetParent', {
            value: elt.parentElement
        });
    });

    return layout;
}

describe('jump menu plugin', () => {
    const serviceCallId = 'test-session-xlk0jh';
    let layout;
    let getTopBarArea;
    let getMainArea;
    let getNavigationArea;
    let getJumpMenuArea;
    let getOverlayContentArea;
    let getItemModalFeedbackNavigatorArea;
    let getAsideStartArea;
    let getAsideEndArea;
    let stateStore, statusStore;

    beforeEach(() => {
        layout = getLayout();

        getTopBarArea = vi.fn(() => layout.querySelector('#top-bar-area'));
        getMainArea = vi.fn(() => layout.querySelector('#main-area'));
        getNavigationArea = vi.fn(() => layout.querySelector('#navigation'));
        getJumpMenuArea = vi.fn(() => layout.querySelector('#jump-menu'));
        getOverlayContentArea = vi.fn(() => layout.querySelector('#overview-area'));
        getItemModalFeedbackNavigatorArea = vi.fn(() => layout.querySelector('#modalfeedbacknav-area'));
        getAsideStartArea = vi.fn(() => null);
        getAsideEndArea = vi.fn(() => null);

        document.body.appendChild(layout);

        stateStore = getTestStateStore(serviceCallId);
        statusStore = getTestSessionStatusStore(serviceCallId);

        stateStore.setTestMap(testMap);
        stateStore.setTestContext(testContext);
        statusStore.set(testSessionStatus.interacting);

        testRunnerFactory.registerProvider('foo', {
            loadAreaBroker() {
                return {
                    getTopBarArea,
                    getMainArea,
                    getNavigationArea,
                    getJumpMenuArea,
                    getOverlayContentArea,
                    getItemModalFeedbackNavigatorArea,
                    getAsideStartArea,
                    getAsideEndArea
                };
            },
            init() {}
        });
    });

    afterEach(() => {
        testsStateStore.clear();
    });

    it('renders and destroys', () =>
        new Promise(done => {
            expect.assertions(11);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: layout
            });

            expect(layout).toMatchSnapshot();
            expect(getTopBarArea).not.toHaveBeenCalled();
            expect(getMainArea).not.toHaveBeenCalled();
            expect(getNavigationArea).not.toHaveBeenCalled();
            expect(getJumpMenuArea).not.toHaveBeenCalled();

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect(layout).toMatchSnapshot();
                    expect(getTopBarArea).toHaveBeenCalled();
                    expect(getMainArea).toHaveBeenCalled();
                    expect(getNavigationArea).toHaveBeenCalled();
                    expect(getJumpMenuArea).toHaveBeenCalled();

                    runner.destroy();
                })
                .on('destroy', () => {
                    expect(layout).toMatchSnapshot();
                    done();
                })
                .init();
        }));

    it('renders corresponding to items by status filters', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: layout
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', async () => {
                    expect([...layout.querySelectorAll('#jump-menu li button')].map(btn => btn.dataset.testId)).toEqual(
                        ['jump-toolbox', 'jump-question', 'jump-navigation', 'jump-itemModalFeedback-navigation']
                    );

                    statusStore.set(testSessionStatus.overlay);

                    await tick();
                    await tick();
                    expect([...layout.querySelectorAll('#jump-menu li button')].map(btn => btn.dataset.testId)).toEqual(
                        ['jump-overview']
                    );

                    done();
                })
                .init();
        }));

    it('renders corresponding to items by availability', () =>
        new Promise(done => {
            expect.assertions(1);

            layout.querySelector('#top-bar-area .headerbar aside button').remove();

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: layout
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect([...layout.querySelectorAll('#jump-menu li button')].map(btn => btn.dataset.testId)).toEqual(
                        ['jump-question', 'jump-navigation', 'jump-itemModalFeedback-navigation']
                    );

                    done();
                })
                .init();
        }));

    it('renders additional item if asideStart/asideEnd layout areas present with a focusable child', () =>
        new Promise(done => {
            expect.assertions(1);

            getAsideStartArea.mockReturnValue(layout.querySelector('#test-content-aside-start'));
            getAsideEndArea.mockReturnValue(layout.querySelector('#test-content-aside-end'));

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: layout
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    expect([...layout.querySelectorAll('#jump-menu li button')].map(btn => btn.dataset.testId)).toEqual(
                        ['jump-toolbox', 'jump-question', 'jump-asideEnd', 'jump-navigation', 'jump-itemModalFeedback-navigation']
                    );

                    done();
                })
                .init();
        }));

    it('highlight corresponding element', () =>
        new Promise(done => {
            expect.assertions(3);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: layout
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const toolboxButton = layout.querySelector('#jump-menu li:nth-child(1) button');
                    const questionButton = layout.querySelector('#jump-menu li:nth-child(2) button');

                    fireEvent.focus(toolboxButton);
                    expect(layout.querySelector('#top-bar-area .headerbar aside').classList).toContain(
                        'highlight-area'
                    );

                    fireEvent.focus(questionButton);
                    expect(layout.querySelector('#top-bar-area .headerbar aside').classList).not.toContain(
                        'highlight-area'
                    );
                    expect(layout.querySelector('#main-area .qti-item-container').classList).toContain(
                        'highlight-area'
                    );

                    done();
                })
                .init();
        }));

    it('focus corresponding element', () =>
        new Promise(done => {
            expect.assertions(2);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: layout
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    const toolboxButton = layout.querySelector('#jump-menu li:nth-child(1) button');
                    const questionButton = layout.querySelector('#jump-menu li:nth-child(2) button');
                    const toolboxFocusableElement = layout.querySelector('#top-bar-area .headerbar aside button');
                    const questionFocusableElement = layout.querySelector('#main-area');

                    fireEvent.click(toolboxButton);
                    expect(document.activeElement).toBe(toolboxFocusableElement);

                    fireEvent.click(questionButton);
                    expect(document.activeElement).toBe(questionFocusableElement);

                    done();
                })
                .init();
        }));

    it('labels are correct', () =>
        new Promise(done => {
            expect.assertions(6);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: layout
            });

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', async () => {
                    expect([...layout.querySelectorAll('#jump-menu li button')].map(btn => btn.dataset.testId)).toEqual(
                        ['jump-toolbox', 'jump-question', 'jump-navigation', 'jump-itemModalFeedback-navigation']
                    );

                    const correctLabels = [
                        'Toolbox &amp; Configuration',
                        'Question 2: unanswered',
                        'Test Navigation',
                        'Test Navigation'
                    ];

                    for (let [index, element] of Object.entries(layout.querySelectorAll('#jump-menu li'))) {
                        expect(element.querySelector('button strong').innerHTML).toBe(correctLabels[index]);
                    }
                    tick()
                        .then(() => {
                            statusStore.set(testSessionStatus.overlay);

                            return tick();
                        })
                        .then(() => {
                            expect(
                                layout.querySelectorAll('#jump-menu li')[0]?.querySelector('button strong').innerHTML
                            ).toBe('the overview of all 1 questions');
                            done();
                        });
                })
                .init();
        }));

    it('labels are correct in review mode', () =>
        new Promise(done => {
            expect.assertions(1);

            const runner = testRunnerFactory('foo', [pluginFactory], {
                serviceCallId: serviceCallId,
                renderTo: layout
            });

            const testConfig = runner.getConfig();
            testConfig.options = {
                review: 'review'
            };

            runner
                .on('error', err => {
                    throw err;
                })
                .on('render', () => {
                    tick()
                        .then(() => {
                            statusStore.set(testSessionStatus.overlay);

                            return tick();
                        })
                        .then(() => {
                            expect(
                                layout.querySelectorAll('#jump-menu li')[0]?.querySelector('button strong').innerHTML
                            ).toBe('the overview of all 6 questions');
                            done();
                        });
                })
                .init();
        }));
});
