// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getItemsStore } from '../itemsStore.js';

describe('itemsStore', () => {
    const item1 = {
        baseUrl: './assets/',
        itemIdentifier: 'item1',
        itemData: {},
        itemState: null
    };
    const item2 = {
        baseUrl: './assets/',
        itemIdentifier: 'item2',
        itemData: {},
        itemState: {
            foo: 'bar'
        }
    };

    afterEach(() => {
        const itemStore = getItemsStore('foo');
        itemStore.clear();
    });

    it('should fail without a serviceCallId', () => {
        expect(() => getItemsStore()).toThrow(TypeError);
    });

    it('should retrieve an existing store by matching serviceCallId', () => {
        const store1 = getItemsStore('foo');
        store1.set({ first: 'time' });

        const store2 = getItemsStore('foo');
        expect(store2.get()).toEqual({ first: 'time' });
    });

    describe('config', () => {
        it('should get the default config first', () => {
            const itemStore = getItemsStore('foo');
            expect(itemStore.getConfig()).toEqual({
                ttl: 1800000,
                capacity: Infinity
            });
        });

        it('should set & get a full config', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setConfig({
                ttl: 42,
                capacity: 9
            });
            expect(itemStore.getConfig()).toEqual({
                ttl: 42,
                capacity: 9
            });
        });

        it('should set & get a partial config', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setConfig({
                ttl: 42
            });
            expect(itemStore.getConfig()).toEqual({
                ttl: 42,
                capacity: Infinity
            });
        });

        it('should change a config', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setConfig({
                ttl: 42
            });

            itemStore.setConfig({
                ttl: 24
            });
            expect(itemStore.getConfig()).toEqual({
                ttl: 24,
                capacity: Infinity
            });
        });

        it('should set & get different configs for different sessions', () => {
            const itemStoreA = getItemsStore('fooA');
            const itemStoreB = getItemsStore('fooB');
            itemStoreA.setConfig({
                capacity: 9
            });
            itemStoreB.setConfig({
                capacity: 10
            });
            expect(itemStoreA.getConfig()).toEqual({
                ttl: 1800000,
                capacity: 9
            });
            expect(itemStoreB.getConfig()).toEqual({
                ttl: 1800000,
                capacity: 10
            });
        });
    });

    describe('get/set', () => {
        it('should return an initial state', () => {
            const itemStore = getItemsStore('foo');
            expect(itemStore.get()).toEqual({});
        });

        it('should return the whole state', () => {
            const value = { someData: [12, 13] };
            const itemStore = getItemsStore('foo');
            itemStore.set(value);
            expect(itemStore.get()).toEqual(value);
        });

        it('should support multiple stores', () => {
            const value = { someOtherData: [11, 7] };
            const fooItemStore = getItemsStore('foo');
            const barItemStore = getItemsStore('bar');

            barItemStore.set(value);
            expect(barItemStore.get()).toEqual(value);
            expect(fooItemStore.get()).toEqual({});
        });
    });

    describe('getItem/setItem', () => {
        it('should get an item by id', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setItem('item1', item1);
            expect(itemStore.getItem('item1')).toEqual(item1);
        });

        it('should not get a missing item', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setItem('item1', item1);

            expect(itemStore.getItem()).toBeFalsy();
            expect(itemStore.getItem('notanitem')).toBeFalsy();
        });

        it('should set an existing item at full capacity, without removing anything', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setConfig({ capacity: 2 });

            itemStore.setItem('item1', 'oldItem1');
            itemStore.setItem('item2', 'oldItem2');
            expect(itemStore.keys()).toEqual(['item1', 'item2']);

            itemStore.setItem('item1', 'newItem1');
            expect(itemStore.keys()).toEqual(['item1', 'item2']);
            expect(itemStore.getItem('item1')).toBe('newItem1');
        });
    });

    describe('updateItem', () => {
        it('should update an existing item by id', () => {
            const itemState = { snoo: 'snar' };
            const itemStore = getItemsStore('foo');
            itemStore.setItem('item1', item1);
            itemStore.updateItem('item1', { itemState });
            expect(itemStore.getItem('item1')).toEqual({
                baseUrl: './assets/',
                itemIdentifier: 'item1',
                itemData: {},
                itemState
            });
        });

        it('should do nothing if item missing', () => {
            const itemStore = getItemsStore('foo');
            itemStore.updateItem('item1', item1);
            expect(itemStore.getItem('item1')).toEqual(null);
        });
    });

    describe('has/hasItemState', () => {
        it('has (has not) item by id', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setItem('item1', item1);
            expect(itemStore.has('item1')).toBe(true);
            expect(itemStore.has('item2')).toBe(false);
        });

        it('item has (has not) itemState', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setItem('item1', item1);
            itemStore.setItem('item2', item2);
            expect(itemStore.hasItemState('item1')).toBe(false);
            expect(itemStore.hasItemState('item2')).toBe(true);
        });
    });

    describe('removeItem/clear', () => {
        it('should remove a single entry', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setItem('item1', item1);
            const sample1 = itemStore.getItem('item1');
            expect(sample1).toEqual(item1);

            itemStore.removeItem('item1');
            expect(itemStore.size()).toBe(0);
            const sample2 = itemStore.getItem('item1');
            expect(sample2).toBe(null);
        });

        it('should clear the store', () => {
            const value = { someData: [0, 1, 2, 3] };
            const itemStore = getItemsStore('foo');

            itemStore.set(value);
            expect(itemStore.get()).toEqual(value);

            itemStore.clear();
            expect(itemStore.get()).toEqual({});
        });

        it('should clear only one store', () => {
            const fValue = { someOtherData: [1, 5] };
            const bValue = { someOtherData: [1, 5] };
            const fooItemStore = getItemsStore('foo');
            const barItemStore = getItemsStore('bar');

            fooItemStore.set(fValue);
            barItemStore.set(bValue);

            expect(fooItemStore.get()).toEqual(fValue);
            expect(barItemStore.get()).toEqual(bValue);

            fooItemStore.clear();

            expect(fooItemStore.get()).toEqual({});
            expect(barItemStore.get()).toEqual(bValue);
        });
    });

    describe('subscription', () => {
        it('should notify about store changes', () => {
            const onChange = vi.fn();
            const value = { someData: [12, 13] };
            const itemStore = getItemsStore('foo');
            const unsubscribe = itemStore.subscribe(onChange);

            itemStore.set(value);
            expect(onChange).toHaveBeenLastCalledWith(value);
            expect(onChange).toHaveBeenCalledTimes(2); // there is an initial call on subscribe

            unsubscribe();
        });

        it('should notify about store changes only for a given serviceCallId', () => {
            const onChange1 = vi.fn();
            const onChange2 = vi.fn();
            const value = { someNewData: [true, 13] };
            const itemStore1 = getItemsStore('foo');
            const itemStore2 = getItemsStore('bar');
            const unsubscribe1 = itemStore1.subscribe(onChange1);
            const unsubscribe2 = itemStore2.subscribe(onChange2);

            itemStore1.set(value);
            expect(onChange1).toHaveBeenLastCalledWith(value);
            expect(onChange1).toHaveBeenCalledTimes(2); // there is an initial call on subscribe

            expect(onChange2).toHaveBeenCalledTimes(1); //subscription call

            unsubscribe1();
            unsubscribe2();
        });

        it('should stop listening after unsubscribe', () => {
            const onChange = vi.fn();
            const value = { someData: [12, 13] };
            const itemStore = getItemsStore('foo');
            const unsubscribe = itemStore.subscribe(onChange);

            itemStore.set(value);
            expect(onChange).toHaveBeenLastCalledWith(value);
            expect(onChange).toHaveBeenCalledTimes(2);

            unsubscribe();

            itemStore.set(value);
            expect(onChange).toHaveBeenCalledTimes(2);
        });
    });

    describe('expiry', () => {
        beforeEach(() => {
            vi.useFakeTimers('modern');
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it('should not get an expired item', () => {
            const now = Date.now();

            const itemStore = getItemsStore('foo');
            itemStore.setConfig({ ttl: 500 });
            itemStore.setItem('item1', item1);
            expect(itemStore.getItem('item1')).toEqual(item1);

            vi.setSystemTime(new Date(now.valueOf() + 550));

            expect(itemStore.getItem('item1')).toBeFalsy();
        });

        it('should set an item with a timestamp', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setItem('item1', item1);

            const res = itemStore.get()['item1'];

            expect(typeof res).toBe('object');
            expect(typeof res.timestamp).toBe('number');
            expect(typeof res.definition).toBe('object');
            expect(res.definition).toEqual(item1);
        });

        it('should auto-remove an expired entry when retrieved', () => {
            const now = Date.now();

            const itemStore = getItemsStore('foo');
            itemStore.setConfig({ ttl: 100 });

            itemStore.setItem('item1', item1);
            expect(itemStore.size()).toBe(1);

            vi.setSystemTime(new Date(now.valueOf() + 200));

            expect(itemStore.getItem('item1')).toBe(null);
            expect(itemStore.size()).toBe(0);
        });

        it('should preserve all non-expired items', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setConfig({ ttl: 1000 });

            itemStore.setItem('item1', item1);
            itemStore.setItem('item2', {});
            expect(itemStore.size()).toBe(2);

            itemStore.removeExpired();
            expect(itemStore.size()).toBe(2);
        });

        it('should remove all expired items', () => {
            const now = Date.now();

            const itemStore = getItemsStore('foo');
            itemStore.setConfig({ ttl: 1000 });

            itemStore.setItem('item1', item1);
            itemStore.setItem('item2', {});
            expect(itemStore.keys()).toEqual(['item1', 'item2']);

            vi.setSystemTime(new Date(now.valueOf() + 500));

            itemStore.removeExpired();
            expect(itemStore.keys()).toEqual(['item1', 'item2']);
            itemStore.setItem('item3', {});

            vi.setSystemTime(new Date(now.valueOf() + 1050));

            itemStore.removeExpired();
            expect(itemStore.keys()).toEqual(['item3']);
        });

        it('should not get an item with expired asset urls', () => {
            const historicItem = {
                baseUrl: './assets/',
                itemIdentifier: 'item2',
                itemData: {
                    assets: {
                        img: {
                            '1.jpg': 'https://example.cdn/abc/1.jpg?Expires=12345',
                            '2.png': 'http://example.cdn/abc/2.png',
                            '3.webp': '//example.cdn/abc/3.webp?timestamp=123456'
                        },
                        audio: {
                            '1.mp3': 'https://example.cdn/abc/1.mp3?Expires=123456',
                            '2.ogg': 'https://example.cdn/abc/2.ogg?Expires='
                        }
                    }
                },
                itemState: null
            };
            const futuristicItem = {
                baseUrl: './assets/',
                itemIdentifier: 'item3',
                itemData: {
                    assets: {
                        img: {
                            '1.jpg': 'https://example.cdn/abc/1.jpg?Expires=1999999999',
                            '2.png': 'https://example.cdn/abc/2.png',
                            '3.webp': '//example.cdn/abc/3.webp?timestamp=1999999999'
                        },
                        audio: {
                            '1.mp3': 'https://example.cdn/abc/1.mp3?Expires=1999999999',
                            '2.ogg': 'https://example.cdn/abc/2.ogg?Expires='
                        }
                    }
                },
                itemState: null
            };

            const itemStore = getItemsStore('foo');

            itemStore.setItem('item2', historicItem);
            itemStore.setItem('item3', futuristicItem);
            expect(itemStore.keys()).toEqual(['item2', 'item3']);

            expect(itemStore.getItem('item2')).toBe(null);
            expect(itemStore.getItem('item3')).toEqual(futuristicItem);
            expect(itemStore.keys()).toEqual(['item3']);

            itemStore.setItem('item2', historicItem);
            expect(itemStore.keys()).toEqual(['item3', 'item2']);

            itemStore.removeExpired();
            expect(itemStore.keys()).toEqual(['item3']);
        });
    });

    describe('miscellaneous', () => {
        it('should return store keys', () => {
            const itemStore = getItemsStore('foo');
            expect(itemStore.keys()).toEqual([]);

            itemStore.setItem('item1', item1);
            expect(itemStore.keys()).toEqual(['item1']);

            itemStore.setItem('item2', {});
            expect(itemStore.keys()).toEqual(['item1', 'item2']);
        });

        it('should return store size', () => {
            const itemStore = getItemsStore('foo');
            expect(itemStore.size()).toBe(0);

            itemStore.setItem('item1', item1);
            expect(itemStore.size()).toBe(1);

            itemStore.setItem('not-an-item', 'but-a-string');
            expect(itemStore.size()).toBe(2);
        });
    });

    describe('oldest', () => {
        it('should find oldest entry id', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setItem('item1', 'i1');
            itemStore.setItem('item2', 'i2');
            itemStore.setItem('item3', 'i3');
            expect(itemStore.getOldest()).toEqual('item1');

            itemStore.removeItem('item1');
            expect(itemStore.getOldest()).toBe('item2');

            itemStore.removeItem('item2');
            expect(itemStore.getOldest()).toBe('item3');
        });

        it('cannot find oldest entry if none available', () => {
            const itemStore = getItemsStore('foo');
            itemStore.set({ 'not-an-item': 'but-something-else' });
            expect(itemStore.getOldest()).toEqual(null);
        });

        it('should remove oldest entry when capacity reached', () => {
            const itemStore = getItemsStore('foo');
            itemStore.setConfig({ capacity: 2 });

            itemStore.setItem('item1', 'i1');
            itemStore.setItem('item2', 'i2');
            expect(itemStore.size()).toBe(2);
            expect(Object.keys(itemStore.get())).toEqual(['item1', 'item2']);

            itemStore.setItem('item3', 'i3');
            expect(itemStore.size()).toBe(2);
            expect(Object.keys(itemStore.get())).toEqual(['item2', 'item3']);
        });
    });
});
