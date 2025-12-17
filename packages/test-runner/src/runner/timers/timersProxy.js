// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import timerModes from './timerModes.js';
import NetworkError from 'core/error/NetworkError';

/**
 * Create a new interface for timer controls by socket or HTTP communication
 * @param {Object} socketProxy
 * @param {Object} config
 * @param {String} config.mode - 'client' or 'server' - which side controls the running of timers
 * @param {Function} config.onError - callback to propagate errors to consumer
 * @returns {Object} - API allowing the socket client to emit events
 */
export function timersProxyFactory(socketProxy, config = {}) {
    if (!config.mode || !(config.mode in timerModes)) {
        throw new TypeError('config.mode must be a valid timers mode');
    }

    const eventHandlers = new Map();
    const handleEvent = (eventName, payload) => {
        if (eventHandlers[eventName]) {
            eventHandlers[eventName].forEach(handler => {
                handler(payload);
            });
        }
    };

    let api;

    // keep track of both the running state (as known to this timersProxy),
    // so we can ignore any incoming 'refresh-timers' messages received outside of start-stop window,
    // and also the context sent on the last 'start',
    // so we can send it again on reconnect
    let runningContext = null;

    socketProxy.on('refresh-timers', detail => {
        if (runningContext) {
            handleEvent('refresh-timers', detail);
        }
    });
    socketProxy.onProxyEvent('launch', () => {
        // restart timers if they were previously running before disconnect
        if (runningContext) {
            api.start(runningContext);
        }
    });

    api = {
        /**
         * Tell the backend to start all timers matching the given identifiers
         * The message is sent only in client-controlled mode.
         * (the deliveryExecutionId is already known to BE from 'launch-test')
         * @param {Object} testContext
         */
        start(testContext) {
            if (config.mode === timerModes.client) {
                const payload = {
                    testPart: { id: testContext.testPartId },
                    section: { id: testContext.sectionId },
                    item: { id: testContext.itemIdentifier }
                };
                socketProxy.emit('start-timers', payload, ({ processed }) => {
                    if (!processed) {
                        if (typeof config.onError === 'function') {
                            config.onError(new NetworkError('Failed to start timers'));
                        }
                        return;
                    }
                });
            }
            runningContext = testContext;
        },

        /**
         * Tell the backend to stop all timers.
         * The message is sent only in client-controlled mode.
         * (the deliveryExecutionId is already known to BE from 'launch-test')
         */
        stop() {
            if (config.mode === timerModes.client) {
                socketProxy.emit('stop-timers', void 0, ({ processed }) => {
                    if (!processed) {
                        if (typeof config.onError === 'function') {
                            config.onError(new NetworkError('Failed to stop timers'));
                        }
                        return;
                    }
                });
            }
            runningContext = null;
        },

        /**
         * Add a new event handler to this timersProxy
         * @param {String} eventName
         * @param {Function} handler
         */
        on(eventName, handler) {
            if (!eventHandlers[eventName]) {
                eventHandlers[eventName] = [];
            }
            eventHandlers[eventName].push(handler);
        },

        /**
         * Remove an existing event handler from this timersProxy
         * @param {String} eventName
         * @param {Function} handler
         */
        off(eventName, handler) {
            if (eventHandlers[eventName]) {
                eventHandlers[eventName] = eventHandlers[eventName].filter(h => h !== handler);
            }
        }
    };

    return api;
}
