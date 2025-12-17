// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { timersProxyFactory } from './timersProxy.js';
import timerModes from './timerModes.js';
import { getTimersStore } from './timersStore.js';
import { cloneDeep } from 'lodash';

/**
 * Creates timersService object with methods to control timers
 * @param {Object} socketProxy
 * @param {Object} config
 * @param {String} config.mode
 * @param {String} config.serviceCallId - identifier used by the local store
 * @param {Function} config.onError - callback to propagate errors to consumer
 * @param {Function} [config.onTimerTimeout] - callback to propagate timeouts to consumer
 * @param {Function} [config.onExtraAdded] - callback when extra-time is added: it will resume timers that were timed-out earlier
 * @param {Object} [config.throttleConfig]
 * @returns {Object} API
 */
export function timersServiceFactory(socketProxy, config) {
    if (!config.serviceCallId) {
        throw new TypeError('config.serviceCallId must be provided');
    }
    if (!config.mode || !(config.mode in timerModes)) {
        throw new TypeError('config.mode must be a valid timers mode');
    }

    const store = getTimersStore(config.serviceCallId, {
        throttleConfig: config.throttleConfig
    });

    // subscribe to changes in order to report whenever timers time out
    let prevTimersArray = [];
    const unsubscribe = store.subscribe(stored => {
        /** @type {TimerData[]} */
        let timedOutTimers = [];

        const prevExtra = prevTimersArray.find(t => t.level === 'extra'); //if `setInitialData` executed, it will always exist
        const currentExtra = stored.timersArray.find(t => t.level === 'extra');
        if (prevExtra && prevExtra.timerValue.timeLeft <= 0 && currentExtra && currentExtra.timerValue.timeLeft > 0) {
            if (typeof config.onExtraAdded === 'function') {
                config.onExtraAdded();
            }
        } else {
            for (const timerData of stored.timersArray) {
                if (timerData.level !== 'extra') {
                    const prevTimerData = prevTimersArray.find(
                        t => t.level === timerData.level && (!timerData.id || t.id === timerData.id)
                    );
                    if (prevTimerData) {
                        const wasTimedOut =
                            prevTimerData.timerValue.timeLeft + (prevExtra ? prevExtra.timerValue.timeLeft : 0) <= 0;
                        const isTimedOut =
                            timerData.timerValue.timeLeft + (currentExtra ? currentExtra.timerValue.timeLeft : 0) <= 0;
                        if (!wasTimedOut && isTimedOut) {
                            timedOutTimers.push(timerData);
                        }
                    }
                }
            }
            if (timedOutTimers.length) {
                if (typeof config.onTimerTimeout === 'function') {
                    config.onTimerTimeout(); // details will be checked from runner side, where we have testContext
                }
            }
        }

        prevTimersArray = cloneDeep(stored.timersArray);
    });

    // just create a timersProxy: need to open socket connection using API
    const timersProxy = timersProxyFactory(socketProxy, {
        mode: config.mode,
        onError: config.onError
    });

    timersProxy.on('refresh-timers', msg => {
        const timersData = [];

        if (msg.test) {
            timersData.push({
                level: 'test',
                timerValue: {
                    timeLeft: msg.test.maxTimeRemaining,
                    timeAssigned: msg.test.maxTime
                }
            });
        }
        if (msg.testPart) {
            timersData.push({
                level: 'testPart',
                id: msg.testPart.id,
                timerValue: {
                    timeLeft: msg.testPart.maxTimeRemaining,
                    timeAssigned: msg.testPart.maxTime
                }
            });
        }
        if (msg.section) {
            timersData.push({
                level: 'section',
                id: msg.section.id,
                timerValue: {
                    timeLeft: msg.section.maxTimeRemaining,
                    timeAssigned: msg.section.maxTime
                }
            });
        }
        if (msg.item) {
            timersData.push({
                level: 'item',
                id: msg.item.id,
                timerValue: {
                    minTime: msg.item.minTime,
                    timeLeft: msg.item.maxTimeRemaining,
                    timeAssigned: msg.item.maxTime
                }
            });
        }
        if (msg.extra) {
            timersData.push({
                level: 'extra',
                timerValue: {
                    timeLeft: msg.extra.maxTimeRemaining,
                    timeAssigned: msg.extra.maxTime
                }
            });
        } else {
            timersData.push({
                level: 'extra',
                timerValue: {
                    timeLeft: 0,
                    timeAssigned: 0
                }
            });
        }

        store.updateTimeLeft(timersData);
    });

    const service = {
        mode: config.mode,

        /**
         * Transform the timer definitions object received from server on /init
         * and set the result into a store
         * @param {Object} initialTimersData
         * @param {Object} [initialTimersData.test]
         * @param {Object[]} [initialTimersData.testParts]
         * @param {Object[]} [initialTimersData.sections]
         * @param {Object[]} [initialTimersData.items]
         * @param {Object} [initialTimersData.extra]
         */
        setInitialData(initialTimersData) {
            const timersData = [];
            //extra may not be in initial definition, but be added later, and then be removed again
            if (!initialTimersData['extra']) {
                initialTimersData = Object.assign({}, initialTimersData, {
                    extra: { maxTime: 0, maxTimeRemaining: 0 }
                });
            }

            if (initialTimersData) {
                ['test', 'extra'].forEach(levelName => {
                    if (levelName in initialTimersData && initialTimersData[levelName]) {
                        const initialTimer = initialTimersData[levelName];
                        timersData.push({
                            level: levelName,
                            timerValue: {
                                timeLeft: initialTimer.maxTimeRemaining,
                                timeAssigned: initialTimer.maxTime
                            }
                        });
                    }
                });
                ['testParts', 'sections', 'items'].forEach(levelName => {
                    if (levelName in initialTimersData && initialTimersData[levelName]) {
                        initialTimersData[levelName].forEach(initialTimer => {
                            timersData.push({
                                level: levelName.replace(/s$/, ''), // level names are singular
                                id: initialTimer.id,
                                timerValue: {
                                    minTime: initialTimer.minTime,
                                    maxTime: initialTimer.maxTime,
                                    timeLeft: initialTimer.maxTimeRemaining,
                                    timeAssigned: initialTimer.maxTime
                                }
                            });
                        });
                    }
                });
            }

            store.initializeTimers(timersData);
        },

        //call when item is rendered
        start(testContext) {
            timersProxy.start(testContext);
        },

        //call when item is unloaded
        stop() {
            timersProxy.stop();
        },

        /**
         * @returns {Observable<*>}
         */
        getStore() {
            return store;
        },

        /**
         * Call at the end of the test session to disconnect socket and remove local store subscription
         */
        destroy() {
            unsubscribe();
            store.clear();
        }
    };

    return service;
}
