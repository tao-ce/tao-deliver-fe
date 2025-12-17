// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import testsStateStore, { getTestStateStore } from '../../../../testsStateStore.js';
import { screenSize } from '../../../../screenSizeStore.js';
import TestNavigator from '../TestNavigator.svelte';
import presetLinear from './testStoreMocks/presetOneSectionLinear.json';
import presetNonLinear from './testStoreMocks/presetFourSectionsNonLinear.json';
import { cloneDeep } from 'lodash';
import { getItemSessionStatusStore } from 'taoQtiNuiItem/runner/itemsSessionStatusStore.js';

vi.mock('resize-observer-polyfill');

const serviceCallIds = {
    counter: 0,
    get() {
        this.counter = this.counter + 1;
        return `serviceCallId_${this.counter}`;
    }
};

const setupLinear = (serviceCallId, total) => {
    const stateStore = getTestStateStore(serviceCallId);
    let preset = cloneDeep(presetLinear);
    if (total) {
        preset.testMap.parts['TP01'].stats.total = total;
    }
    stateStore.setTestMap(preset.testMap);
    stateStore.setTestContext(preset.testContext);
};

const setupNonLinear = (serviceCallId, total) => {
    const stateStore = getTestStateStore(serviceCallId);
    let preset = cloneDeep(presetNonLinear);
    if (total) {
        preset.testMap.parts['testPart-1'].stats.total = total;
    }
    stateStore.setTestMap(preset.testMap);
    stateStore.setTestContext(preset.testContext);
};

const setupAttemptsMode = (serviceCallId, remainingAttempts) => {
    const stateStore = getTestStateStore(serviceCallId);
    let preset = cloneDeep(presetLinear);
    preset.testMap.parts['TP01'].sections['S01'].items['item-1-Yohann'].remainingAttempts = remainingAttempts;
    stateStore.setTestMap(preset.testMap);
    stateStore.setTestContext(preset.testContext);
};

const jumpFactory = serviceCallId => {
    const stateStore = getTestStateStore(serviceCallId);
    const testMap = stateStore.getTestMap();
    const getFirstPart = () => Object.values(testMap.parts)[0];
    const getLastPart = () => Object.values(testMap.parts)[Object.values(testMap.parts).length - 1];
    const getFirstSection = testPart => Object.values(testPart.sections)[0];
    const getLastSection = testPart => Object.values(testPart.sections)[Object.values(testPart.sections).length - 1];
    const getFirstItem = section => Object.values(section.items)[0];
    const getLastItem = section => Object.values(section.items)[Object.values(section.items).length - 1];
    return {
        setFirst() {
            stateStore.setTestContext(
                Object.assign(stateStore.getTestContext(), {
                    itemPosition: getFirstItem(getFirstSection(getFirstPart())).position,
                    itemIdentifier: getFirstItem(getFirstSection(getFirstPart())).id,
                    sectionId: getFirstSection(getFirstPart()).id,
                    testPartId: getFirstPart().id
                })
            );
        },
        setLastInTestPart() {
            stateStore.setTestContext(
                Object.assign(stateStore.getTestContext(), {
                    itemPosition: getLastItem(getLastSection(getFirstPart())).position,
                    itemIdentifier: getLastItem(getLastSection(getFirstPart())).id,
                    sectionId: getLastSection(getFirstPart()).id,
                    testPartId: getFirstPart().id
                })
            );
        },
        setLastInTest() {
            stateStore.setTestContext(
                Object.assign(stateStore.getTestContext(), {
                    itemPosition: getLastItem(getLastSection(getLastPart())).position,
                    itemIdentifier: getLastItem(getLastSection(getLastPart())).id,
                    sectionId: getLastSection(getLastPart()).id,
                    testPartId: getLastPart().id
                })
            );
        }
    };
};

