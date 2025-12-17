// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import FontFamilySetting from '../FontFamilySetting.svelte';

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

describe('FontFamilySetting', () => {
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
        const { container } = render(FontFamilySetting, {
            props: {
                areaBroker: areaBrokerMock
            }
        });
        const dropdown = container.querySelector('.select');
        expect(dropdown).not.toBeNull();
        expect(dropdown.querySelectorAll('[role="option"]').length).toBe(1);
        expect(dropdown.querySelector('input').value).toBe('default');
    });

    it('renders with reduced font families', async () => {
        const { container } = render(FontFamilySetting, {
            props: {
                areaBroker: areaBrokerMock,
                config: {
                    families: ['arial', 'verdana']
                }
            }
        });
        const dropdown = container.querySelector('.select');
        expect(dropdown).not.toBeNull();
        expect(dropdown.querySelectorAll('[role="option"]').length).toBe(2);
        expect(dropdown.querySelector('input').value).toBe('arial');
    });

    it('renders with all font families but no more', async () => {
        const { container } = render(FontFamilySetting, {
            props: {
                areaBroker: areaBrokerMock,
                config: {
                    families: ['default', 'arial', 'verdana', 'courier', 'cmuserif', 'luciole', 'made-up-font']
                }
            }
        });
        const dropdown = container.querySelector('.select');
        expect(dropdown).not.toBeNull();
        expect(dropdown.querySelectorAll('[role="option"]').length).toBe(6);
        expect(dropdown.querySelector('input').value).toBe('default');
        expect(container).toMatchSnapshot();
    });

    it('fires "change" events on Dropdown change', async () => {
        const { container, component } = render(FontFamilySetting, {
            props: {
                areaBroker: areaBrokerMock,
                config: {
                    families: ['arial', 'verdana']
                }
            }
        });
        const onchange = vi.fn();
        component.$on('change', onchange);

        const dropdownButton = container.querySelector('.select button');
        const [arialOption, verdanaOption] = Array.from(container.querySelectorAll('[role="option"]'));

        fireEvent.mouseDown(dropdownButton);
        await tick();
        fireEvent.mouseUp(verdanaOption);
        await tick();

        expect(onchange).toHaveBeenCalledTimes(1);
        expect(onchange.mock.calls[0][0].detail).toStrictEqual({
            key: 'fontFamily',
            state: {
                nonDefault: true,
                value: 'verdana'
            }
        });

        fireEvent.mouseDown(dropdownButton);
        await tick();
        fireEvent.mouseUp(arialOption);
        await tick();

        expect(onchange).toHaveBeenCalledTimes(2);
        expect(onchange.mock.calls[1][0].detail).toStrictEqual({
            key: 'fontFamily',
            state: {
                nonDefault: false,
                value: 'arial'
            }
        });
    });

    it('applies style to container on change', async () => {
        const { container } = render(FontFamilySetting, {
            props: {
                areaBroker: areaBrokerMock,
                config: {
                    families: ['arial', 'verdana']
                }
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(ctr.style.getPropertyValue('--font-ui')).toBe(''); // no LDS, so no CSS properties set

        const dropdownButton = container.querySelector('.select button');
        const [arialOption, verdanaOption] = Array.from(container.querySelectorAll('[role="option"]'));

        fireEvent.mouseDown(dropdownButton);
        await tick();
        fireEvent.mouseUp(verdanaOption);
        await tick();

        expect(ctr.style.getPropertyValue('--font-ui')).toMatch(/^Verdana/i);

        fireEvent.mouseDown(dropdownButton);
        await tick();
        fireEvent.mouseUp(arialOption);
        await tick();

        expect(ctr.style.getPropertyValue('--font-ui')).toMatch(/^Arial/i);
    });

    it('applies initial state value to document on load', async () => {
        render(FontFamilySetting, {
            props: {
                areaBroker: areaBrokerMock,
                config: {
                    families: ['default', 'courier']
                },
                initialState: {
                    nonDefault: true,
                    value: 'courier'
                }
            }
        });
        const ctr = document.querySelector('.test-container');
        expect(ctr.style.getPropertyValue('--font-ui')).toMatch(/^Courier/i);
    });
});
