// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import DetailsWithSlotContent from './DetailsWithSlotContent.svelte';
import Details from '../Details.svelte';

describe('Details', () => {
    it('renders with slot content - collapsible', () => {
        const { container } = render(DetailsWithSlotContent, {
            props: {
                config: {
                    collapsible: true,
                    outlined: true
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders with slot content - non-collapsible', () => {
        const { container } = render(DetailsWithSlotContent, {
            props: {
                config: {
                    collapsible: false,
                    outlined: true
                }
            }
        });
        expect(container).toMatchSnapshot();
    });

    test.each([
        [void 0, void 0, false],
        [void 0, false, false],
        [false, void 0, false],
        [false, false, false],
        [void 0, true, true],
        [true, void 0, true],
        [true, true, true]
    ])('renders collapsed? [config: %s, prop: %s] => %s', (configCollapsed, collapsed, expectedCollapsed) => {
        const { container } = render(Details, {
            props: {
                config: {
                    collapsible: true,
                    collapsed: configCollapsed
                },
                collapsed
            }
        });
        expect(container.querySelector('details').open).toBe(!expectedCollapsed);
    });

    it('fires "toggle" events on button clicks', async () => {
        const key = 'test-234';
        const { container, component } = render(Details, {
            props: {
                key
            }
        });
        const ontoggle = vi.fn();
        component.$on('toggle', ontoggle);

        const details = container.querySelector('details');

        //native <details> dispatches 'toggle' event and sets 'open' property, but jest-dom doesn't implement that
        details.open = false;
        details.dispatchEvent(new CustomEvent('toggle'));
        await tick();

        expect(ontoggle).toHaveBeenCalledTimes(1);
        expect(ontoggle.mock.calls[0][0].detail).toStrictEqual({
            key,
            collapsed: true
        });

        details.open = true;
        details.dispatchEvent(new CustomEvent('toggle'));
        await tick();

        expect(ontoggle).toHaveBeenCalledTimes(2);
        expect(ontoggle.mock.calls[1][0].detail).toStrictEqual({
            key,
            collapsed: false
        });
    });
});
