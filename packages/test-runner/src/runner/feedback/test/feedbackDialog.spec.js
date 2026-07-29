// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import FeedbackDialog from '../FeedbackDialog.svelte';

// mock generateElementId function for snapshot
vi.mock('@oat-sa-private/ui-core', () => ({
    __esModule: true,
    generateElementId: vi.fn(nodeName => `tao-${nodeName}-123`),
    __: str => str
}));

describe('FeedbackDialog component', () => {
    const buttonDefs = [
        { key: 'btn1', label: 'Btn1', skin: 'primary' },
        { key: 'btn2', label: 'Btn2', skin: 'secondary', initialFocus: true },
        { key: 'btn3', label: 'Btn3', skin: 'secondary' }
    ];

    it('renders modal dialog with props', () => {
        const { container } = render(FeedbackDialog, {
            props: {
                config: {
                    heading: 'Header',
                    message: 'Message',
                    buttons: buttonDefs
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    test.each([
        ['alert', 1, false],
        ['confirm', 2, true],
        ['timeout', 1, false],
        ['timeout', 2, false]
    ])('renders %s type with %d buttons and dismissable: %s', (type, numButtons, dismissable) => {
        const { container, component } = render(FeedbackDialog, {
            props: {
                config: {
                    heading: 'Header',
                    message: 'Message',
                    buttons: buttonDefs.slice(0, numButtons),
                    type
                }
            }
        });
        expect(container.querySelectorAll('button')).toHaveLength(numButtons);
        expect(container).toMatchSnapshot();

        const ondone = vi.fn();
        component.$on('done', ondone);

        // disableClosing should prevent:
        const overlay = container.querySelector('.modal-background');
        overlay.click();

        // disableEscape should prevent:
        fireEvent.keyDown(window, { key: 'Esc' });

        return tick().then(() => {
            expect(ondone).toHaveBeenCalledTimes(dismissable ? 1 : 0);
        });
    });

    it('renders multiline message', () => {
        const { container } = render(FeedbackDialog, {
            props: {
                config: {
                    heading: 'Header',
                    message: ['First line', '', 'Second line', 'Third line'],
                    buttons: [buttonDefs[0]]
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('fires "done" event with button key action on button click', () => {
        const { container, component } = render(FeedbackDialog, {
            props: {
                config: {
                    heading: 'Header',
                    message: 'Message',
                    buttons: buttonDefs.slice(0, 2)
                }
            }
        });
        const ondone = vi.fn();
        component.$on('done', ondone);
        const btn1 = container.querySelector('button');
        fireEvent.click(btn1);

        return tick().then(() => {
            expect(ondone).toHaveBeenCalledTimes(1);
            expect(ondone.mock.calls[0][0].detail).toStrictEqual({ action: 'btn1' });
            return tick().then(() => {
                expect(container.querySelector('.modal-positioning')).toBeTruthy(); //does not auto-close itself
            });
        });
    });

    it('fires "done" event with "cancel" action on background click', () => {
        const { container, component } = render(FeedbackDialog, {
            props: {
                config: {
                    heading: 'Header',
                    message: 'Message',
                    buttons: buttonDefs.slice(0, 2)
                }
            }
        });
        const ondone = vi.fn();
        component.$on('done', ondone);
        const overlay = container.querySelector('.modal-background');
        fireEvent.click(overlay);

        return tick().then(() => {
            expect(ondone).toHaveBeenCalledTimes(1);
            expect(ondone.mock.calls[0][0].detail).toStrictEqual({ action: 'cancel' });
        });
    });
});
