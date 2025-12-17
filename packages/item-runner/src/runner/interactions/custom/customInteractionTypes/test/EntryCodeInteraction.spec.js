// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render } from '@testing-library/svelte';
import EntryCodeInteraction from '../EntryCodeInteraction.svelte';
import { __ } from '@oat-sa-private/ui-core';

vi.mock('../CustomInteractionDefault.svelte', async () => {
    const MockCustomInteractionDefault = (await import('./MockCustomInteractionDefault.svelte')).default;
    return {
        __esModule: true,
        default: MockCustomInteractionDefault
    };
});

const itemIdentifier = 'item-123';

describe('EntryCodeInteraction', () => {
    it('renders default custom interaction component and passes through all props', () => {
        const props = {
            itemIdentifier,
            responseIdentifier: 'abc',
            properties: {
                code: '1234',
                locale: 'en-US'
            },
            classes: 'custom-class'
        };
        const expectedProperties = props.properties;

        const { container } = render(EntryCodeInteraction, {
            props
        });
        expect(container.querySelector('.qti-customInteraction').classList.contains(props.classes)).toBe(true);
        expect(container.querySelector('.exposed-pci-properties').innerHTML).toBe(JSON.stringify(expectedProperties));
    });

    it('overwrites locale prop with global locale', () => {
        vi.spyOn(__, 'getLocale').mockReturnValueOnce('hu-HU');

        const props = {
            itemIdentifier,
            responseIdentifier: 'abc',
            properties: {
                code: '5678'
            }
        };
        const expectedProperties = {
            code: '5678',
            locale: 'hu-HU'
        };

        const { container } = render(EntryCodeInteraction, {
            props
        });
        expect(container.querySelector('.exposed-pci-properties').innerHTML).toBe(JSON.stringify(expectedProperties));
    });
});
