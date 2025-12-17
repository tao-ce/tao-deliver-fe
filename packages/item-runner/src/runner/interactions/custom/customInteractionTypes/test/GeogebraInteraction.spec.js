// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import GeogebraInteraction from '../GeogebraInteraction.svelte';

vi.mock('../CustomInteractionDefault.svelte', async () => {
    const MockCustomInteractionDefault = (await import('./MockCustomInteractionDefault.svelte')).default;
    return {
        __esModule: true,
        default: MockCustomInteractionDefault
    };
});

const itemIdentifier = 'item-123';

describe('GeogebraInteraction', () => {
    it('renders default custom interaction component and passes through all props', () => {
        const props = {
            itemIdentifier,
            responseIdentifier: 'abc',
            properties: { hello: { xyz: 123 } },
            classes: 'ghi'
        };
        const { container } = render(GeogebraInteraction, {
            props
        });
        expect(container.querySelector('.qti-customInteraction').classList.contains(props.classes)).toBe(true);
        expect(container.querySelector('.exposed-pci-properties').innerHTML).toBe(JSON.stringify(props.properties));
    });
});
