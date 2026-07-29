// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { fireEvent, render } from '@testing-library/svelte';
import JumpMenu from '../JumpMenu.svelte';
import testsStateStore, { getTestStateStore, getTestSessionStatusStore } from '../../../../testsStateStore.js';
import { testSessionStatus } from '../../../../session/sessionStates';

const testMap = {
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
        }
    }
};
const testContext = {
    testPartId: 'p1',
    sectionId: 's1',
    itemIdentifier: 'i2'
};

const items = [
    {
        type: 'toolbox',
        area: '#toolbox-area',
        // mock plugins logic
        getHighlightElement: () => true,
        getFocusableElement: () => true,
        getLabel: () => '',
        availableStatuses: Object.values(testSessionStatus).filter(status => status !== testSessionStatus.overlay)
    },
    {
        type: 'question',
        area: '#question-area',
        // mock plugins logic
        getHighlightElement: () => true,
        getFocusableElement: () => true,
        getLabel: () => '',
        availableStatuses: [testSessionStatus.interacting]
    },
    {
        type: 'navigation',
        area: '#navigation-area',
        // mock plugins logic
        getHighlightElement: () => true,
        getFocusableElement: () => true,
        getLabel: () => '',
        availableStatuses: [testSessionStatus.interacting]
    },
    {
        type: 'overview',
        area: '#overview-area',
        // mock plugins logic
        getHighlightElement: () => true,
        getFocusableElement: () => true,
        getLabel: () => '',
        availableStatuses: [testSessionStatus.overlay]
    }
];

// convert areas from selector string to HTMLElement
const getItems = layout => items.map(item => Object.assign({}, item, { area: layout.querySelector(item.area) }));

function getLayout() {
    const layout = document.createElement('div');

    layout.innerHTML = `<div id="toolbox-area"></div>
            <div id="question-area"></div>
            <div id="navigation-area"></div>
            <div id="overview-area"></div>`;

    return layout;
}

describe('JumpMenu', () => {
    const serviceCallId = 'test-session-xlk0jh';
    let layout, stateStore, statusStore;

    beforeEach(() => {
        layout = getLayout();
        stateStore = getTestStateStore(serviceCallId);
        statusStore = getTestSessionStatusStore(serviceCallId);

        stateStore.setTestMap(testMap);
        stateStore.setTestContext(testContext);
        statusStore.set(testSessionStatus.interacting);

        document.body.appendChild(layout);
    });

    afterEach(() => {
        testsStateStore.clear();
    });

    it('fails without a serviceCallId', () => {
        expect(() => render(JumpMenu, { props: {} })).toThrow(TypeError);
    });

    it('renders correctly with a serviceCallId', () => {
        const { container } = render(JumpMenu, {
            props: {
                serviceCallId: 'test-session-1afdhj',
                items: getItems(layout)
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('Fires highlight events', async () => {
        const highlight = vi.fn();
        const unhighlight = vi.fn();

        const { container, component } = render(JumpMenu, {
            props: {
                serviceCallId,
                items: getItems(layout)
            }
        });

        component.$on('highlight', highlight);
        component.$on('unhighlight', unhighlight);

        await tick();
        await tick();

        await fireEvent.focus(container.querySelector('li:nth-child(2) button'));

        expect(highlight.mock.calls[0][0].detail).toMatchObject({
            itemType: 'question'
        });

        await fireEvent.focusOut(container.querySelector('li:nth-child(2) button'));

        expect(unhighlight.mock.calls[0][0].detail).toMatchObject({
            itemType: 'question'
        });
    });

    it('Fires focus event', async () => {
        const focusElement = vi.fn();

        const { container, component } = render(JumpMenu, {
            props: {
                serviceCallId,
                items: getItems(layout)
            }
        });

        component.$on('focusElement', focusElement);

        await tick();
        await tick();

        await fireEvent.click(container.querySelector('li:nth-child(2) button'));

        expect(focusElement.mock.calls[0][0].detail).toMatchObject({
            itemType: 'question'
        });
    });
});
