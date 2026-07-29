// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import PreviewerHeaderBar from '../PreviewerHeaderBar.svelte';

describe('PreviewerHeaderBar', () => {
    it('renders correctly', () => {
        const { container } = render(PreviewerHeaderBar, {
            itemTitle: 'test item'
        });
        expect(container).toMatchSnapshot();
    });

    it('contains item label', () => {
        const { container } = render(PreviewerHeaderBar, {
            itemTitle: 'test item'
        });
        expect(container.querySelector('.bar-section>.item-name').innerHTML).toContain('test item');
    });

    it('triggers close event', () => {
        const { container, component } = render(PreviewerHeaderBar, {});
        let mockEvent = vi.fn();
        component.$on('close', mockEvent);
        fireEvent.click(container.querySelector('.bar-main-section .actionable'));
        expect(mockEvent).toHaveBeenCalled();
    });

    it('triggers toggle response panel event', () => {
        const { container, component } = render(PreviewerHeaderBar, {});
        let mockEvent = vi.fn();
        component.$on('toggleResponsePanel', mockEvent);
        fireEvent.click(container.querySelector('.bar-reverse-direction .actionable'));
        expect(mockEvent).toHaveBeenCalled();
    });
});
