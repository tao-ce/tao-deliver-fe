// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import ItemContentOverlay from '../ItemContentOverlay.svelte';

describe('ItemContentOverlay rendering', () => {
    it('renders correctly', () => {
        const { container } = render(ItemContentOverlay);

        expect(container).toMatchSnapshot();
    });

    it('renders correctly with provided properties', () => {
        const { container } = render(ItemContentOverlay, {
            gapSize: 85,
            gapOffset: 100,
            areaScrollHeight: 200,
            areaScrollTop: 12
        });

        expect(container).toMatchSnapshot();
    });
});

describe('ItemContentOverlay event forwarding', () => {
    it('forwards `topareaclick` and `bottomareaclick` events', () => {
        const listener = vi.fn();
        const { component, container } = render(ItemContentOverlay, {
            gapSize: 85,
            gapOffset: 100,
            areaScrollHeight: 200,
            areaScrollTop: 12
        });
        component.$on('topareaclick', listener);
        component.$on('bottomareaclick', listener);

        const [topArea, bottomArea] = container.querySelectorAll('.item-content-overlay');
        return Promise.all([fireEvent.click(topArea), fireEvent.click(bottomArea)]).then(() => {
            expect(listener).toBeCalledTimes(2);
        });
    });
});
