// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import TestOverviewBottomBar from '../TestOverviewBottomBar.svelte';

describe('TestOverviewBottomBar', () => {
    it('renders buttons', () => {
        const { container } = render(TestOverviewBottomBar);
        expect(container).toMatchSnapshot();
    });

    it('fires finish event', () => {
        const { container, component } = render(TestOverviewBottomBar);

        const finishButton = container.querySelector('button[name="overview-finish"]');
        const handleFinish = vi.fn();
        component.$on('finish', handleFinish);
        fireEvent.click(finishButton);

        return tick().then(() => {
            expect(handleFinish).toHaveBeenCalled();
        });
    });

    it('fires close event', () => {
        const { getByText, component } = render(TestOverviewBottomBar);

        const backToQuestionLink = getByText('Go back to the question');
        const handleClose = vi.fn();
        component.$on('close', handleClose);
        fireEvent.click(backToQuestionLink);

        expect(handleClose).toHaveBeenCalled();
    });
});
