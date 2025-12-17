// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import Overlay from '../Overlay.svelte';
import OverlaySlotsTest from './OverlaySlotsTest.svelte';

describe('Overlay component', () => {
    it('Renders correctly', () => {
        const { container } = render(Overlay, { open: true });
        expect(container).toMatchSnapshot();
        expect(container.querySelector('.overlay').getAttribute('aria-hidden')).toBe('false');
    });

    it('Renders as aria-hidden when closed', () => {
        const { container } = render(Overlay);
        expect(container.querySelector('.overlay')).toBeInTheDocument();
        expect(container.querySelector('.overlay').getAttribute('aria-hidden')).toBe('true');
    });

    it('Renders all named slots', () => {
        const { container } = render(OverlaySlotsTest);
        expect(container).toMatchSnapshot();
    });
});
