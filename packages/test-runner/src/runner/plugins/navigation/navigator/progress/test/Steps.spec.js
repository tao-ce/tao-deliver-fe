// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// mock pxToRem function for steps fit calculations
vi.mock('@oat-sa-private/ui-core', async importOriginal => {
    const originalModule = await importOriginal();
    return Object.assign({ __esModule: true }, originalModule, {
        pxToRem: px => parseInt(px, 10) / 8,
        resizeObserver: vi.fn()
    });
});
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import testsStateStore, { getTestStateStore } from '../../../../../testsStateStore.js';
import { getTimersStore, clearAllTimersStores } from '../../../../../timers/timersStore.js';
import Steps from '../Steps.svelte';
import presetOneSection from '../../test/testStoreMocks/presetOneSectionLinear.json';
import presetFourSections from '../../test/testStoreMocks/presetFourSectionsNonLinear.json';
import { resizeObserver as resizeObserverAction } from '@oat-sa-private/ui-core';

const serviceCallIds = {
    counter: 0,
    get() {
        this.counter = this.counter + 1;
        return `serviceCallId_${this.counter}`;
    }
};

const createResizeObserverMock = (widthTrackerWidth, overviewButtonWidth) => {
    resizeObserverAction.mockImplementation((node, options) => {
        const { callback } = options;
        node.getBoundingClientRect = () => ({
            width: node.classList.contains('width-tracker') ? widthTrackerWidth : overviewButtonWidth
        });
        callback({ target: node });

        return {
            destroy() {}
        };
    });
};

