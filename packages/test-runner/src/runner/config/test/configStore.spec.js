// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getConfigStore } from '../configStore.js';

describe('getConfigStore', () => {
    afterEach(() => getConfigStore().clear());

    it('creates and returns a new store', () => {
        const store = getConfigStore();
        expect(store.subscribe).toBeTypeOf('function');
        expect(store.set).toBeTypeOf('function');
        expect(store.get).toBeTypeOf('function');
        expect(store.clear).toBeTypeOf('function');
        expect(store.update).toBe(void 0);
    });

    it('retrieves an existing store', () => {
        const store1 = getConfigStore();
        const store2 = getConfigStore();
        expect(store1 === store2).toBe(true);
    });

    it('set/get/clear/subscribe methods', () => {
        const store = getConfigStore();
        const subscribeSpy = vi.fn();
        const unsubscribe = store.subscribe(val => {
            subscribeSpy(val);
        });

        store.set({ abc: 123, def: {} });
        expect(store.get()).toEqual({ abc: 123, def: {} });
        expect(subscribeSpy).toHaveBeenCalledWith({ abc: 123, def: {} });

        store.clear();
        expect(store.get()).toEqual({});
        expect(subscribeSpy).toHaveBeenCalledWith({});

        unsubscribe();
    });
});
