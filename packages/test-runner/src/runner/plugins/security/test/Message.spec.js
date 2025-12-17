// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import Message from '../Message.svelte';

// mock generateElementId function for snapshot
vi.mock('@oat-sa-private/ui-core', () => ({
    __esModule: true,
    generateElementId: vi.fn(nodeName => `tao-${nodeName}-123`),
    __: str => str,
    focusTrap: vi.fn()
}));

describe('Message component', () => {
    it('renders modal window with props', () => {
        const { container } = render(Message, {
            props: {
                config: {
                    message: 'Message'
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('fires "done" event with button key action on button click', () => {
        const { container, component } = render(Message, {
            props: {
                config: {
                    message: 'Message'
                }
            }
        });
        const ondone = vi.fn();
        component.$on('done', ondone);
        const btn = container.querySelector('button');
        fireEvent.click(btn);

        return tick().then(() => {
            expect(ondone).toHaveBeenCalledTimes(1);
            expect(ondone.mock.calls[0][0].detail).toStrictEqual({ action: 'proceed' });
            return tick().then(() => {
                expect(container.querySelector('.message-modal')).toBeTruthy(); //does not auto-close itself
            });
        });
    });
});
