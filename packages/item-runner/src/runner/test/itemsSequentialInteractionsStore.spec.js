// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { get } from 'svelte/store';
import {
    getItemSequentialInteractionsStore,
    releaseItemSequentialInteractionsStore
} from '../itemsSequentialInteractionsStore.js';
import { getItemStateStore } from '../itemsStateStore.js';

describe('Item sequential interactions store', () => {
    const itemStateStore = getItemStateStore('item-1');

    afterEach(() => {
        releaseItemSequentialInteractionsStore('item-1');
        itemStateStore.clear();
    });

    describe('Map of stores', () => {
        it('should get the same store for the same itemIdentifier', () => {
            const seq1 = getItemSequentialInteractionsStore('item-1');
            expect(get(seq1.currentResponseIdentifier)).toBe(null);

            seq1.register('a');
            seq1.start('a');
            expect(get(seq1.currentResponseIdentifier)).toBe('a');

            const seq2 = getItemSequentialInteractionsStore('item-1');
            expect(get(seq2.currentResponseIdentifier)).toBe('a');
        });

        it('should release the store if called', () => {
            const seq1 = getItemSequentialInteractionsStore('item-1');
            seq1.register('a');
            expect(seq1.length).toBe(1);

            releaseItemSequentialInteractionsStore('item-1');

            const seq2 = getItemSequentialInteractionsStore('item-1');
            expect(seq2.length).toBe(0);
        });
    });

    describe('API', () => {
        it('has expected properties and methods', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            expect(typeof seq).toBe('object');
            expect(typeof seq.currentResponseIdentifier).toBe('object');
            expect(typeof seq.currentResponseIdentifier.subscribe).toBe('function');
            expect(typeof seq.didStart).toBe('boolean');
            expect(typeof seq.completedTimes).toBe('number');
            expect(typeof seq.length).toBe('number');
            expect(typeof seq.loadState).toBe('function');
            expect(typeof seq.saveState).toBe('function');
            expect(typeof seq.register).toBe('function');
            expect(typeof seq.start).toBe('function');
            expect(typeof seq.finish).toBe('function');
            expect(typeof seq.clear).toBe('function');
        });

        it('does not share state between instances', () => {
            const seq1 = getItemSequentialInteractionsStore('item-1');
            const seq2 = getItemSequentialInteractionsStore('item-2');
            expect(seq1 === seq2).toBe(false);
            seq1.register('a');
            seq2.register('b');
            seq1.start('a');
            seq2.start('b');
            expect(get(seq1.currentResponseIdentifier)).toBe('a');
            expect(get(seq2.currentResponseIdentifier)).toBe('b');
            releaseItemSequentialInteractionsStore('item-2');
        });
    });

    describe('length', () => {
        it('reports correct value', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            expect(seq.length).toBe(0);
            seq.register('a');
            expect(seq.length).toBe(1);
            seq.register('b');
            seq.register('c');
            expect(seq.length).toBe(3);
            seq.clear();
            expect(seq.length).toBe(0);
            expect(get(seq.currentResponseIdentifier)).toBe(null);
        });
    });

    describe('register', () => {
        it('registers an interaction', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            expect(seq.length).toBe(1);
            expect(get(seq.currentResponseIdentifier)).toBe(null);
        });

        it('throws if registering an interaction with same id twice', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            expect(() => {
                seq.register('a');
            }).toThrow();
        });
    });

    describe('start', () => {
        it('starts sequence at a named interaction', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            seq.register('b');
            seq.start('b');
            expect(get(seq.currentResponseIdentifier)).toBe('b');
            seq.start('a');
            expect(get(seq.currentResponseIdentifier)).toBe('a');
        });

        it('starts sequence from the top', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            seq.register('b');
            seq.start();
            expect(get(seq.currentResponseIdentifier)).toBe('a');
        });

        it("doesn't start from the top if already started", () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            seq.register('b');
            seq.start('b');
            expect(get(seq.currentResponseIdentifier)).toBe('b');
            seq.start();
            expect(get(seq.currentResponseIdentifier)).toBe('b');
        });
    });

    describe('finish', () => {
        it('advances sequence to next interaction', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            seq.register('b');
            seq.start('a');
            expect(get(seq.currentResponseIdentifier)).toBe('a');
            seq.finish('a');
            expect(get(seq.currentResponseIdentifier)).toBe('b');
        });

        it('finishes sequence when last interaction active', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            seq.register('b');
            seq.start('b');
            seq.finish('b');
            expect(get(seq.currentResponseIdentifier)).toBe(null);
        });

        it('does nothing if called with inactive interaction', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            seq.register('b');
            seq.start('a');
            expect(get(seq.currentResponseIdentifier)).toBe('a');
            seq.finish('b');
            expect(get(seq.currentResponseIdentifier)).toBe('a');
        });
    });

    describe('clear', () => {
        it('clears the sequence', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            seq.register('b');
            seq.start('a');
            seq.clear();
            expect(seq.length).toBe(0);
            expect(get(seq.currentResponseIdentifier)).toBe(null);
        });
    });

    describe('item state', () => {
        it('loads item state initially', () => {
            itemStateStore.set({
                interaction_sequence: {
                    currentResponseIdentifier: 'a',
                    completedTimes: 3
                }
            });

            const seq = getItemSequentialInteractionsStore('item-1');
            expect(get(seq.currentResponseIdentifier)).toBe('a');
            expect(seq.completedTimes).toBe(3);
        });

        it('saves item state after start', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('b');
            seq.start('b');
            expect(get(seq.currentResponseIdentifier)).toBe('b');
            expect(itemStateStore.get()).toEqual({
                interaction_sequence: {
                    currentResponseIdentifier: 'b',
                    completedTimes: 0
                }
            });
        });

        it('saves item state after finish', () => {
            const seq = getItemSequentialInteractionsStore('item-1');
            seq.register('a');
            seq.register('b');
            seq.start('a');
            expect(get(seq.currentResponseIdentifier)).toBe('a');
            expect(itemStateStore.get()).toEqual({
                interaction_sequence: {
                    currentResponseIdentifier: 'a',
                    completedTimes: 0
                }
            });
            seq.finish('a');
            expect(get(seq.currentResponseIdentifier)).toBe('b');
            expect(itemStateStore.get()).toEqual({
                interaction_sequence: {
                    currentResponseIdentifier: 'b',
                    completedTimes: 0
                }
            });
            seq.finish('b');
            expect(get(seq.currentResponseIdentifier)).toBe(null);
            expect(itemStateStore.get()).toEqual({
                interaction_sequence: {
                    currentResponseIdentifier: null,
                    completedTimes: 1
                }
            });
        });
    });
});
