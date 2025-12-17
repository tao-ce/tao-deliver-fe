// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import DeepLinks from './DeepLinks.svelte';

import * as deliverServiceMock from '../service/deliverService';
vi.mock('../service/deliverService', () => ({
    getBatteries: vi.fn().mockReturnValue({
        data: [
            {
                id: '11',
                name: 'Bat 1'
            },
            {
                id: '12',
                name: 'Bat 2'
            }
        ]
    }),
    getDeliveries: vi.fn().mockReturnValue({
        data: [
            {
                id: '1',
                name: 'QTI Interactions with ttsmath old'
            },
            {
                id: '2',
                name: 'QTI Interactions with ttsmath'
            }
        ]
    }),
    submitBatteriesAndDeliveries: vi.fn().mockReturnValue({ url: 'https://example.com/lti13' })
}));

describe('DeepLinks page', () => {
    it('should render', () => {
        const { container } = render(DeepLinks, {
            props: {
                isMultiSelectEnabled: false,
                hideBatteries: true,
                hideDeliveries: true
            }
        });

        expect(container).toMatchSnapshot();
    });

    it('show deliveries', () => {
        const { getAllByRole, getByText } = render(DeepLinks, {
            props: {
                isMultiSelectEnabled: true,
                hideBatteries: false,
                hideDeliveries: false
            }
        });
        const tabs = getAllByRole('tab');

        // Click on each tab
        tabs.forEach(async tab => {
            fireEvent.click(tab);
            await Promise.resolve();

            if (tab.textContent.trim() === 'Batteries') {
                expect(getByText('Link selected')).toBeInTheDocument();
            } else if (tab.textContent.trim() === 'Deliveries') {
                expect(getByText('Published delivery ID')).toBeInTheDocument();
            }
        });
        expect.assertions(2);
    });

    it('should link selected and redirect', async () => {
        const originalLocation = window.location.href;

        // Mock window.location with a writable href property
        delete global.window.location;
        global.window.location = { href: originalLocation, writable: true };

        const { getByLabelText, getByText } = render(DeepLinks, {
            props: {
                isMultiSelectEnabled: true,
                hideBatteries: true,
                hideDeliveries: false
            }
        });
        fireEvent.click(getByLabelText('Select All'));
        fireEvent.click(getByText('Link selected'));

        expect(deliverServiceMock.getDeliveries).toHaveBeenCalled();
        expect(deliverServiceMock.submitBatteriesAndDeliveries).toHaveBeenCalled();
        await Promise.resolve();

        expect(global.window.location.href).toBe('https://example.com/lti13');

        global.window.location.href = originalLocation;
        expect.assertions(3);
    });
});
