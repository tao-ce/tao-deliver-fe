// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import TextEntryInteraction from '../TextEntryInteraction.svelte';

const itemIdentifier = 'iabcd';
const responseIdentifier = 'RESPONSE_123';

describe('TextEntryInteraction', () => {
    it('renders input in readonly mode', () => {
        const { container } = render(TextEntryInteraction, {
            props: { itemIdentifier, responseIdentifier }
        });
        expect(container.querySelector('input[readonly]')).toBeInTheDocument();
    });

    it('overrides placeholder with empty value', () => {
        const { container } = render(TextEntryInteraction, {
            props: { itemIdentifier, responseIdentifier, placeholder: 'ABC' }
        });
        const input = container.querySelector('input[readonly]');
        expect(input).toHaveAttribute('placeholder', '');
    });
});
