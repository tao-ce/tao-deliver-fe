// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { writable, get } from 'svelte/store';
import { humanizeDurationVisual, humanizeDurationSpeakable } from '@oat-sa-private/ui-core';
import { itemPathForPosition } from '../util/testMap.js';

const defaultThrottleConfig = {
    minutesThreshold: 10
};

/**
 * @param {object} config
 * @param {object} [config.throttleConfig]
 * @returns {Observable<*>} the store
 */
function createTimersStore(config = {}) {
    config.throttleConfig = config.throttleConfig || defaultThrottleConfig;

    const { subscribe, set, update } = writable({ timersArray: [] });

    return {
        subscribe,
        update,
        set,
        get() {
            return get(this);
        },
        clear() {
            set({ timersArray: [] });
        },

        /**
         * @typedef TimerData
         * @property {String} level (or scope?) - test|testPart|section|item|extra
         * @property {String} id - identifier of testPart|section|item
         * @property {Object} timerValue
         * @property {Number} timerValue.timeLeft
         * @property {String} timerValue.timeStr
         * @property {Number} timerValue.timeAssigned
         */

        /**
         * Sets initial timer values into store
         * @param {TimerData[]} timersDataArray
         */
        initializeTimers(timersDataArray) {
            update(stored => {
                stored.timersArray = timersDataArray;
                stored.timersArray.forEach(timerData => {
                    timerData.timerValue.timeStr = humanizeDurationVisual(
                        timerData.timerValue.timeLeft,
                        config.throttleConfig
                    );
                    timerData.timerValue.readableTimeStr = humanizeDurationSpeakable(
                        timerData.timerValue.timeLeft,
                        config.throttleConfig
                    );
                });
                return stored;
            });
        },

        /**
         * Updates timer values in store
         * @param {TimerData[]} timersDataArray
         */
        updateTimeLeft(timersDataArray) {
            update(stored => {
                timersDataArray.forEach(newTimerData => {
                    const timerData = this.getTimerFor(newTimerData.level, newTimerData.id);
                    if (timerData && timerData.timerValue) {
                        timerData.timerValue.timeAssigned = newTimerData.timerValue.timeAssigned;
                        timerData.timerValue.timeLeft = newTimerData.timerValue.timeLeft;

                        timerData.timerValue.timeStr = humanizeDurationVisual(
                            timerData.timerValue.timeLeft,
                            config.throttleConfig
                        );
                        timerData.timerValue.readableTimeStr = humanizeDurationSpeakable(
                            timerData.timerValue.timeLeft,
                            config.throttleConfig
                        );
                    }
                });
                return stored;
            });
        },

        /**
         * Get one timer from the store, by its level and identifier
         * @param {String} level - test|testPart|section|item|extra
         * @param {String} [id] - identifier of testPart|section|item
         * @returns {TimerData|undefined}
         */
        getTimerFor(level, id) {
            const timersArray = get(this).timersArray;
            let timerData;

            if (['test', 'extra'].includes(level)) {
                timerData = timersArray.find(t => t.level === level);
            } else if (['testPart', 'section', 'item'].includes(level)) {
                timerData = timersArray.find(t => t.level === level && t.id === id);
            }
            return timerData;
        },

        /**
         * Get the list of 0-5 timers defined for the given context
         * Sorted by level: test, testPart, section, item, extra
         * @param {Object} testContext
         * @param {Boolean} includeExtra
         * @returns {TimerData[]}
         */
        getTimersForContext(testContext, includeExtra = true) {
            const timersForContext = [
                this.getTimerFor('test'),
                this.getTimerFor('testPart', testContext.testPartId),
                this.getTimerFor('section', testContext.sectionId),
                this.getTimerFor('item', testContext.itemIdentifier),
                includeExtra ? this.getTimerFor('extra') : null
            ].filter(Boolean);

            return timersForContext;
        },

        /**
         * Check if the given context has a timer which is timed out.
         * 'extra' time is granted for the whole test, so it gives additional time to all existing timers.
         * 'extra' time starts to be used on context only when other timers for this context have timed-out;
         *    if you move to another context, it may be that 'extra' is already exhausted, but new 'normal' timers are still running
         * @param {Object} testContext
         * @returns {Boolean}
         */
        isContextTimedOut(testContext) {
            const extraTimer = this.getTimerFor('extra');
            const extraTime = extraTimer ? extraTimer.timerValue.timeLeft : 0;

            const timersForContextExceptExtra = this.getTimersForContext(testContext, false);
            return timersForContextExceptExtra.some(timerData => timerData.timerValue.timeLeft + extraTime <= 0);
        },

        /**
         * For item at position, check if any timer on this level or higher has no remaining time
         * @param {Number} itemPosition
         * @param {Object} testMap
         * @returns {Boolean}
         */
        isPositionTimedOut(itemPosition, testMap) {
            const { testPartId, sectionId, itemId } = itemPathForPosition(testMap, itemPosition);
            return this.isContextTimedOut({ testPartId, sectionId, itemIdentifier: itemId });
        },

        /**
         * Check if min and max timers are equal
         * @param {string} itemIdentifier - item id
         * @returns {boolean} - Returns true if min and max timers are equal
         */
        isMinMaxEqual(itemIdentifier) {
            if (!itemIdentifier) {
                return false;
            }
            const itemTimerDefinition = this.getTimerFor('item', itemIdentifier);
            if (!itemTimerDefinition) {
                return false;
            }
            const minTime = itemTimerDefinition.timerValue.minTime;
            const maxTime = itemTimerDefinition.timerValue.maxTime;

            if (minTime && maxTime && minTime === maxTime) {
                return true;
            }

            return false;
        }
    };
}

//keep the stores for multiple test sessions (by serviceCallId)
const stores = new Map();

/**
 * Get an existing or create a new timersStore
 * @param {String} serviceCallId
 * @param {object} config
 * @param {object} [config.throttleConfig]
 * @returns {SvelteStore}
 */
export function getTimersStore(serviceCallId, config) {
    if (!serviceCallId) {
        throw new TypeError('serviceCallId must be provided');
    }

    let timersStore;
    if (stores.has(serviceCallId)) {
        timersStore = stores.get(serviceCallId);
    } else {
        timersStore = createTimersStore(config);
        stores.set(serviceCallId, timersStore);
    }
    return timersStore;
}

/**
 * Clear all stores and stop all subscriptions for all test sessions
 */
export function clearAllTimersStores() {
    //eslint-disable-next-line no-unused-vars
    for (const [mapkey, store] of stores) {
        store.clear();
    }
    // empty the Map too
    stores.clear();
}
