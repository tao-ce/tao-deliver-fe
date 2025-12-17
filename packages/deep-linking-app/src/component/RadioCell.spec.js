// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import RadioCell from './RadioCell.svelte';

describe('RadioButton component', () => {
    it('should render', () => {
        const { getByTitle } = render(RadioCell, { props: { data: { value: 'test-value' } } });

        expect(getByTitle('Radio button')).toBeInTheDocument();
    });

    it('should be selected when clicked', async () => {
        const { container, getByTitle } = render(RadioCell, { props: { data: { value: 'test-value' } } });
        const radioCell = getByTitle('Radio button');
        const radioButton = container.querySelector('input[type="radio"]');

        await fireEvent.click(radioCell);

        expect(radioButton).toBeChecked();
    });

    it('should dispatch action when clicked', async () => {
        const { getByTitle, component } = render(RadioCell, { props: { data: { value: 'test-value' } } });
        const radioCell = getByTitle('Radio button');

        const mockDispatch = vi.fn();
        component.$on('action', mockDispatch);

        await fireEvent.click(radioCell);

        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({ detail: { type: 'select', options: { checked: true } } })
        );
    });
});
