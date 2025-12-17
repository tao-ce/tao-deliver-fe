// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import MousePointerSetting from '../MousePointerSetting.svelte';

function setupLayout() {
    const section = document.createElement('section');
    section.classList.add('test-container');
    document.body.appendChild(section);
    return section;
}

function removeLayout() {
    const section = document.querySelector('.test-container');
    section?.remove();
}

describe('MousePointerSetting', () => {
    beforeEach(() => {
        setupLayout();
    });

    afterEach(() => {
        removeLayout();
    });

    const areaBrokerMock = {
        getContainer: () => document.querySelector('.test-container')
    };

    it('renders correctly', () => {
        const { container } = render(MousePointerSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const buttons = Array.from(container.querySelectorAll('button'));
        expect(buttons.length).toBe(2);

        const [btn1, btn2] = buttons;
        expect(btn1.getAttribute('aria-label')).toBe('increase pointer size');
        expect(btn2.getAttribute('aria-label')).toBe('decrease pointer size');

        expect(container.querySelector('.non-default')).toBeFalsy();
    });

    it('fires "change" events on button clicks', async () => {
        const { container, component } = render(MousePointerSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });

        const onchange = vi.fn();
        component.$on('change', onchange);

        const [btn1, btn2] = Array.from(container.querySelectorAll('button'));
        document.elementFromPoint = () => btn2;
        btn1.click();
        await tick();

        expect(onchange).toHaveBeenCalledTimes(1);
        expect(onchange.mock.calls[0][0].detail).toStrictEqual({
            key: 'mousePointer',
            state: {
                size: 32,
                color: 'default',
                nonDefault: true
            }
        });

        btn2.click();
        document.elementFromPoint = () => btn1;
        await tick();

        expect(onchange).toHaveBeenCalledTimes(2);
        expect(onchange.mock.calls[1][0].detail).toStrictEqual({
            key: 'mousePointer',
            state: {
                size: 16,
                color: 'default',
                nonDefault: false
            }
        });
    });

    it('applies initial state value to document on load', async () => {
        const { container } = render(MousePointerSetting, {
            props: {
                areaBroker: areaBrokerMock,
                initialState: {
                    size: 32,
                    color: 'green',
                    nonDefault: true
                }
            }
        });
        await tick();
        const ctr = document.querySelector('.test-container');
        expect(container.querySelector('.non-default')).toBeTruthy();
        //svg not rendered yet, because we don't know mouse position yet
        expect(ctr.querySelector('svg')).toBeFalsy();

        fireEvent.mouseMove(ctr, {
            clientX: 80,
            clientY: 50
        });
        await tick();
        //svg of restored color & size is rendered at mouse position
        expect(ctr.querySelector('svg')).toBeTruthy();
        expect(ctr).toMatchSnapshot();
    });
});
