// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getItemToolsStateStore, releaseItemToolsStateStore } from '../itemsToolsStateStore.js';

describe('tool state store', () => {
    afterEach(() => {
        releaseItemToolsStateStore('item-1');
        releaseItemToolsStateStore('item-2');
    });

    it('should return empty object with default store', () => {
        const toolsStateStore = getItemToolsStateStore('item-1');
        expect(Object.keys(toolsStateStore.get()).length).toBe(0);
    });

    it('should provide previously stored data', () => {
        const toolsStateStore = getItemToolsStateStore('item-1');
        const state = { scratchpad: { data: 123 } };
        toolsStateStore.set(state);

        expect(toolsStateStore.get()).toMatchObject(state);
        expect(toolsStateStore.getToolState('scratchpad')).toMatchObject(state.scratchpad);
    });

    it('should provide access to structured state', () => {
        const toolsStateStore = getItemToolsStateStore('item-1');
        toolsStateStore.setElementToolState('choiceElimination', 'RESPONSE_1', ['c1', 'c2']);

        expect(toolsStateStore.get()).toMatchObject({
            choiceElimination: { RESPONSE_1: ['c1', 'c2'] }
        });
        expect(toolsStateStore.getElementToolState('choiceElimination', 'RESPONSE_1')).toEqual(['c1', 'c2']);
        expect(toolsStateStore.getElementToolState('choiceElimination', 'RESPONS')).toBeUndefined();
    });

    it('should notify about store changes', () => {
        const onChange = vi.fn();
        const toolsStateStore = getItemToolsStateStore('item-1');
        const unsubscribe = toolsStateStore.subscribe(onChange);

        toolsStateStore.setToolState('highlighter', [1, 2]);
        expect(onChange).toHaveBeenLastCalledWith({ highlighter: [1, 2] });

        toolsStateStore.set({});
        expect(onChange).toHaveBeenLastCalledWith({});

        unsubscribe();
        toolsStateStore.set({ choiceElimination: false });
        expect(onChange).toHaveBeenCalledTimes(3); // there is an initial call on subscribe
    });

    it('should not notify about store changes in another item state', () => {
        const onChange = vi.fn();
        const toolsStateStore = getItemToolsStateStore('item-1');
        const toolsStateStoreTwo = getItemToolsStateStore('item-2');
        const unsubscribe = toolsStateStore.subscribe(onChange);

        toolsStateStoreTwo.set({ highlighter: [12] });
        expect(onChange).toHaveBeenCalledTimes(1); // only the inital call on subscribe

        toolsStateStoreTwo.set({});
        expect(onChange).toHaveBeenCalledTimes(1); // only the inital call on subscribe

        unsubscribe();
    });

    it('should get the same store for the same itemIdentifier', () => {
        const state = { choiceElimination: { RESPONSE: ['C1', 'C2'] } };
        const toolsStateStore = getItemToolsStateStore('item-1');
        expect(toolsStateStore.get()).toMatchObject({});

        toolsStateStore.set(state);
        expect(toolsStateStore.get()).toMatchObject(state);

        expect(getItemToolsStateStore('item-1')).toBe(toolsStateStore);
        expect(getItemToolsStateStore('item-1').get()).toMatchObject(state);
    });

    it('should release the store', () => {
        const toolsStateStore = getItemToolsStateStore('item-1');
        expect(toolsStateStore.get()).toMatchObject({});

        toolsStateStore.setToolState('lineReader', 132);
        expect(toolsStateStore.get()).toMatchObject({ lineReader: 132 });

        releaseItemToolsStateStore('item-1');
        expect(getItemToolsStateStore('item1').get()).toMatchObject({});
    });
});
