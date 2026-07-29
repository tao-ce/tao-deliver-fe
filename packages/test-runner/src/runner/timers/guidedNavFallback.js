// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { isNavigationDisabledByTimers } from './navigation.js';

/**
 * Create guided navigation fallback scheduler for cases when the final realtime timer update is missed.
 * @param {Object} config
 * @param {Function} config.getServiceCallId
 * @param {Function} config.getCurrentTestPart
 * @param {Function} config.getCurrentItemIdentifier
 * @param {Function} config.getTimersService
 * @param {Function} config.isTimersInitDone
 * @param {Function} config.isPaused
 * @param {Function} config.getRealtimeOptions
 * @param {Function} config.stopTimers
 * @param {Function} config.onTimeout
 * @returns {{start: Function, stop: Function, isStartErrorHandled: Function}}
 */
export function createGuidedNavFallback(config) {
    let timeoutId = null;
    let unsubscribe = null;

    const clearTimeoutId = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    const stop = () => {
        clearTimeoutId();
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
    };

    const isActive = itemIdentifier => {
        try {
            return isNavigationDisabledByTimers(config.getServiceCallId(), config.getCurrentTestPart(), itemIdentifier);
        } catch {
            return false;
        }
    };

    const triggerTimeout = itemIdentifier => {
        const timersService = config.getTimersService();
        if (
            !timersService ||
            !config.isTimersInitDone() ||
            config.isPaused() ||
            config.getCurrentItemIdentifier() !== itemIdentifier ||
            !isActive(itemIdentifier)
        ) {
            return;
        }

        const latestItemTimer = timersService.getStore().getTimerFor('item', itemIdentifier);
        if (!latestItemTimer?.timerValue) {
            return;
        }

        stop();
        config.stopTimers();
        config.onTimeout({
            ...latestItemTimer,
            timerValue: { ...latestItemTimer.timerValue, timeLeft: 0 }
        });
    };

    const schedule = () => {
        clearTimeoutId();
        const timersService = config.getTimersService();
        const realtimeOptions = config.getRealtimeOptions();
        if (
            !timersService ||
            !config.isTimersInitDone() ||
            config.isPaused() ||
            !realtimeOptions?.enabled ||
            !realtimeOptions?.socketConnectionUrl
        ) {
            return;
        }

        const itemIdentifier = config.getCurrentItemIdentifier();
        if (!isActive(itemIdentifier)) {
            return;
        }

        const store = timersService.getStore();
        const itemTimer = store.getTimerFor('item', itemIdentifier);
        const extraTimer = store.getTimerFor('extra');
        const timeLeft = (itemTimer?.timerValue?.timeLeft ?? 0) + (extraTimer?.timerValue?.timeLeft ?? 0);
        if (!itemTimer?.timerValue || timeLeft <= 0) {
            return;
        }

        timeoutId = setTimeout(() => {
            timeoutId = null;
            triggerTimeout(itemIdentifier);
        }, timeLeft);
    };

    const start = () => {
        stop();
        const timersService = config.getTimersService();
        const realtimeOptions = config.getRealtimeOptions();
        if (!timersService || !realtimeOptions?.enabled || !realtimeOptions?.socketConnectionUrl) {
            return;
        }
        unsubscribe = timersService.getStore().subscribe(schedule);
    };

    return {
        start,
        stop,
        isStartErrorHandled: err =>
            err?.message === 'Failed to start timers' &&
            timeoutId !== null &&
            isActive(config.getCurrentItemIdentifier())
    };
}
