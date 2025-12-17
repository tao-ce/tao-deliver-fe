// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import store from 'core/store';

export default function queueFactory(options) {
    const queue = [];
    const { id, bufferSize, flush } = options;

    const queueInstance = {
        get id() {
            return id;
        },
        get size() {
            return queue.length;
        },
        /**
         * Gets queue store
         * @returns {Promise<Store>}
         */
        getStore() {
            return store('messageQueue', store.backends.sessionStorage);
        },
        /**
         * Enqueue message
         * @param {any[]} message
         * @returns {Promise}
         */
        enqueue(message) {
            if (Array.isArray(message)) {
                queue.push(...message);
            } else {
                queue.push(message);
            }

            if (this.size >= bufferSize) {
                return this.flush();
            }
            return this.backup();
        },
        /**
         * Flushes queue and call flush action function provided during queue creation
         * @returns {Promise}
         */
        flush() {
            if (this.size === 0) {
                return Promise.resolve();
            }
            const messages = queue.splice(0, this.size);

            /**
             * Chunks the queue by bufferSize, so it can be flushed in multiple smaller parts
             * @param {any[]} toBeChunked
             * @returns {any[][]}
             */
            const chunkMessages = (toBeChunked = []) => {
                const chunks = [];
                while (toBeChunked.length) {
                    chunks.push(toBeChunked.splice(0, bufferSize));
                }
                return chunks;
            };

            return Promise.allSettled(
                chunkMessages(messages)
                    .map(chunk => flush(chunk)
                        .catch(() => {
                            // If a single flushed chunk fails, put that chunk back in the queue
                            queue.unshift(...chunk);
                        })
                    )
            ).then(() => this.backup());
        },
        /**
         * Clears the queue completely and removes it from storage
         * @returns {Promise}
         */
        clear() {
            // Clear the in-memory queue
            queue.length = 0;
            // Remove from storage
            return this.getStore().then(messageStore => messageStore.removeItem(this.id));
        },
        /**
         * Saves queue in browser storage
         * @returns {Promise}
         */
        backup() {
            return this.getStore().then(messageStore => {
                if (this.size === 0) {
                    return messageStore.removeItem(this.id);
                }
                return messageStore.setItem(this.id, JSON.stringify(queue));
            });
        },
        /**
         * Restores queue from browser storage
         * @returns {Promise}
         */
        restore() {
            return this.getStore()
                .then(messageStore => messageStore.getItem(this.id))
                .then(storedQueue => {
                    if (storedQueue) {
                        queue.unshift(...JSON.parse(storedQueue));
                    }
                });
        }
    };

    return queueInstance.restore().then(() => queueInstance);
}
