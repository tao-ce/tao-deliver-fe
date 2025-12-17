// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// Mock must come before any imports that might use it
vi.mock('../MediaInteractionImpl.svelte', async () => {
    const MockMediaInteractionImpl = await import('./MockMediaInteractionImpl.svelte');
    return {
        default: MockMediaInteractionImpl.default
    };
});

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import MediaInteraction from '../MediaInteraction.svelte';
import { getItemSettingsStore, releaseItemSettingsStore } from '../../../itemsSettingsStore.js';
import { getItemSequentialInteractionsStore } from '../../../itemsSequentialInteractionsStore.js';

const itemIdentifier = 'item-123';

describe('MediaInteraction - Wrapper', () => {
    const sequence = getItemSequentialInteractionsStore(itemIdentifier);

    afterEach(() => {
        releaseItemSettingsStore(itemIdentifier);
        sequence.clear();
    });

    it('renders actual MediaInteraction', () => {
        const props = {
            itemIdentifier,
            responseIdentifier: 'abc',
            autostart: 'def',
            classes: 'ghi',
            hello: { xyz: 123 }
        };
        const { container } = render(MediaInteraction, {
            props
        });
        const elem = container.querySelector('.mock-media-interaction');
        expect(elem).toBeTruthy();
        expect(elem.innerHTML).toBe(JSON.stringify(props));
    });

    it('renders nothing if doNotPlayMedia setting', () => {
        const itemSettingsStore = getItemSettingsStore(itemIdentifier);
        itemSettingsStore.set({ doNotPlayMedia: true });

        const props = {
            itemIdentifier,
            responseIdentifier: 'abc',
            autostart: 'def',
            classes: 'ghi',
            hello: { xyz: 123 }
        };
        const { container } = render(MediaInteraction, {
            props
        });
        const elem = container.querySelector('.mock-media-interaction');
        expect(elem).toBeFalsy();
    });

    it('re-mounts if doNotPlayMedia setting changes', async () => {
        const itemSettingsStore = getItemSettingsStore(itemIdentifier);

        const props = {
            itemIdentifier,
            responseIdentifier: 'abc',
            autostart: 'def',
            classes: 'ghi',
            hello: { xyz: 123 }
        };
        const { container } = render(MediaInteraction, {
            props
        });

        const elem1 = container.querySelector('.mock-media-interaction');
        expect(elem1).toBeTruthy();

        itemSettingsStore.set({ doNotPlayMedia: true });
        await tick();
        const elem2 = container.querySelector('.mock-media-interaction');
        expect(elem2).toBeFalsy();

        itemSettingsStore.set({ doNotPlayMedia: false });
        await tick();
        const elem3 = container.querySelector('.mock-media-interaction');
        expect(elem3).toBeTruthy();
        expect(elem3 === elem1).toBe(false);
    });

    it('if sequential, registers in the sequence', async () => {
        const registerSpy = vi.spyOn(sequence, 'register');
        const itemSettingsStore = getItemSettingsStore(itemIdentifier);

        const props = {
            itemIdentifier,
            responseIdentifier: 'abc',
            autostart: true,
            classes: 'sequential'
        };
        render(MediaInteraction, {
            props
        });

        expect(registerSpy).toHaveBeenCalled();
        registerSpy.mockClear();

        itemSettingsStore.set({ doNotPlayMedia: true });
        await tick();
        itemSettingsStore.set({ doNotPlayMedia: false });
        await tick();
        expect(registerSpy).not.toHaveBeenCalled();
    });
});
