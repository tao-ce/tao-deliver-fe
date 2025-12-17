// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Acts as simplified backend timers service
 * @returns {Object}
 */
function timersFactory() {
    let timersStore = {};
    let context = {};
    let refreshRate = 1000;
    let interval;

    const listeners = {};

    function trigger(eventName, parameters) {
        const eventListeners = listeners[eventName];
        if (eventListeners) {
            eventListeners.forEach(eventListener => {
                eventListener(parameters);
            });
        }
    }

    // select relevant timers from timersStore
    function getContextTimers() {
        return {
            test: timersStore.test,
            extra: timersStore.extra,
            testPart: timersStore.testParts?.find(testPart => testPart.id === context.testPart?.id),
            section: timersStore.sections?.find(section => section.id === context.section?.id),
            item: timersStore.items?.find(item => item.id === context.item?.id)
        };
    }

    function subtractTime(timer, delta) {
        if (timer?.maxTime && timer.maxTimeRemaining > 0) {
            timer.maxTimeRemaining = Math.max(0, timer.maxTimeRemaining - delta);
        }
    }

    function subtractAllTime(delta) {
        // if any context timer is timed out, consume some extra time
        if (Object.values(getContextTimers()).some(timer => timer?.maxTime && timer.maxTimeRemaining <= 0)) {
            subtractTime(timersStore.extra, delta);
        }

        // single timer types
        subtractTime(timersStore.test, delta);

        // array timer types
        ['testParts', 'sections', 'items'].forEach(levelName => {
            if (timersStore[levelName]) {
                const contextKey = levelName.slice(0, -1); // drop suffix s
                const relevantTimer = timersStore[levelName].find(timer => timer.id === context[contextKey]?.id);
                subtractTime(relevantTimer, delta);
            }
        });
    }

    return {
        get running() {
            return interval !== null;
        },
        start(timersContext) {
            console.log('timers.start'); // eslint-disable-line no-console
            context = timersContext;
            clearInterval(interval);
            interval = setInterval(() => {
                subtractAllTime(refreshRate);
                trigger('time-update', getContextTimers());
            }, refreshRate);
        },
        stop() {
            console.log('timers.stop'); // eslint-disable-line no-console
            clearInterval(interval);
            interval = null;
            context = {};
        },
        on(eventName, callback) {
            if (!listeners[eventName]) {
                listeners[eventName] = [callback];
            } else {
                listeners[eventName].push(callback);
            }
        },
        off(eventName, listener) {
            if (listeners[eventName]) {
                listeners[eventName] = listeners[eventName].filter(handler => handler !== listener);
            }
        },
        setTimersData(timersData) {
            timersStore = timersData;
        },
        setExtraTime(extraTimeMs) {
            timersStore.extra.maxTime = extraTimeMs;
            timersStore.extra.maxTimeRemaining = extraTimeMs;
        }
    };
}

export const timers = timersFactory();
