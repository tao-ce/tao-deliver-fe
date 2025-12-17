// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import LetterAndWordSpacingSetting from '../LetterAndWordSpacingSetting.svelte';

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

describe('LetterAndWordSpacingSetting', () => {
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
        const { container } = render(LetterAndWordSpacingSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const buttons = Array.from(container.querySelectorAll('button'));
        expect(buttons.length).toBe(2);

        const [btn1, btn2] = buttons;
        expect(btn1.getAttribute('aria-label')).toBe('increase letter and word spacing');
        expect(btn2.getAttribute('aria-label')).toBe('decrease letter and word spacing');

        expect(container.querySelector('.non-default')).toBeFalsy();
    });

    it('fires "change" events on button clicks', async () => {
        const { container, component } = render(LetterAndWordSpacingSetting, {
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
            key: 'letterAndWordSpacing',
            state: {
                value: 0.0625,
                nonDefault: true,
                letterSpacingValue: '0.0625em',
                wordSpacingValue: '0.083125em'
            }
        });

        btn2.click();
        await tick();

        expect(onchange).toHaveBeenCalledTimes(2);
        expect(onchange.mock.calls[1][0].detail).toStrictEqual({
            key: 'letterAndWordSpacing',
            state: {
                value: 0,
                nonDefault: false,
                letterSpacingValue: '0em',
                wordSpacingValue: '0em'
            }
        });
    });

    it('applies attributes to container on change', async () => {
        const { container } = render(LetterAndWordSpacingSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(ctr.style.getPropertyValue('--letter-spacing')).toBe('');
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe(''); // no LDS, so no CSS properties set

        const [btn1, btn2] = Array.from(container.querySelectorAll('button'));

        btn1.click();
        expect(ctr.style.getPropertyValue('--letter-spacing')).toBe('0.0625em');
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0.083125em');

        await tick();

        btn1.click();
        expect(ctr.style.getPropertyValue('--letter-spacing')).toBe('0.125em');
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0.16625em');

        await tick();

        btn2.click();
        expect(ctr.style.getPropertyValue('--letter-spacing')).toBe('0.0625em');
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0.083125em');

        await tick();

        btn2.click();
        expect(ctr.style.getPropertyValue('--letter-spacing')).toBe('0em');
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0em');
    });

    it('applies initial state value to document on load', async () => {
        const { container } = render(LetterAndWordSpacingSetting, {
            props: {
                areaBroker: areaBrokerMock,
                initialState: {
                    value: 0.2,
                    nonDefault: true
                }
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(container.querySelector('.non-default')).toBeTruthy();
        expect(ctr.style.getPropertyValue('--letter-spacing')).toBe('0.2em');
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0.266em');
    });
});
