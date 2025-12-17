// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import FontSizeSetting from '../FontSizeSetting.svelte';

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

describe('FontSizeSetting', () => {
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
        const { container } = render(FontSizeSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const buttons = Array.from(container.querySelectorAll('button'));
        expect(buttons.length).toBe(2);

        const [btn1, btn2] = buttons;
        expect(btn1.getAttribute('aria-label')).toBe('increase font size');
        expect(btn2.getAttribute('aria-label')).toBe('decrease font size');

        expect(container.querySelector('.non-default')).toBeFalsy();
    });

    it('fires "change" events on button clicks', async () => {
        const { container, component } = render(FontSizeSetting, {
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
            key: 'fontSize',
            state: {
                value: 1,
                nonDefault: true,
                fontSizeBody: '2.5rem',
                fontSizeDescriptor: 'large'
            }
        });

        btn2.click();
        await tick();

        expect(onchange).toHaveBeenCalledTimes(2);
        expect(onchange.mock.calls[1][0].detail).toStrictEqual({
            key: 'fontSize',
            state: {
                value: 0,
                nonDefault: false,
                fontSizeBody: '2rem',
                fontSizeDescriptor: 'normal'
            }
        });
    });

    it('applies attributes to container on change', async () => {
        const { container } = render(FontSizeSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(ctr.style.getPropertyValue('--fontsize-body')).toBe(''); // no LDS, so no CSS properties set

        const [btn1, btn2] = Array.from(container.querySelectorAll('button'));

        btn1.click();
        expect(ctr.style.getPropertyValue('--fontsize-body')).toBe('2.5rem'); // 3

        await tick();

        btn1.click();
        expect(ctr.style.getPropertyValue('--fontsize-body')).toBe('3rem');

        await tick();

        btn2.click();
        expect(ctr.style.getPropertyValue('--fontsize-body')).toBe('2.5rem');

        await tick();

        btn2.click();
        expect(ctr.style.getPropertyValue('--fontsize-body')).toBe('2rem');
    });

    it('applies initial state value to document on load', async () => {
        const { container } = render(FontSizeSetting, {
            props: {
                areaBroker: areaBrokerMock,
                initialState: {
                    value: 1,
                    nonDefault: true
                }
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(container.querySelector('.non-default')).toBeTruthy();
        expect(ctr.style.getPropertyValue('--fontsize-body')).toBe('2.5rem');
    });
});