describe('Steps component', () => {
    beforeEach(() => {
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => callback());
    });

    afterEach(() => {
        testsStateStore.clear();
        clearAllTimersStores();
        resizeObserverAction.mockReset();
        window.requestAnimationFrame.mockRestore();
    });

    const setupOneSection = serviceCallId => {
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(presetOneSection.testMap);
        stateStore.setTestContext(presetOneSection.testContext);
    };

    const setupFourSections = serviceCallId => {
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(presetFourSections.testMap);
        stateStore.setTestContext(presetFourSections.testContext);
    };

    it('Has to fail rendering with no serviceCallId with error', () => {
        expect(() => {
            render(Steps, { props: {} });
        }).toThrowErrorMatchingSnapshot();
    });

    it('Has to render no steps given too small container width', () => {
        const serviceCallId = serviceCallIds.get();
        setupOneSection(serviceCallId);
        createResizeObserverMock(10, 0);

        expect.assertions(2);

        const { container } = render(Steps, {
            props: {
                serviceCallId
            }
        });
        return tick().then(() => {
            expect(container.getElementsByTagName('li').length).toEqual(0);
            expect(container).toMatchSnapshot();
        });
    });

    it('Has to render 3 steps given enough container width', () => {
        const serviceCallId = serviceCallIds.get();
        setupOneSection(serviceCallId);
        createResizeObserverMock(450, 150);

        expect.assertions(2);

        const { container } = render(Steps, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expect(container.getElementsByTagName('li').length).toEqual(3);
            expect(container).toMatchSnapshot();
        });
    });

    it('Has to render steps depending on overview buttons width', () => {
        const serviceCallId = serviceCallIds.get();
        setupOneSection(serviceCallId);
        createResizeObserverMock(450, 250);
        //In the test case above, `setupOneSection` with `createResizeObserverMock(450, 150)` produces 3 buttons.
        //Here - 1 button.

        expect.assertions(2);

        const { container } = render(Steps, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expect(container.getElementsByTagName('li').length).toEqual(1);
            expect(container.getElementsByClassName('ellipsis-container').length).toBe(1);
        });
    });

    it('Has to render one ordered list for each section with no more buttons if space is enough', () => {
        const serviceCallId = serviceCallIds.get();
        setupFourSections(serviceCallId);
        createResizeObserverMock(3000, 0);

        expect.assertions(3);

        const { container } = render(Steps, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expect(container.getElementsByClassName('ellipsis-container').length).toBe(0);
            expect(container.getElementsByTagName('ol').length).toEqual(4);
            expect(container).toMatchSnapshot();
        });
    });

    it('Has to render clickable more button if space is not enough', () => {
        const serviceCallId = serviceCallIds.get();
        setupFourSections(serviceCallId);
        createResizeObserverMock(300, 0);

        const onMore = e => {
            expect(e instanceof CustomEvent).toEqual(true);
        };

        expect.assertions(3);

        const { component, container } = render(Steps, {
            props: {
                serviceCallId
            }
        });
        component.$on('more', onMore);

        expect(container.getElementsByClassName('ellipsis-container').length).toBeGreaterThan(0);
        expect(container).toMatchSnapshot();

        return fireEvent.click(container.getElementsByClassName('ellipsis-container')[0]);
    });

    it('Gets timers state to show timed-out steps', () => {
        const serviceCallId = serviceCallIds.get();
        setupFourSections(serviceCallId);
        createResizeObserverMock(3000, 0);

        const timersStore = getTimersStore(serviceCallId);
        timersStore.initializeTimers([
            {
                level: 'item',
                id: 'item2',
                timerValue: {
                    timeAssigned: 20000,
                    timeLeft: 0,
                    timeStr: '0s'
                }
            },
            {
                level: 'item',
                id: 'item3',
                timerValue: {
                    timeAssigned: 30000,
                    timeLeft: 15000,
                    timeStr: '10s'
                }
            },
            {
                level: 'section',
                id: 'assessmentSection-2',
                timerValue: {
                    timeAssigned: 40000,
                    timeLeft: 0,
                    timeStr: '0s'
                }
            }
        ]);

        expect.assertions(6);

        const { container } = render(Steps, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            const items = Array.from(container.getElementsByTagName('li'));
            const timerIconMatcher = expect.stringContaining('Timer icon');
            expect(items.length).toBe(20);
            expect(items[0].innerHTML).not.toEqual(timerIconMatcher); //no timer
            expect(items[1].innerHTML).toEqual(timerIconMatcher); //item timed out
            expect(items[2].innerHTML).not.toEqual(timerIconMatcher); //not timed-out
            expect(items[5].innerHTML).toEqual(timerIconMatcher); //section timed-out
            expect(items[6].innerHTML).toEqual(timerIconMatcher); //section timed-out
        });
    });

    it('Has to render disabled buttons when in disabled state', () => {
        const serviceCallId = serviceCallIds.get();
        setupOneSection(serviceCallId);
        createResizeObserverMock(300, 0);

        expect.assertions(1);

        const { container } = render(Steps, {
            props: {
                serviceCallId,
                disabled: true
            }
        });

        expect(container.querySelectorAll('button:disabled').length).toBe(4);
    });

    it('Has to emit "move" event on step click', () => {
        const serviceCallId = serviceCallIds.get();
        setupOneSection(serviceCallId);
        createResizeObserverMock(300, 0);

        expect.assertions(1);

        const onMove = e => {
            expect(e.detail.position).toEqual(2);
        };

        const { component, container } = render(Steps, {
            props: {
                serviceCallId
            }
        });

        component.$on('move', onMove);

        return fireEvent.click(container.getElementsByClassName('step')[2]);
    });

    it('uses provider stepCreator to create steps', () => {
        const serviceCallId = serviceCallIds.get();
        setupOneSection(serviceCallId);
        createResizeObserverMock(300, 0);

        const { container } = render(Steps, {
            props: {
                serviceCallId,
                stepCreator(item, showBookmarkState, viewPosition) {
                    return {
                        key: item.position,
                        state: null,
                        icon: null,
                        label: viewPosition * 3,
                        ariaLabel: `aria-label-${viewPosition}`
                    };
                }
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('disables non viewed item when nonLinearRestricted is true', async () => {
        const serviceCallId = serviceCallIds.get();
        setupFourSections(serviceCallId);
        createResizeObserverMock(3000, 100);

        const { container } = render(Steps, {
            props: {
                serviceCallId,
                nonLinearRestricted: true
            }
        });

        await tick();

        const steps = container.querySelectorAll('.step');
        expect(steps.length).toBe(20);

        // step 0,1 is viewed true; so currently is on step 2, so tep 0,1,2,3 have to be enabled
        expect(steps[0].classList.contains('disabled')).toBe(false);
        expect(steps[1].classList.contains('disabled')).toBe(false);
        expect(steps[2].classList.contains('disabled')).toBe(false);
        expect(steps[3].classList.contains('disabled')).toBe(false);
        expect(steps[4].classList.contains('disabled')).toBe(true);

        // Check that all remaining steps are disabled
        for (let i = 5; i < steps.length; i++) {
            expect(steps[i].classList.contains('disabled')).toBe(true);
        }
    });
});
