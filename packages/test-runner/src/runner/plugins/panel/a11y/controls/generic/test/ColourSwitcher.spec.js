// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import ColourSwitcher from '../ColourSwitcher.svelte';

describe('ColourSwitcher', () => {
    const options = [
        {
            key: 'default',
            label: 'default',
            colour: '--default'
        },
        {
            key: 'whiteOnBlack',
            label: 'whiteOnBlack',
            colour: '--theme-white-on-black'
        },
        {
            key: 'blackOnCream',
            label: 'blackOnCream',
            colour: '--theme-black-on-cream'
        },
        {
            key: 'yellowOnBlack',
            label: 'yellowOnBlack',
            colour: '--theme-yellow-on-black'
        },
        {
            key: 'yellowOnBlue',
            label: 'yellowOnBlue',
            colour: '--theme-yellow-on-blue'
        },
        {
            key: 'blackOnMagenta',
            label: 'blackOnMagenta',
            colour: '--theme-black-on-magenta'
        },
        {
            key: 'greyOnGreen',
            label: 'greyOnGreen',
            colour: '--theme-grey-on-green'
        },
        {
            key: 'blackOnBlue',
            label: 'blackOnBlue',
            colour: '--theme-black-on-blue'
        }
    ];

    it('renders passed options', () => {
        const { container } = render(ColourSwitcher, {
            props: {
                options,
                value: options[0].key
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('triggers change-event on clicking button-option', () => {
        const { component, getByTitle } = render(ColourSwitcher, {
            props: {
                options,
                value: options[0].key
            }
        });
        const changeSpy = vi.fn();
        component.$on('change', changeSpy);

        const button = getByTitle(options[3].label);
        button.click();

        expect(changeSpy.mock.calls[0][0].detail).toMatchObject({ value: options[3].key });
    });

    it.each(['Enter', 'Space'])(
        'fires change-event with a default option on pressing %s on the radio option',
        async keyName => {
            const { component, getByTitle } = render(ColourSwitcher, {
                props: {
                    options,
                    value: options[0].key
                }
            });
            const changeSpy = vi.fn();
            component.$on('change', changeSpy);

            const selectedButton = getByTitle(options[3].label);
            await fireEvent.keyUp(selectedButton, { key: keyName });

            expect(changeSpy.mock.calls[0][0].detail).toMatchObject({ value: options[3].key });
        }
    );

    it('selects button corresponding passed value', () => {
        const { getByTitle } = render(ColourSwitcher, {
            props: {
                options,
                value: options[3].key
            }
        });

        const button = getByTitle(options[3].label);

        expect(button.checked).toBe(true);
    });

    it('fires change-event with a default option on clicking the selected radio option', async () => {
        const { component, getByTitle } = render(ColourSwitcher, {
            props: {
                options,
                defaultOptionKey: options[2].key,
                value: options[3].key
            }
        });
        const changeSpy = vi.fn();
        component.$on('change', changeSpy);

        const selectedButton = getByTitle(options[3].label);
        await selectedButton.click();

        expect(changeSpy.mock.calls[0][0].detail).toMatchObject({ value: options[2].key });
    });

    it.each(['Enter', 'Space'])(
        'fires change-event with a default option if %s key was pressed down on the selected radio option',
        async keyName => {
            const { component, getByTitle } = render(ColourSwitcher, {
                props: {
                    options,
                    defaultOptionKey: options[2].key,
                    value: options[3].key
                }
            });
            const changeSpy = vi.fn();
            component.$on('change', changeSpy);

            const selectedButton = getByTitle(options[3].label);
            await fireEvent.keyUp(selectedButton, { key: keyName });

            expect(changeSpy.mock.calls[0][0].detail).toMatchObject({ value: options[2].key });
        }
    );
});
