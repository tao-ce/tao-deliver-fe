// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import WordSpacingSetting from '../WordSpacingSetting.svelte';

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

describe('WordSpacingSetting', () => {
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
        const { container } = render(WordSpacingSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('fires "change" events on button clicks', async () => {
        const { container, component } = render(WordSpacingSetting, {
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
            key: 'wordSpacing',
            state: {
                value: 0.08333333333333333,
                nonDefault: true,
                wordSpacingValue: '0.08333333333333333em'
            }
        });

        btn2.click();
        await tick();

        expect(onchange).toHaveBeenCalledTimes(2);
        expect(onchange.mock.calls[1][0].detail).toStrictEqual({
            key: 'wordSpacing',
            state: {
                value: 0,
                nonDefault: false,
                wordSpacingValue: '0em'
            }
        });
    });

    it('applies attributes to container on change', async () => {
        const { container } = render(WordSpacingSetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('');

        const [btn1, btn2] = Array.from(container.querySelectorAll('button'));

        btn1.click();
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0.08333333333333333em');

        await tick();

        btn1.click();
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0.16666666666666666em');

        await tick();

        btn2.click();
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0.08333333333333333em');

        await tick();

        btn2.click();
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0em');
    });

    it('applies initial state value to document on load', async () => {
        const { container } = render(WordSpacingSetting, {
            props: {
                areaBroker: areaBrokerMock,
                initialState: {
                    value: 0.14,
                    nonDefault: true
                }
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(container.querySelector('.non-default')).toBeTruthy();
        expect(ctr.style.getPropertyValue('--word-spacing')).toBe('0.14em');
    });
});
