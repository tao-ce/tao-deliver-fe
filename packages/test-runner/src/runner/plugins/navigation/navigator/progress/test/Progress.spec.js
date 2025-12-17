// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import testsStateStore, { getTestStateStore } from '../../../../../testsStateStore.js';
import { screenSize } from '../../../../../screenSizeStore.js';
import Progress from '../Progress.svelte';
import presetLinear from '../../test/testStoreMocks/presetOneSectionLinear.json';
import presetNonLinear from '../../test/testStoreMocks/presetFourSectionsNonLinear.json';

const serviceCallIds = {
    counter: 0,
    get() {
        this.counter = this.counter + 1;
        return `serviceCallId_${this.counter}`;
    }
};
describe('Progress component', () => {
    afterEach(() => {
        testsStateStore.clear();
        screenSize.set({ unknown: true });
    });

    const setupLinear = (serviceCallId, total) => {
        const stateStore = getTestStateStore(serviceCallId);
        if (total) {
            presetLinear.testMap.parts['TP01'].stats.total = total;
        }
        stateStore.setTestMap(presetLinear.testMap);
        stateStore.setTestContext(presetLinear.testContext);
    };

    const setupLinearAdaptive = (serviceCallId, viewed) => {
        const stateStore = getTestStateStore(serviceCallId);
        if (viewed) {
            presetLinear.testMap.parts['TP01'].stats.viewed = viewed;
            presetLinear.testMap.parts['TP01'].isAdaptive = true;
        }
        stateStore.setTestMap(presetLinear.testMap);
        stateStore.setTestContext(presetLinear.testContext);
    };

    const setupNonLinear = (serviceCallId, total) => {
        const stateStore = getTestStateStore(serviceCallId);
        if (total) {
            presetNonLinear.testMap.parts['testPart-1'].stats.total = total;
        }
        stateStore.setTestMap(presetNonLinear.testMap);
        stateStore.setTestContext(presetNonLinear.testContext);
    };

    const expectSteps = container => {
        expect.assertions(2);
        //'more' button is reliable here, because it's rendered even if no steps are rendered
        expect(container.getElementsByClassName('more').length).toBeGreaterThan(0);
        expect(container).toMatchSnapshot();
    };

    const expectDots = container => {
        expect.assertions(2);
        expect(container.getElementsByClassName('dots').length).toBeGreaterThan(0);
        expect(container).toMatchSnapshot();
    };

    const expectProgressbar = container => {
        expect(container.querySelector('[role="progressbar"]')).toBeTruthy();
        expect(container).toMatchSnapshot();
    };

    const expectCounter = container => {
        expect.assertions(2);
        expect(container.getElementsByClassName('counter').length).toBeGreaterThan(0);
        expect(container).toMatchSnapshot();
    };

    const expectQuestionNumber = container => {
        expect.assertions(2);
        expect(container.getElementsByClassName('number').length).toBeGreaterThan(0);
        expect(container).toMatchSnapshot();
    };

    const expectNone = container => {
        expect.assertions(1);
        expect(container).toMatchSnapshot();
    };

    it('Has to fail rendering with no serviceCallId', () => {
        expect(() => {
            render(Progress, { props: {} });
        }).toThrowErrorMatchingSnapshot();
    });

    it('renders with empty store', () => {
        const { container } = render(Progress, {
            props: {
                serviceCallId: 'abc'
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('Has to render counter for linear non-lite mode on mobile screen size', () => {
        screenSize.set({ mobile: true });

        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expectCounter(container);
    });

    it('Has to render counter for linear non-lite mode on tablet-portrait screen size', () => {
        screenSize.set({ tabletPortrait: true });

        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expectCounter(container);
    });

    it('Has to render counter for linear non-lite mode on over-tablet-portrait screen size', () => {
        screenSize.set({ tabletLandscape: true });

        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expectCounter(container);
    });

    it('Has to render steps for non-linear non-lite mode on tablet-portrait screen size', () => {
        screenSize.set({ tabletPortrait: true });

        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expectSteps(container);
    });

    it('Has to render steps for non-linear non-lite mode on over-tablet-portrait screen size', () => {
        screenSize.set({ tabletLandscape: true });

        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expectSteps(container);
    });

    it('Has to render no component for non-linear non-lite mode on mobile screen size', () => {
        screenSize.set({ mobile: true });

        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expectNone(container);
    });

    it('Has to render progressbar for liteMode on mobile screen size for non-linear test', () => {
        screenSize.set({ mobile: true });

        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expectProgressbar(container);
    });

    it('Has to render progressbar for liteMode on mobile screen size for linear test', () => {
        screenSize.set({ mobile: true });

        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expectProgressbar(container);
    });

    it('Has to render progressbar for liteMode on tablet-portrait screen size if items count > 12', () => {
        screenSize.set({ tabletPortrait: true });

        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expectProgressbar(container);
    });

    it('Has to render dots for liteMode on tablet-portrait screen size if items count <= 12', () => {
        screenSize.set({ tabletPortrait: true });

        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId, 12);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expectDots(container);
    });

    it('Has to render progressbar for liteMode on over-tablet-portrait screen size if items count > 18', () => {
        screenSize.set({ tabletLandscape: true });

        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId, 20);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expectProgressbar(container);
    });

    it('Has to render progressbar for linear test liteMode on over-tablet-portrait screen size if items count > 18', () => {
        screenSize.set({ tabletLandscape: true });

        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId, 20);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expectProgressbar(container);
    });

    it('Has to render dots for liteMode on over-tablet-portrait screen size if items count <= 18', () => {
        screenSize.set({ tabletLandscape: true });

        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId, 18);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expectDots(container);
    });

    it('Has to render dots for liteMode in linear on over-tablet-portrait screen size if items count <= 18', () => {
        screenSize.set({ tabletLandscape: true });

        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId, 16);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: true
            }
        });

        expectDots(container);
    });

    it('Has to render question number for linear adaptive test', () => {
        screenSize.set({ tabletLandscape: true });
        const number = 11;

        const serviceCallId = serviceCallIds.get();
        setupLinearAdaptive(serviceCallId, number);

        const { container } = render(Progress, {
            props: {
                serviceCallId,
                liteMode: false
            }
        });

        expectQuestionNumber(container, number);
    });
});
