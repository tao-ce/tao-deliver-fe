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

    it('fires submit event', () => {
        const { container, component } = render(TestOverviewBottomBar);

        const submitButton = container.querySelector('button[name="overview-submit"]');
        const onsubmit = vi.fn();
        component.$on('submit', onsubmit);
        fireEvent.click(submitButton);

        return tick().then(() => {
            expect(onsubmit).toHaveBeenCalled();
        });
    });

    it('fires close event', () => {
        const { getByText, component } = render(TestOverviewBottomBar);

        const backToQuestionLink = getByText('Go back to the question');
        const onBack = vi.fn();
        component.$on('close', onBack);
        fireEvent.click(backToQuestionLink);

        expect(onBack).toHaveBeenCalled();
    });

    it('renders in disabled state', () => {
        const { container } = render(TestOverviewBottomBar, { props: { disabled: true } });
        const submitButton = container.querySelector('button[name="overview-submit"]');
        expect(submitButton.disabled).toBe(true);
    });
});
