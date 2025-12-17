// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import testsStateStore, { getTestStateStore } from '../../../../testsStateStore.js';
import { screenSize } from '../../../../screenSizeStore.js';
import ReviewNavigator from '../ReviewNavigator.svelte';
import presetLinear from '../../navigator/test/testStoreMocks/presetOneSectionLinear.json';
import { cloneDeep } from 'lodash';
vi.mock('resize-observer-polyfill');

const serviceCallIds = {
    counter: 0,
    get() {
        this.counter = this.counter + 1;
        return `serviceCallId_${this.counter}`;
    }
};

describe('Test navigation', () => {
    afterEach(() => {
        testsStateStore.clear();
        screenSize.set({ unknown: true });
    });

    const setupLinear = (serviceCallId, total) => {
        const stateStore = getTestStateStore(serviceCallId);
        let preset = cloneDeep(presetLinear);
        if (total) {
            preset.testMap.parts['TP01'].stats.total = total;
        }
        stateStore.setTestMap(preset.testMap);
        stateStore.setTestContext(preset.testContext);
    };

    const jumpFactory = serviceCallId => {
        const stateStore = getTestStateStore(serviceCallId);
        const testMap = stateStore.getTestMap();
        const getFirstPart = () => Object.values(testMap.parts)[0];
        const getLastPart = () => Object.values(testMap.parts)[Object.values(testMap.parts).length - 1];
        const getFirstSection = testPart => Object.values(testPart.sections)[0];
        const getLastSection = testPart =>
            Object.values(testPart.sections)[Object.values(testPart.sections).length - 1];
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

    //RENDERING

    it('Renders without error if testStateStore empty', () => {
        const serviceCallId = serviceCallIds.get();
        const { container } = render(ReviewNavigator, {
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
        const { container } = render(ReviewNavigator, {
            props: {
                serviceCallId
            }
        });
        expect(container.querySelector('[name="next"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    it('Doesnt render forward button last item', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();
        const { container } = render(ReviewNavigator, {
            props: {
                serviceCallId
            }
        });
        expect(container.querySelector('[name="next"]')).toBeFalsy();
        expect(container).toMatchSnapshot();
    });

    it('Does render finish button last item', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();
        const { container } = render(ReviewNavigator, {
            props: {
                serviceCallId
            }
        });
        expect(container.querySelector('[name="finish"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    it('Does render prev button for linear test non-first item', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();
        const { container } = render(ReviewNavigator, {
            props: {
                serviceCallId
            }
        });

        expect(container.querySelector('[name="prev"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
    });

    it('Does render overview buttons for linear test', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);
        screenSize.set({ desktop: true });

        const { container } = render(ReviewNavigator, {
            props: {
                serviceCallId
            }
        });
        expect(container.querySelector('[name="overview"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
        screenSize.set({ mobile: true });

        return tick().then(() => {
            expect(container.querySelector('[name="overview"]')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });
    });

    //EVENTS

    it('Fires testRunner.next on next button click', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setFirst();

        const { component, container } = render(ReviewNavigator, {
            props: {
                serviceCallId
            }
        });

        expect.assertions(1);
        component.$on('move', e => {
            expect(e.detail && e.detail.direction).toEqual('next');
        });
        const nextBtn = container.querySelector('[name="next"]');
        return fireEvent.click(nextBtn);
    });

    it('Fires previous event on prev button click', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTestPart();

        const { component, container } = render(ReviewNavigator, {
            props: {
                serviceCallId
            }
        });

        expect.assertions(1);
        component.$on('move', e => {
            expect(e.detail.direction).toEqual('previous');
        });
        const prevBtn = container.querySelector('[name="prev"]');
        return fireEvent.click(prevBtn);
    });

    it('Fires testRunner.finish on finish button click', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setLastInTest();

        const { component, container } = render(ReviewNavigator, {
            props: {
                serviceCallId
            }
        });

        expect.assertions(1);
        component.$on('finish', () => {
            expect(true).toBe(true);
        });
        const finishBtn = container.querySelector('[name="finish"]');
        return fireEvent.click(finishBtn);
    });

    it('Doesnt fire move event on next btn click while disabled', () => {
        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        jumpFactory(serviceCallId).setFirst();
        const move = vi.fn();
        const { component, container } = render(ReviewNavigator, {
            props: {
                serviceCallId,
                disabled: true
            }
        });

        expect.assertions(1);
        component.$on('move', move);
        const nextBtn = container.querySelector('[name="next"]');
        return fireEvent.click(nextBtn).then(() => {
            expect(move.mock.calls.length).toEqual(0);
        });
    });
});
