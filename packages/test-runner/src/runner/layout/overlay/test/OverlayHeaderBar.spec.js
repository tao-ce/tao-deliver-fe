// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import OverlayHeaderBar from '../OverlayHeaderBar.svelte';

describe('OverlayHeaderBar component', () => {
    it('Renders with defaults', () => {
        const { container } = render(OverlayHeaderBar);
        expect(container).toMatchSnapshot();
    });

    it('Renders correctly with custom heading & icon', () => {
        const heading = 'Test Heading';
        const icon = 'arrow-left';
        const disableCloseBtn = true;
        const { container } = render(OverlayHeaderBar, { heading, icon, disableCloseBtn });
        expect(container).toMatchSnapshot();
    });

    it('Fires close event', () => {
        const onClose = vi.fn();
        const { container, component } = render(OverlayHeaderBar);
        component.$on('close', onClose);
        const button = container.querySelector('button');
        button.click();
        expect(onClose).toHaveBeenCalled();
    });
});
