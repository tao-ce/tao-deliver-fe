// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('core/store', () => {
    const store = () =>
        Promise.resolve({
            getItem(id) {
                return Promise.resolve(store._storage[id]);
            },
            setItem(id, item) {
                store._storage[id] = item;
                return Promise.resolve(true);
            },
            removeItem(id) {
                delete store._storage[id];
                return Promise.resolve(true);
            },
            clear() {
                store._storage = {};
                return Promise.resolve(true);
            }
        });
    store._storage = {};
    store.backends = {
        sessionStorage: 'sessionStorage'
    };
    return {
        __esModule: true,
        default: store
    };
});

import store from 'core/store';
import queueFactory from '../queue.js';

describe('queueFactory', () => {
    const id = 'my-queue';
    afterEach(async () => {
        const storage = await store();
        await storage.clear();
    });

    it('should enqueue messages', async () => {
        const bufferSize = 4;
        const queue = await queueFactory({ id, bufferSize });

        await queue.enqueue(12);
        await queue.enqueue(['message 2', { foo: 'bar' }]);

        expect(queue.size).toEqual(3);
        expect(store._storage[id]).toEqual(JSON.stringify([12, 'message 2', { foo: 'bar' }]));
    });

    it('should flush the queue when it is full', async () => {
        const flush = vi.fn().mockReturnValue(Promise.resolve());

        const queue = await queueFactory({
            id,
            bufferSize: 2,
            flush
        });

        await queue.enqueue('message 1');
        await queue.enqueue('message 2');

        expect(flush).toHaveBeenCalledTimes(1);
        expect(flush.mock.calls[0][0]).toEqual(['message 1', 'message 2']);
        expect(queue.size).toEqual(0);
    });

    it('should restore the queue from storage', async () => {
        const bufferSize = 4;
        store._storage[id] = JSON.stringify([12, { foo: 'bar' }]);

        const queue = await queueFactory({
            id,
            bufferSize
        });

        await queue.enqueue('new message');

        expect(queue.size).toEqual(3);
        expect(store._storage[id]).toEqual(JSON.stringify([12, { foo: 'bar' }, 'new message']));
    });

    it('requeues messages if flush does not succeed', async () => {
        const flush = vi.fn().mockRejectedValue(new Error('flush error'));

        const queue = await queueFactory({
            id,
            bufferSize: 2,
            flush
        });

        await queue.enqueue('message 1');
        await queue.enqueue('message 2');

        expect(flush).toHaveBeenCalledTimes(1);
        expect(queue.size).toEqual(2);
    });
});
