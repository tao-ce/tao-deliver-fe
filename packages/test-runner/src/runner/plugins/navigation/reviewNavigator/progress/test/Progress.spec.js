// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import testsStateStore, { getTestStateStore } from '../../../../../testsStateStore.js';
import { screenSize } from '../../../../../screenSizeStore.js';
import Progress from '../Progress.svelte';
import presetLinear from '../../../navigator/test/testStoreMocks/presetOneSectionLinear.json';
import presetNonLinear from '../../../navigator/test/testStoreMocks/presetFourSectionsNonLinear.json';

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

    it('Has to render steps for linear mode on tablet-portrait screen size', () => {
        screenSize.set({ tabletPortrait: true });

        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId
            }
        });

        expectSteps(container);
    });

    it('Has to render steps for linear mode on over-tablet-portrait screen size', () => {
        screenSize.set({ tabletLandscape: true });

        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId
            }
        });

        expectSteps(container);
    });

    it('Has to render steps for non linear mode on over-tablet-portrait screen size', () => {
        screenSize.set({ tabletLandscape: true });

        const serviceCallId = serviceCallIds.get();
        setupNonLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId
            }
        });

        expectSteps(container);
    });

    it('Has to render no component for linear mode on mobile screen size', () => {
        screenSize.set({ mobile: true });

        const serviceCallId = serviceCallIds.get();
        setupLinear(serviceCallId);

        const { container } = render(Progress, {
            props: {
                serviceCallId
            }
        });

        expectNone(container);
    });
});
