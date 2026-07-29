// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { createGuidedNavFallback } from '../guidedNavFallback.js';
import { clearAllTimersStores, getTimersStore } from '../timersStore.js';

describe('guidedNavFallback', () => {
    const serviceCallId = 'test-session-guided-nav-fallback';
    const itemIdentifier = 'item-1';

    const initializeStore = ({ itemTimeLeft = 1000, extraTimeLeft = 0, minTime = 1000, maxTime = 1000 } = {}) => {
        const store = getTimersStore(serviceCallId);
        store.initializeTimers([
            {
                level: 'item',
                id: itemIdentifier,
                timerValue: {
                    minTime,
                    maxTime,
                    timeAssigned: maxTime,
                    timeLeft: itemTimeLeft
                }
            },
            {
                level: 'extra',
                timerValue: {
                    timeAssigned: extraTimeLeft,
                    timeLeft: extraTimeLeft
                }
            }
        ]);

        return store;
    };

    const createSubject = ({
        store = initializeStore(),
        currentTestPart = { isLinear: true },
        currentItemIdentifier = itemIdentifier,
        paused = false,
        timersInitDone = true
    } = {}) => {
        const stopTimers = vi.fn();
        const onTimeout = vi.fn();
        const timersService = {
            getStore: () => store
        };

        const guidedNavFallback = createGuidedNavFallback({
            getServiceCallId: () => serviceCallId,
            getCurrentTestPart: () => currentTestPart,
            getCurrentItemIdentifier: () => currentItemIdentifier,
            getTimersService: () => timersService,
            isTimersInitDone: () => timersInitDone,
            isPaused: () => paused,
            getRealtimeOptions: () => ({
                enabled: true,
                socketConnectionUrl: 'wss://timers.ngs.test/socket.io'
            }),
            stopTimers,
            onTimeout
        });

        return { guidedNavFallback, stopTimers, onTimeout };
    };

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        clearAllTimersStores();
    });

    it('triggers the timeout flow after item and extra time elapse', async () => {
        const store = initializeStore({ itemTimeLeft: 500, extraTimeLeft: 200 });
        const { guidedNavFallback, stopTimers, onTimeout } = createSubject({ store });

        guidedNavFallback.start();

        await vi.advanceTimersByTimeAsync(699);
        expect(onTimeout).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(stopTimers).toHaveBeenCalledTimes(1);
        expect(onTimeout).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'item',
                id: itemIdentifier,
                timerValue: expect.objectContaining({
                    timeAssigned: 1000,
                    timeLeft: 0
                })
            })
        );
    });

    it('reschedules when the timers store receives a new timeLeft update', async () => {
        const store = initializeStore({ itemTimeLeft: 500 });
        const { guidedNavFallback, onTimeout } = createSubject({ store });

        guidedNavFallback.start();

        store.updateTimeLeft([
            {
                level: 'item',
                id: itemIdentifier,
                timerValue: {
                    timeAssigned: 1000,
                    timeLeft: 1000
                }
            }
        ]);

        await vi.advanceTimersByTimeAsync(999);
        expect(onTimeout).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('handles start errors only while a guided-nav fallback is scheduled', () => {
        const store = initializeStore({ itemTimeLeft: 500 });
        const { guidedNavFallback } = createSubject({ store });

        guidedNavFallback.start();

        expect(guidedNavFallback.isStartErrorHandled(new Error('Failed to start timers'))).toBe(true);

        guidedNavFallback.stop();

        expect(guidedNavFallback.isStartErrorHandled(new Error('Failed to start timers'))).toBe(false);
    });

    it('does not handle start errors for non-guided items', () => {
        const store = initializeStore({ minTime: 500, maxTime: 1000 });
        const { guidedNavFallback } = createSubject({ store });

        guidedNavFallback.start();

        expect(guidedNavFallback.isStartErrorHandled(new Error('Failed to start timers'))).toBe(false);
    });
});
