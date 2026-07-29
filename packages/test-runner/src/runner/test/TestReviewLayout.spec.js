// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { get } from 'svelte/store';
import { render, fireEvent } from '@testing-library/svelte';
import TestReviewLayout from '../TestReviewLayout.svelte';
import { getTestSessionStatusStore } from '../testsStateStore.js';
import { screenSize } from '../screenSizeStore.js';
import { testSessionStatus } from '../session/sessionStates.js';

function resizeWindow(x, y) {
    window.innerWidth = x;
    window.innerHeight = y;
    window.dispatchEvent(new Event('resize'));
}

describe('TestReviewLayout', () => {
    const serviceCallId = 'test-session-123654';
    const statusStore = getTestSessionStatusStore(serviceCallId);

    beforeEach(() => {
        statusStore.set(testSessionStatus.interacting);
    });

    afterEach(() => {
        resizeWindow(1024, 768);
        screenSize.set({ unknown: true });
    });

    it('fails without a serviceCallId', () => {
        expect(() => render(TestReviewLayout, { props: {} })).toThrow(TypeError);
    });

    it('renders correctly with a serviceCallId', () => {
        const { container } = render(TestReviewLayout, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('mounts with the main areas', () =>
        new Promise(done => {
            const { component } = render(TestReviewLayout, {
                props: {
                    serviceCallId
                }
            });
            component.$on('mount', e => {
                expect(e.detail.areas).toMatchSnapshot();
                done();
            });
        }));

    it('updates based on the test runner status', () => {
        const { container } = render(TestReviewLayout, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();

        statusStore.set(testSessionStatus.loading);

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders item content over the Transition layout on rendering', () => {
        const { container } = render(TestReviewLayout, {
            props: {
                serviceCallId
            }
        });
        const itemElement = container.querySelector('.qti-item-container');
        statusStore.set('loading');

        return tick()
            .then(() => {
                expect(itemElement.querySelector('.hidden-item-container')).toBeInTheDocument();
                statusStore.set('interacting');
                return tick();
            })
            .then(() => {
                expect(itemElement.querySelector('.hidden-item-container')).not.toBeInTheDocument();
            });
    });

    it('hides HeaderBar if sessionStatus overview and mobile screen', () => {
        resizeWindow(760, 768);

        statusStore.set('overlay');

        const { container, unmount } = render(TestReviewLayout, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            const headerBarContainer = container.querySelector('#test-top-bar').firstChild;
            expect(headerBarContainer.classList.contains('hidden')).toBe(true);

            resizeWindow(780);
            return tick().then(() => {
                expect(headerBarContainer.classList.contains('hidden')).toBe(false);
                unmount(); //stop listening to window resize event immediately
            });
        });
    });

    it('sets screenSizeStore value', () => {
        resizeWindow(760, 768);
        expect(get(screenSize)).toStrictEqual({ unknown: true });

        render(TestReviewLayout, {
            props: {
                serviceCallId
            }
        });

        expect(get(screenSize)).toStrictEqual({ mobile: true, mobileLandscape: true });
        resizeWindow(1300, 768);

        return tick().then(() => {
            expect(get(screenSize)).toStrictEqual({ desktop: true });
        });
    });

    it('tab dispatches event with active tab name', () => {
        const onClick = vi.fn();
        const { component, container } = render(TestReviewLayout, {
            props: {
                serviceCallId,
                showResponse: true
            }
        });

        component.$on('changeResponseDisplay', onClick);

        const tabButton = container.querySelector('[role="tablist"] button[aria-selected="false"]');
        fireEvent.click(tabButton);

        return tick().then(() => {
            expect(onClick).toHaveBeenCalled();
            expect(onClick.mock.calls[0][0].detail.displayName).toBe('question');
        });
    });

    test.each([
        [true, true, true, 'answer'],
        [true, false, true, 'answer'],
        [false, true, true, 'question'],
        [false, false, true, 'question'],
        [true, true, false, 'answer'],
        [true, false, false, 'answer'],
        [false, true, false, 'correct']
    ])(
        'renders correctly when showResponse: %s, showCorrect: %s, showQuestion: %s',
        (showResponse, showCorrect, showQuestion, activeTab) => {
            const { component, container } = render(TestReviewLayout, {
                props: {
                    serviceCallId,
                    showResponse,
                    showCorrect,
                    showQuestion
                }
            });

            expect(component.getResponseDisplay()).toBe(activeTab);
            expect(container.querySelector('[role="tablist"]')).toMatchSnapshot();
        }
    );

    it('renders "Answers" tab if allItemsMode: true', () => {
        const { component, container } = render(TestReviewLayout, {
            props: {
                serviceCallId,
                showResponse: true,
                showQuestion: false,
                allItemsMode: true
            }
        });

        expect(component.getResponseDisplay()).toBe('answer');
        expect(container.querySelector('[role="tab"]')).toHaveTextContent('Answers');
    });

    test.each([
        [1, 2, true, false],
        [0, 8, true, false],
        [4, 0, true, false],
        [1, 2, false, false],
        [null, 2, true, true],
        [null, 2, false, true]
    ])(
        'renders scores correctly on answer tab (score: %d, maxScore: %d, showScore: %s, waitingForExternalScore: %s)',
        (score, maxScore, showScore, waitingForExternalScore) => {
            const { container } = render(TestReviewLayout, {
                props: {
                    serviceCallId,
                    showResponse: true,
                    showScore,
                    score,
                    maxScore,
                    waitingForExternalScore
                }
            });
            expect(container.querySelectorAll('[role="tablist"] button')[1]).toMatchSnapshot();

            expect(!!container.querySelector('.qti-item-container .inline-notification:not(.hidden)')).toBe(
                showScore && waitingForExternalScore
            );
        }
    );

    it('if waitingForExternalScore, renders inline notification on answer tab', () => {
        const { container } = render(TestReviewLayout, {
            props: {
                serviceCallId,
                showResponse: true,
                showCorrect: true,
                showScore: true,
                score: null,
                maxScore: 2,
                waitingForExternalScore: true
            }
        });
        const getQuestionTabButton = () => container.querySelectorAll('[role="tablist"] button')[0];
        const getAnswerTabButton = () => container.querySelectorAll('[role="tablist"] button')[1];
        const getCorrectTabButton = () => container.querySelectorAll('[role="tablist"] button')[2];

        expect(getAnswerTabButton().getAttribute('aria-current')).toBe('true');
        expect(!!container.querySelector('.qti-item-container .inline-notification:not(.hidden)')).toBe(true);
        expect(container.querySelector('.qti-item-container')).toMatchSnapshot();

        getQuestionTabButton().click();
        return tick()
            .then(() => {
                expect(getQuestionTabButton().getAttribute('aria-current')).toBe('true');
                expect(!!container.querySelector('.qti-item-container .inline-notification:not(.hidden)')).toBe(false);

                getCorrectTabButton().click();
                return tick();
            })
            .then(() => {
                expect(getCorrectTabButton().getAttribute('aria-current')).toBe('true');
                expect(!!container.querySelector('.qti-item-container .inline-notification:not(.hidden)')).toBe(false);
            });
    });

    it('renders scorer overall comment on answer tab', () => {
        const { container } = render(TestReviewLayout, {
            props: {
                serviceCallId,
                showResponse: true,
                scoringData: {
                    comments: {
                        overall: {
                            content:
                                'Your answer receives partial credit because you correctly matched 1 planet with its moon.\nSecond line.'
                        }
                    }
                }
            }
        });
        expect(container.querySelectorAll('.scorer-comments-overall').length).toBe(1);
        expect(container.querySelector('.scorer-comments-overall')).toMatchSnapshot();
    });

    it('hides menu button based on the theme', () => {
        const { container } = render(TestReviewLayout, {
            props: {
                serviceCallId,
                theme: {
                    hideMenuButton: true
                }
            }
        });
        expect(container.querySelector('.headerbar')).toMatchSnapshot();
    });
});