describe('Test navigation', () => {
    afterEach(() => {
        testsStateStore.clear();
        screenSize.set({ unknown: true });
    });

    //RENDERING

    it('Renders without error if testStateStore empty', () => {
        const serviceCallId = serviceCallIds.get();
        const { container } = render(TestNavigator, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('Does render forward button non-last item', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);
        jumpFactory(serviceCallId).setFirst();
        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });
        expect(container.querySelector('[name="next"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    it('Doesnt render forward button last item', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();
        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });
        expect(container.querySelector('[name="next"]')).toBeFalsy();
        expect(container).toMatchSnapshot();
    });

    it('Does render submit button last item in test part (for linear or liteMode)', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();
        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });
        expect(container.querySelector('[name="submit"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    it('Does render finish button last item in test (for linear or liteMode)', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTest();
        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });
        expect(container.querySelector('[name="finish"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    it('Does render prev button for non-linear test non-first item', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();
        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expect(container.querySelector('[name="prev"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    it('Does render bookmark and overview buttons for non-linear test and not-liteMode', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);
        screenSize.set({ desktop: true });

        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });
        expect(container.querySelector('[name="overview"]')).toBeTruthy();
        expect(container.querySelector('[name="bookmark"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
        const firstFocusableElement = container.querySelectorAll('button, input')[0];
        expect(firstFocusableElement.getAttribute('name')).toBe('bookmark');
        screenSize.set({ mobile: true });

        return tick().then(() => {
            expect(container.querySelector('[name="overview"]')).toBeTruthy();
            expect(container.querySelector('[name="bookmark"]')).toBeTruthy();
            expect(container).toMatchSnapshot();
            const firstFocusableElement2 = container.querySelectorAll('button, input')[0];
            expect(firstFocusableElement2.getAttribute('name')).toBe('bookmark');
        });
    });

    it('Does not render bookmark and overview buttons for linear test or liteMode', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);
        screenSize.set({ desktop: true });

        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });
        expect(container.querySelector('[name="overview"]')).toBeFalsy();
        expect(container.querySelector('[name="bookmark"]')).toBeFalsy();

        screenSize.set({ mobile: true });
        return tick().then(() => {
            expect(container.querySelector('[name="overview"]')).toBeFalsy();
            expect(container.querySelector('[name="bookmark"]')).toBeFalsy();
        });
    });

    //EVENTS

    it('Fires testRunner.next on next button click', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setFirst();

        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expect.assertions(1);
        component.$on('move', e => {
            expect(e.detail && e.detail.direction).toEqual('next');
        });
        const nextBtn = container.querySelector('[name="next"]');
        return fireEvent.click(nextBtn);
    });

    it('Fires testRunner.next on finish button click linear test', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();

        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expect.assertions(1);
        component.$on('move', e => {
            expect(e.detail && e.detail.direction).toEqual('next');
        });
        const nextBtn = container.querySelector('[name="finish"]');
        return fireEvent.click(nextBtn);
    });

    it('Fires review event on submit button click non-linear test', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();

        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expect.assertions(1);
        component.$on('review', () => {
            expect(true).toEqual(true);
        });
        const nextBtn = container.querySelector('[name="next"]');
        return fireEvent.click(nextBtn);
    });

    it('Fires next event on submit button click non-linear test in lite mode', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();

        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expect.assertions(1);
        component.$on('move', e => {
            expect(e.detail.direction).toEqual('next');
        });
        const submitBtn = container.querySelector('[name="submit"]');
        return fireEvent.click(submitBtn);
    });

    it('Fires next event on finish button click non-linear test in lite mode', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTest();

        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expect.assertions(1);
        component.$on('move', e => {
            expect(e.detail.direction).toEqual('next');
        });
        const finishBtn = container.querySelector('[name="finish"]');
        return fireEvent.click(finishBtn);
    });

    it('Fires previous event on prev button click', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();

        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expect.assertions(1);
        component.$on('move', e => {
            expect(e.detail.direction).toEqual('previous');
        });
        const prevBtn = container.querySelector('[name="prev"]');
        return fireEvent.click(prevBtn);
    });

    it('Fires bookmark event on bookmark button click', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId
            }
        });

        const bookmarkBtn = container.querySelector('[name="bookmark"]');
        const onBookmark = vi.fn();
        component.$on('bookmark', onBookmark);

        fireEvent.click(bookmarkBtn);
        return tick().then(() => {
            expect(onBookmark).toHaveBeenCalled();
        });
    });

    it('Doesnt fire move event on next btn click while disabled', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setFirst();
        const move = vi.fn();
        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                disabled: true,
                liteMode: false
            }
        });

        expect.assertions(1);
        component.$on('move', move);
        const nextBtn = container.querySelector('[name="next"]');
        return fireEvent.click(nextBtn).then(() => {
            expect(move.mock.calls.length).toEqual(0);
        });
    });

    it('Doesnt fire move event on prev btn and submit click when disabled', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();

        const move = vi.fn();
        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                disabled: true,
                liteMode: true
            }
        });

        expect.assertions(2);
        component.$on('move', move);
        const prevBtn = container.querySelector('[name="prev"]');
        return fireEvent.click(prevBtn).then(() => {
            expect(move.mock.calls.length).toEqual(0);
            const submitBtn = container.querySelector('[name="submit"]');
            return fireEvent.click(submitBtn).then(() => {
                expect(move.mock.calls.length).toEqual(0);
            });
        });
    });

    it('Doesnt fire move event on finish click when disabled', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTest();

        const move = vi.fn();
        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                disabled: true,
                liteMode: false
            }
        });

        expect.assertions(1);
        component.$on('move', move);
        const finishBtn = container.querySelector('[name="finish"]');
        return fireEvent.click(finishBtn).then(() => {
            expect(move.mock.calls.length).toEqual(0);
        });
    });

    it('Doesnt fire bookmark event on bookmark button click when disabled', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                disabled: true
            }
        });

        const bookmarkBtn = container.querySelector('[name="bookmark"]');
        const onBookmark = vi.fn();
        component.$on('bookmark', onBookmark);
        fireEvent.click(bookmarkBtn);

        return tick().then(() => {
            expect(onBookmark).not.toHaveBeenCalled();
        });
    });

    it('Doesnt fire bookmark event on bookmark button click with bookmarkDisabled', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        const { component, container } = render(TestNavigator, {
            props: {
                serviceCallId,
                bookmarkDisabled: true
            }
        });

        const bookmarkBtn = container.querySelector('[name="bookmark"]');
        const onBookmark = vi.fn();
        component.$on('bookmark', onBookmark);
        fireEvent.click(bookmarkBtn);

        return tick().then(() => {
            expect(onBookmark).not.toHaveBeenCalled();
        });
    });
});

