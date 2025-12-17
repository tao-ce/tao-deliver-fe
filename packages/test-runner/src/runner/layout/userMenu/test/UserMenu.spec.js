// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import UserMenu from '../UserMenu.svelte';

describe('UserMenu', () => {
    it('renders user avatar, on click opens flyout with name & id', async () => {
        const { container } = render(UserMenu, {
            props: {
                testTaker: {
                    id: 'user-123',
                    name: 'John Doe',
                    firstName: null,
                    lastName: null
                }
            }
        });
        expect(container.innerHTML).toContain('John Doe');
        expect(container).toMatchSnapshot();

        fireEvent.click(container.querySelector('button'));
        await tick();
        expect(container.querySelector('.flyout')).toBeTruthy();
        expect(container.querySelector('.flyout').innerHTML).toContain('John Doe');
        expect(container.querySelector('.flyout').innerHTML).toContain('user-123');
        expect(container).toMatchSnapshot();
    });

    it('does not render if anonymous user', () => {
        const { container } = render(UserMenu, {
            props: {
                testTaker: {
                    id: null,
                    name: null,
                    firstName: null,
                    lastName: null
                }
            }
        });
        expect(container.innerHTML).toBe('');
    });

    it('renders name from firstName & lastName if set', () => {
        const { container } = render(UserMenu, {
            props: {
                testTaker: {
                    id: 'user-123',
                    name: '',
                    firstName: 'John',
                    lastName: 'Doe'
                }
            }
        });
        expect(container.innerHTML).toContain('John Doe');
    });
});
