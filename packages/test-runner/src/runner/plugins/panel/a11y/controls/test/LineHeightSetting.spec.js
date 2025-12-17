// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import LineHeightSetting from '../LineHeightSetting.svelte';

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

function expectPropertyToBeCloseTo(elt, property, number) {
    const str = elt.style.getPropertyValue(property);
    expect(parseFloat(str)).toBeCloseTo(number);
}

describe('LineHeightSetting', () => {
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
        const { container } = render(LineHeightSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const buttons = Array.from(container.querySelectorAll('button'));
        expect(buttons.length).toBe(2);

        const [btn1, btn2] = buttons;
        expect(btn1.getAttribute('aria-label')).toBe('increase line height');
        expect(btn2.getAttribute('aria-label')).toBe('decrease line height');

        expect(container.querySelector('.non-default')).toBeFalsy();
    });

    it('fires "change" events on button clicks', async () => {
        const { container, component } = render(LineHeightSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const onchange = vi.fn();
        component.$on('change', onchange);

        const [btn1, btn2] = Array.from(container.querySelectorAll('button'));
        btn1.click();
        await tick();

        expect(onchange).toHaveBeenCalledTimes(1);
        expect(onchange.mock.calls[0][0].detail).toStrictEqual({
            key: 'lineHeight',
            state: {
                value: 1.6,
                nonDefault: true,
                lineHeightBodyValue: 1.6
            }
        });

        btn2.click();
        await tick();

        expect(onchange).toHaveBeenCalledTimes(2);
        expect(onchange.mock.calls[1][0].detail).toStrictEqual({
            key: 'lineHeight',
            state: {
                value: 1.5,
                nonDefault: false,
                lineHeightBodyValue: 1.5
            }
        });
    });

    it('applies attributes to container on change', async () => {
        const { container } = render(LineHeightSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(ctr.style.getPropertyValue('--line-height-default')).toBe('');
        expect(ctr.style.getPropertyValue('--line-height-heading')).toBe(''); // no LDS, so no CSS properties set

        const [btn1, btn2] = Array.from(container.querySelectorAll('button'));

        btn1.click();
        expect(ctr.style.getPropertyValue('--line-height-default')).toBe('1.6');
        expect(ctr.style.getPropertyValue('--line-height-heading')).toBe('1.28');

        await tick();

        btn2.click();
        expect(ctr.style.getPropertyValue('--line-height-default')).toBe('1.5');
        expect(ctr.style.getPropertyValue('--line-height-heading')).toBe('1.2');
    });

    it('applies initial state value to document on load', async () => {
        const { container } = render(LineHeightSetting, {
            props: {
                areaBroker: areaBrokerMock,
                initialState: {
                    value: 2,
                    nonDefault: true
                }
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(container.querySelector('.non-default')).toBeTruthy();
        expect(ctr.style.getPropertyValue('--line-height-default')).toBe('2');
        expectPropertyToBeCloseTo(ctr, '--line-height-heading', 1.6);
    });
});
