// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { cloneDeep } from 'lodash';
import OverviewButton from '../OverviewButton.svelte';
import testsStateStore, { getTestStateStore } from '../../../../../testsStateStore.js';
import { screenSize } from '../../../../../screenSizeStore.js';
import preset from '../../test/testStoreMocks/overviewPreset.json';

describe('OverviewButton', () => {
    afterEach(() => {
        testsStateStore.clear();
        screenSize.set({ unknown: true });
    });

    it('fails to render without a serviceCallId', () => {
        screenSize.set({ mobile: true });

        expect(() => {
            render(OverviewButton, { props: {} });
        }).toThrowErrorMatchingSnapshot();
    });

    it('renders with empty store', () => {
        screenSize.set({ mobile: true });

        const { container } = render(OverviewButton, {
            props: {
                serviceCallId: 'abc'
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders on mobile screen and indicates non-informational current item', () => {
        screenSize.set({ mobile: true });

        const serviceCallId = 'test-ob1';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(preset.testMap);
        stateStore.setTestContext(preset.testContext);

        const { container } = render(OverviewButton, {
            props: {
                serviceCallId
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders on mobile screen and indicates informational current item', () => {
        screenSize.set({ mobile: true });

        const testContext = Object.assign({}, preset.testContext, {
            itemIdentifier: 'item-4',
            itemPosition: 8
        });
        const serviceCallId = 'test-ob2';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(preset.testMap);
        stateStore.setTestContext(testContext);

        const { container } = render(OverviewButton, {
            props: {
                serviceCallId
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders on mobile screen without count if all items informational', () => {
        screenSize.set({ mobile: true });

        const testContext = Object.assign({}, preset.testContext, {
            itemIdentifier: 'item-4',
            itemPosition: 8
        });
        const serviceCallId = 'test-ob2';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestContext(testContext);

        const testMap = cloneDeep(preset.testMap);
        Object.values(testMap.parts[preset.testContext.testPartId].sections).forEach(section => {
            Object.values(section.items).forEach(sitem => (sitem.informational = true));
        });
        stateStore.setTestMap(testMap);

        const { container } = render(OverviewButton, {
            props: {
                serviceCallId
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders on tablet/desktop screen with count of non-informational items', () => {
        screenSize.set({ tablet: true });

        const serviceCallId = 'test-ob3';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(preset.testMap);
        stateStore.setTestContext(preset.testContext);

        const { container } = render(OverviewButton, {
            props: {
                serviceCallId
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders on tablet/desktop screen without count if all items informational', () => {
        screenSize.set({ tablet: true });

        const serviceCallId = 'test-ob6';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestContext(preset.testContext);

        const testMap = cloneDeep(preset.testMap);
        Object.values(testMap.parts[preset.testContext.testPartId].sections).forEach(section => {
            Object.values(section.items).forEach(sitem => (sitem.informational = true));
        });
        stateStore.setTestMap(testMap);

        const { container } = render(OverviewButton, {
            props: {
                serviceCallId
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('renders disabled button with disabled props', () => {
        screenSize.set({ desktop: true });

        const serviceCallId = 'test-ob5';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(preset.testMap);
        stateStore.setTestContext(preset.testContext);

        const { container } = render(OverviewButton, {
            props: {
                serviceCallId,
                disabled: true
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('fires overview event', () => {
        screenSize.set({ mobile: true });

        const serviceCallId = 'test-ob4';
        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap(preset.testMap);
        stateStore.setTestContext(preset.testContext);

        const { container, component } = render(OverviewButton, {
            props: {
                serviceCallId
            }
        });

        const button = container.querySelector('button');
        const onoverview = vi.fn();
        component.$on('overview', onoverview);
        fireEvent.click(button);

        return tick().then(() => {
            expect(onoverview).toHaveBeenCalled();
        });
    });
});
