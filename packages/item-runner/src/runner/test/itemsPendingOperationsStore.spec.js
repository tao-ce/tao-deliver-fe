// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { get } from 'svelte/store';
import { getItemPendingOperationsStore, releaseItemPendingOperationsStore } from '../itemsPendingOperationsStore.js';

describe('item pending operations store', () => {
    afterEach(() => {
        releaseItemPendingOperationsStore('item-1');
        releaseItemPendingOperationsStore('item-2');
    });

    it('should return as empty initially', () => {
        const store = getItemPendingOperationsStore('item-1');
        expect(store.isEmpty()).toBe(true);
    });

    it('should be able to add operation and return isEmpty=false', () => {
        const store = getItemPendingOperationsStore('item-1');
        expect(store.isEmpty()).toBe(true);

        store.add('abc');
        expect(store.isEmpty()).toBe(false);
    });

    it('should be able to delete operation and return isEmpty=true if no other operations', () => {
        const store = getItemPendingOperationsStore('item-1');
        store.add('abc');
        expect(store.isEmpty()).toBe(false);

        store.delete('abc');
        expect(store.isEmpty()).toBe(true);
    });

    it('should be able to delete operation and return isEmpty=false if other operations remain', () => {
        const store = getItemPendingOperationsStore('item-1');
        store.add('abc');
        expect(store.isEmpty()).toBe(false);
        store.delete('abc');
        expect(store.isEmpty()).toBe(true);

        store.add('abc');
        expect(store.isEmpty()).toBe(false);
        store.add('def');
        expect(store.isEmpty()).toBe(false);

        store.delete('def');
        expect(store.isEmpty()).toBe(false);
        store.delete('abc');
        expect(store.isEmpty()).toBe(true);
    });

    it('should get the same store for the same itemIdentifier', () => {
        const store = getItemPendingOperationsStore('item-1');
        store.add('abc');
        const value = get(store);

        expect(get(getItemPendingOperationsStore('item-1'))).toMatchObject(value);
    });

    it('should get another store for another itemIdentifier', () => {
        const store = getItemPendingOperationsStore('item-1');
        store.add('abc');
        const value = get(store);

        expect(get(getItemPendingOperationsStore('item-2'))).not.toMatchObject(value);
    });

    it('clear should clear the store', () => {
        const store = getItemPendingOperationsStore('item-1');
        expect(store.isEmpty()).toBe(true);

        store.add('abc');
        store.add('def');
        expect(store.isEmpty()).toBe(false);

        store.clear();
        expect(store.isEmpty()).toBe(true);
    });

    it('should notify about store changes', () => {
        const onChange = vi.fn();
        const store = getItemPendingOperationsStore('item-1');
        expect(onChange).not.toHaveBeenCalled();

        const unsubscribe = store.subscribe(onChange);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith({ operationKeys: [], lastAddedKey: null, lastDeletedKey: null });
        onChange.mockClear();

        store.add('abc');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lastAddedKey: 'abc' }));
        onChange.mockClear();

        store.add('def');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lastAddedKey: 'def' }));
        onChange.mockClear();

        store.delete('abc');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lastDeletedKey: 'abc' }));
        onChange.mockClear();

        store.delete('def');
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lastDeletedKey: 'def' }));
        onChange.mockClear();

        unsubscribe();
        store.add('xyz');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('releaseItemPendingOperationsStore should release the store', () => {
        const store = getItemPendingOperationsStore('item-1');
        expect(store.isEmpty()).toBe(true);

        store.add('abc');
        store.add('def');
        expect(store.isEmpty()).toBe(false);

        releaseItemPendingOperationsStore('item-1');
        expect(getItemPendingOperationsStore('item1').isEmpty()).toBe(true);
    });
});
