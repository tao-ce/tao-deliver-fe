// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import ItemHanger from '../ItemHanger.svelte';

describe('ItemHanger', () => {
    it('renders text message', () => {
        const { container } = render(ItemHanger, {
            props: {
                messages: [{ content: 'Hello world!' }]
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders timer message', () => {
        const { container } = render(ItemHanger, {
            props: {
                messages: [{ content: '1h', isTimer: true, colored: true, timerAriaLabel: '1 hour' }]
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders multiple messages', () => {
        const { container } = render(ItemHanger, {
            props: {
                messages: [
                    { content: 'Tea' },
                    { content: 'Coffee', colored: true },
                    { content: '1h', isTimer: true, timerAriaLabel: '1 hour' }
                ]
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders at bottom depending on tools state', () => {
        const { container, component } = render(ItemHanger, {
            props: {
                messages: [{ content: 'Hello world!' }]
            }
        });
        expect(container.querySelector('.bottom')).toBeFalsy();

        component.$set({ bottom: true });
        return tick().then(() => {
            expect(container.querySelector('.bottom')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });
    });

    it('renders if no messages', () => {
        const { container } = render(ItemHanger, {
            props: {}
        });
        expect(container).toMatchSnapshot();
    });
});