describe('Test navigation with attempts', () => {
    afterEach(() => {
        testsStateStore.clear();
        screenSize.set({ unknown: true });
    });

    it('Does render Attempt button when attempts remain', () => {
        const serviceCallId = serviceCallIds.get();
        setupAttemptsMode(serviceCallId, 3);

        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });
        expect(container.querySelector('[name="attempt"]')).toBeTruthy();
        expect(container.querySelector('[name="next"]')).toBeFalsy();
        expect(container.querySelector('[name="skip"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    it('Does render Next button when no attempts remain', () => {
        const serviceCallId = serviceCallIds.get();
        setupAttemptsMode(serviceCallId, 0);

        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });
        expect(container.querySelector('[name="attempt"]')).toBeFalsy();
        expect(container.querySelector('[name="next"]')).toBeTruthy();
        expect(container.querySelector('[name="skip"]')).toBeTruthy();
    });

    it('Changes Attempt button to Next Question, depending on itemSessionStatus', async () => {
        const serviceCallId = serviceCallIds.get();
        setupAttemptsMode(serviceCallId, 1);

        const itemIdentifier = 'item-1';
        const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
        itemSessionStatusStore.set('initial');

        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false,
                itemSessionStatusStore
            }
        });
        itemSessionStatusStore.set('interacting');
        await tick();
        expect(container.querySelector('[name="attempt"]')).toBeTruthy();
        expect(container.querySelector('[name="next"]')).toBeFalsy();
        expect(container.querySelector('[name="skip"]')).toBeTruthy();

        itemSessionStatusStore.set('closed');
        await tick();
        expect(container.querySelector('[name="attempt"]')).toBeFalsy();
        expect(container.querySelector('[name="next"]')).toBeTruthy();
        expect(container.querySelector('[name="skip"]')).toBeTruthy();
    });
});

describe('Test navigation with nonLinearRestricted', () => {
    it('renders navigation with Overview button when nonLinearRestricted is true', () => {
        const serviceCallId = 'test_service_call_id';
        const stateStore = getTestStateStore(serviceCallId);

        // Set up a non-linear test
        const preset = cloneDeep(presetNonLinear);

        stateStore.setTestMap(preset.testMap);
        stateStore.setTestContext({
            ...preset.testContext,
            itemPosition: 1,
            itemIdentifier: 'item1',
            sectionId: 'assessmentSection-1',
            testPartId: 'testPart-1'
        });

        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                liteMode: false,
                nonLinearRestricted: true
            }
        });

        // Check for the presence of the Overview button
        const overviewButton = container.querySelector('button[name="overview"]');
        expect(overviewButton).not.toBeNull();

        // Check for the presence of the bookmark button
        const bookmarkButton = container.querySelector('button[name="bookmark"]');
        expect(bookmarkButton).not.toBeNull();
    });
});

describe('Test navigation with linear delay', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllTimers();
        testsStateStore.clear();
    });

    it('next button is initially disabled when linearNavDelayBeforeEnabled is set', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);
        jumpFactory(serviceCallId).setFirst();

        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                linearNavDelayBeforeEnabled: 1000
            }
        });

        const nextBtn = container.querySelector('[name="next"]');
        expect(nextBtn.disabled).toBe(true);
    });

    it('next button becomes enabled after delay in linear mode', async () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);
        jumpFactory(serviceCallId).setFirst();

        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                linearNavDelayBeforeEnabled: 1000
            }
        });

        const nextBtn = container.querySelector('[name="next"]');
        expect(nextBtn.disabled).toBe(true);

        vi.advanceTimersByTime(1050);
        await tick();

        expect(nextBtn.disabled).toBe(false);
    });

    it('delay is not applied in non-linear mode', () => {
        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);
        jumpFactory(serviceCallId).setFirst();

        const { container } = render(TestNavigator, {
            props: {
                serviceCallId,
                linearNavDelayBeforeEnabled: 1000
            }
        });

        const nextBtn = container.querySelector('[name="next"]');
        expect(nextBtn.disabled).toBe(false);
    });
});
