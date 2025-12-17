// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { get } from 'svelte/store';
import { getItemSettingsStore, releaseItemSettingsStore } from '../itemsSettingsStore.js';

describe('item settings store', () => {
    const exampleItemState = {
        choiceElimination: true
    };

    afterEach(() => {
        releaseItemSettingsStore('item-1');
        releaseItemSettingsStore('item-2');
    });

    it('should return empty object as initial settings', () => {
        const itemSettingsStore = getItemSettingsStore('item-1');
        expect(Object.keys(get(itemSettingsStore)).length).toBe(0);
    });

    it('should provide previously stored data', () => {
        const itemSettingsStore = getItemSettingsStore('item-1');
        itemSettingsStore.set(exampleItemState);

        expect(get(itemSettingsStore)).toMatchObject(exampleItemState);
    });

    it('should notify about store changes', () => {
        const onChange = vi.fn();
        const itemSettingsStore = getItemSettingsStore('item-1');
        const unsubscribe = itemSettingsStore.subscribe(onChange);

        itemSettingsStore.set(exampleItemState);
        expect(onChange).toHaveBeenLastCalledWith(exampleItemState);

        itemSettingsStore.set({});
        expect(onChange).toHaveBeenLastCalledWith({});

        unsubscribe();
        itemSettingsStore.set({ choiceElimination: false });
        expect(onChange).toHaveBeenCalledTimes(3); // there is an initial call on subscribe
    });

    it('should not notify about store changes in another item state', () => {
        const onChange = vi.fn();
        const itemSettingsStore = getItemSettingsStore('item-1');
        const itemSettingsStoreTwo = getItemSettingsStore('item-2');
        const unsubscribe = itemSettingsStore.subscribe(onChange);

        itemSettingsStoreTwo.set(exampleItemState);
        expect(onChange).toHaveBeenCalledTimes(1); // only the inital call on subscribe

        itemSettingsStoreTwo.set({});
        expect(onChange).toHaveBeenCalledTimes(1); // only the inital call on subscribe

        unsubscribe();
    });

    it('should get the same store for the same itemIdentifier', () => {
        const itemSettingsStore = getItemSettingsStore('item-1');
        expect(get(itemSettingsStore)).toMatchObject({});

        itemSettingsStore.set(exampleItemState);
        expect(get(itemSettingsStore)).toMatchObject(exampleItemState);

        expect(getItemSettingsStore('item-1')).toBe(itemSettingsStore);
        expect(get(getItemSettingsStore('item-1'))).toMatchObject(exampleItemState);
    });

    it('should release the store if called', () => {
        const itemSettingsStore = getItemSettingsStore('item-1');
        expect(get(itemSettingsStore)).toMatchObject({});

        itemSettingsStore.set(exampleItemState);
        expect(get(itemSettingsStore)).toMatchObject(exampleItemState);

        releaseItemSettingsStore('item-1');
        expect(get(getItemSettingsStore('item1'))).toMatchObject({});
    });

    it('should check for enabled settings key', () => {
        const itemSettingsStore = getItemSettingsStore('item-1');
        expect(get(itemSettingsStore)).toMatchObject({});

        itemSettingsStore.set({
            _disabledKeys: ['choiceElimination', 'settingsKey1'],
            choiceElimination: false,
            enabledKey: false
        });

        expect(itemSettingsStore.isEnabled('enabledKey')).toBe(true);

        expect(itemSettingsStore.isEnabled('')).toBe(false);
        expect(itemSettingsStore.isEnabled('choiceElimination')).toBe(false);
        // if the key is missing from settings it's considered disabled
        expect(itemSettingsStore.isEnabled('settingsKey1')).toBe(false);
    });
});
