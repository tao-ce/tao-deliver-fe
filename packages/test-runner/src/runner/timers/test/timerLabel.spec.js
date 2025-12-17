// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getExtraTimeApplicableLevels, getTimerLabel, getTimerLabelForLevel } from '../timerLabel.js';
import { getTimersStore, clearAllTimersStores } from '../timersStore.js';

describe('timerLabel util', () => {
    const serviceCallId = 'test-session-123afdhj';

    const testContext = {
        itemIdentifier: 'i4',
        sectionId: 's3',
        testPartId: 'p1'
    };

    const sampleTimerData = [
        {
            level: 'item',
            id: 'i3',
            timerValue: {
                timeAssigned: 2 * 10 * 1000,
                timeLeft: 10 * 1000,
                timeStr: '10s',
                readableTimeStr: '10 seconds'
            }
        },
        {
            level: 'item',
            id: 'i4',
            timerValue: {
                timeAssigned: 2 * 59 * 60 * 1000,
                timeLeft: 59 * 60 * 1000,
                timeStr: '59min',
                readableTimeStr: '59 minutes'
            }
        },
        {
            level: 'section',
            id: 's2',
            timerValue: {
                timeAssigned: 2 * 8 * 60 * 1000,
                timeLeft: 8 * 60 * 1000,
                timeStr: '8min',
                readableTimeStr: '8 minutes'
            }
        },
        {
            level: 'section',
            id: 's3',
            timerValue: {
                timeAssigned: 2 * 60 * 60 * 1000,
                timeLeft: 30 * 60 * 1000,
                timeStr: '30min',
                readableTimeStr: '30 minutes'
            }
        },
        {
            level: 'testPart',
            id: 'p1',
            timerValue: {
                timeAssigned: 2 * (2 * 60 * 60 * 1000 + 7 * 60 * 1000),
                timeLeft: 2 * 60 * 60 * 1000 + 7 * 60 * 1000,
                timeStr: '2h 7min',
                readableTimeStr: '2 hours 7 minutes'
            }
        },
        {
            level: 'test',
            timerValue: {
                timeAssigned: 2 * 2 * 60 * 60 * 1000,
                timeLeft: 2 * 60 * 60 * 1000,
                timeStr: '2h',
                readableTimeStr: '2 hours'
            }
        },
        {
            level: 'extra',
            timerValue: {
                timeAssigned: 0,
                timeLeft: 0,
                timeStr: '0s',
                readableTimeStr: '0 seconds'
            }
        }
    ];

    afterEach(() => {
        clearAllTimersStores();
    });

    describe('getExtraTimeApplicableLevels', () => {
        it('returns empty array if extra-time but no normal timers', () => {
            const timersStore = getTimersStore(serviceCallId);
            timersStore.initializeTimers([
                {
                    level: 'extra',
                    timerValue: {
                        timeAssigned: 60000,
                        timeLeft: 60000,
                        timeStr: '1min'
                    }
                }
            ]);
            expect(getExtraTimeApplicableLevels(testContext, timersStore)).toEqual([]);
        });

        it('returns array quth level of: smallest timer by time then by level', () => {
            const timersStore = getTimersStore(serviceCallId);
            timersStore.initializeTimers([
                ...sampleTimerData.slice(0, 6),
                {
                    level: 'extra',
                    timerValue: {
                        timeAssigned: 60000,
                        timeLeft: 60000,
                        timeStr: '1min'
                    }
                }
            ]);
            expect(getExtraTimeApplicableLevels(testContext, timersStore)).toEqual(['section']);

            timersStore.initializeTimers([
                ...sampleTimerData.slice(0, 6).map(i => ({
                    ...i,
                    timerValue: {
                        timeAssigned: 2 * 8 * 60 * 1000,
                        timeLeft: 8 * 60 * 1000,
                        timeStr: '8min'
                    }
                })),
                {
                    level: 'extra',
                    timerValue: {
                        timeAssigned: 60000,
                        timeLeft: 60000,
                        timeStr: '1min'
                    }
                }
            ]);
            expect(getExtraTimeApplicableLevels(testContext, timersStore)).toEqual(['item']);
        });

        it('returns array with level of smallest timer, even if no extra-time', () => {
            const timersStore = getTimersStore(serviceCallId);
            timersStore.initializeTimers(sampleTimerData);

            expect(getExtraTimeApplicableLevels(testContext, timersStore)).toEqual(['section']);
        });
    });

    describe('getTimerLabel', () => {
        const levelTimer = {
            level: 'test',
            timerValue: {
                timeAssigned: 130000,
                timeLeft: 120000,
                timeStr: 'Tmin',
                readableTimeStr: 'T minutes'
            }
        };
        const extraTimer = {
            level: 'extra',
            timerValue: {
                timeAssigned: 70000,
                timeLeft: 60000,
                timeStr: 'Emin',
                readableTimeStr: 'E minutes'
            }
        };

        it('if no timer, returns empty object', () => {
            expect(getTimerLabel(null, extraTimer)).toEqual({});
        });

        it('if timer time > 0 and no applicable extra timer', () => {
            expect(getTimerLabel(levelTimer, null)).toEqual({
                label: 'Tmin',
                ariaLabel: 'T minutes'
            });
        });

        it('if timer time = 0 and no applicable extra timer', () => {
            expect(
                getTimerLabel({ ...levelTimer, timerValue: { ...levelTimer.timerValue, timeLeft: 0 } }, null)
            ).toEqual({
                label: '',
                ariaLabel: ''
            });
        });

        it('if timer time > 0 and if extra time = 0', () => {
            expect(
                getTimerLabel(levelTimer, { ...extraTimer, timerValue: { ...extraTimer.timerValue, timeLeft: 0 } })
            ).toEqual({
                label: 'Tmin',
                ariaLabel: 'T minutes'
            });
        });

        it('if timer time = 0 and extra time = 0', () => {
            expect(
                getTimerLabel(
                    { ...levelTimer, timerValue: { ...levelTimer.timerValue, timeLeft: 0 } },
                    { ...extraTimer, timerValue: { ...extraTimer.timerValue, timeLeft: 0 } }
                )
            ).toEqual({
                label: '',
                ariaLabel: ''
            });
        });

        it('if timer time > 0 and if extra time > 0', () => {
            expect(getTimerLabel(levelTimer, extraTimer)).toEqual({
                label: 'Tmin (+ Emin)',
                ariaLabel: 'T minutes, extra time E minutes'
            });
        });

        it('if timer time = 0 and if extra time = 0', () => {
            expect(
                getTimerLabel(
                    {
                        ...levelTimer,
                        timerValue: { ...levelTimer.timerValue, timeLeft: 0, readableTimeStr: '0 minutes' }
                    },
                    extraTimer
                )
            ).toEqual({
                label: '(+ Emin)',
                ariaLabel: '0 minutes, extra time E minutes'
            });
        });
    });

    describe('getTimerLabelForLevel', () => {
        it('returns labels for timer of this level in this testContext', () => {
            const timersStore = getTimersStore(serviceCallId);
            timersStore.initializeTimers(sampleTimerData);
            expect(getTimerLabelForLevel('section', testContext, timersStore)).toEqual({
                label: '30min',
                ariaLabel: '30 minutes'
            });
        });

        it('with extra if extra is applicable to this level', () => {
            const timersStore = getTimersStore(serviceCallId);
            timersStore.initializeTimers([
                ...sampleTimerData.slice(0, 6),
                {
                    level: 'extra',
                    timerValue: {
                        timeAssigned: 60000,
                        timeLeft: 60000,
                        timeStr: '1min',
                        readableTimeStr: '1 minute'
                    }
                }
            ]);
            expect(getTimerLabelForLevel('section', testContext, timersStore)).toEqual({
                label: '30min (+ 1min)',
                ariaLabel: '30 minutes, extra time 1 minute'
            });
        });

        it('without extra if extra is not applicable to this level', () => {
            const timersStore = getTimersStore(serviceCallId);
            timersStore.initializeTimers([
                ...sampleTimerData.slice(0, 6),
                {
                    level: 'extra',
                    timerValue: {
                        timeAssigned: 60000,
                        timeLeft: 60000,
                        timeStr: '1min',
                        readableTimeStr: '1 minute'
                    }
                }
            ]);
            expect(getTimerLabelForLevel('item', testContext, timersStore)).toEqual({
                label: '59min',
                ariaLabel: '59 minutes'
            });
        });
    });
});
