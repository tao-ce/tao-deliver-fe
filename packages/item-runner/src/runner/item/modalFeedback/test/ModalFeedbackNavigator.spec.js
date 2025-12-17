// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import ModalFeedbackNavigator from '../ModalFeedbackNavigator.svelte';

describe('ModalFeedbackNavigator', () => {
    it('renders and sends event on "continue" button click', () => {
        const { container, component } = render(ModalFeedbackNavigator, {});
        expect(container).toMatchSnapshot();

        const continueSpy = vi.fn();
        component.$on('modalFeedbackContinue', continueSpy);
        const continueBtn = container.querySelector('button');
        continueBtn.click();
        expect(continueSpy).toHaveBeenCalled();
    });
});
