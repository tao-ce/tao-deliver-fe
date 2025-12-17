// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getTimersStore, clearAllTimersStores } from '../timersStore.js';
import { cloneDeep } from 'lodash';

const timersDataArray = [
    {
        level: 'test',
        id: 'test-1',
        timerValue: {
            timeAssigned: 120000,
            timeLeft: 105000,
            timeStr: '1m 45s',
            readableTimeStr: '1 minute 45 seconds'
        }
    },
    {
        level: 'testPart',
        id: 'testPart-1',
        timerValue: {
            timeAssigned: 50000,
            timeLeft: 35000,
            timeStr: '35s',
            readableTimeStr: '35 seconds'
        }
    },
    {
        level: 'section',
        id: 'assessmentSection-1',
        timerValue: {
            timeAssigned: 40000,
            timeLeft: 25000,
            timeStr: '25s',
            readableTimeStr: '25 seconds'
        }
    },
    {
        level: 'item',
        id: 'item-1',
        timerValue: {
            timeAssigned: 30000,
            timeLeft: 15000,
            timeStr: '15s',
            readableTimeStr: '15 seconds'
        }
    },
    {
        level: 'item',
        id: 'item-2',
        timerValue: {
            timeAssigned: 20000,
            timeLeft: 0,
            timeStr: '0s',
            readableTimeStr: '0 seconds'
        }
    },
    {
        level: 'extra',
        timerValue: {
            timeAssigned: 0,
            timeLeft: 0,
            timeStr: '0',
            readableTimeStr: '0 seconds'
        }
    }
];

const timersDataArrayWithExtra = [
    ...timersDataArray.slice(0, 5),
    {
        level: 'extra',
        timerValue: {
            timeAssigned: 18000,
            timeLeft: 14000,
            timeStr: '14s',
            readableTimeStr: '14 seconds'
        }
    }
];

describe('timersStore', () => {
    afterEach(() => clearAllTimersStores());

    describe('API', () => {
        it('should fail if not called with a serviceCallId', () => {
            expect(() => getTimersStore()).toThrow(TypeError);
            expect(() => getTimersStore(null)).toThrow(TypeError);
        });

        it('creates and returns a new store', () => {
            const store = getTimersStore('abc');
            expect(store.subscribe).toBeTypeOf('function');
            expect(store.update).toBeTypeOf('function');
            expect(store.set).toBeTypeOf('function');
            expect(store.get).toBeTypeOf('function');
            expect(store.clear).toBeTypeOf('function');
            expect(store.initializeTimers).toBeTypeOf('function');
            expect(store.updateTimeLeft).toBeTypeOf('function');
            expect(store.getTimerFor).toBeTypeOf('function');
            expect(store.getTimersForContext).toBeTypeOf('function');
            expect(store.isContextTimedOut).toBeTypeOf('function');
        });

        it('retrieves an existing store', () => {
            const store1 = getTimersStore('def');
            store1.set({ foo: true });

            const store2 = getTimersStore('def');
            expect(store2.subscribe).toBeTypeOf('function');
            expect(store2.update).toBeTypeOf('function');
            expect(store2.set).toBeTypeOf('function');
            expect(store2.get).toBeTypeOf('function');
            expect(store2.clear).toBeTypeOf('function');
            expect(store2.initializeTimers).toBeTypeOf('function');
            expect(store2.updateTimeLeft).toBeTypeOf('function');
            expect(store2.getTimerFor).toBeTypeOf('function');
            expect(store2.getTimersForContext).toBeTypeOf('function');
            expect(store2.isContextTimedOut).toBeTypeOf('function');

            expect(store2.get().foo).toBe(true);
        });
    });

    describe('initializeTimers', () => {
        it('sets the initial data', () => {
            const store = getTimersStore('ghi');
            store.initializeTimers(timersDataArray);
            expect(store.get()).toEqual({
                timersArray: timersDataArray
            });
        });

        it('applies throttleConfig', () => {
            const config = {
                throttleConfig: {
                    minutesThreshold: 1
                }
            };
            const store = getTimersStore('ghi', config);
            // 1st timer above minutesThreshold, 2nd below
            store.initializeTimers(timersDataArray.slice(0, 2));
            expect(store.get()).toEqual({
                timersArray: [
                    {
                        level: 'test',
                        id: 'test-1',
                        timerValue: {
                            timeAssigned: 120000,
                            timeLeft: 105000,
                            timeStr: '1min', // 45s hidden
                            readableTimeStr: '1 minute' // 45 seconds hidden
                        }
                    },
                    timersDataArray[1]
                ]
            });
        });
    });

    describe('updateTimeLeft', () => {
        it('updates some of the data', () => {
            const store = getTimersStore('ghi');
            store.set({ timersArray: cloneDeep(timersDataArray) });
            store.updateTimeLeft([
                {
                    level: 'item',
                    id: 'item-1',
                    timerValue: {
                        timeAssigned: 35000,
                        timeLeft: 22000,
                        timeStr: '22s'
                    }
                }
            ]);
            expect(store.get()).toEqual({
                timersArray: [
                    timersDataArray[0],
                    timersDataArray[1],
                    timersDataArray[2],
                    {
                        level: 'item',
                        id: 'item-1',
                        timerValue: {
                            timeAssigned: 35000,
                            timeLeft: 22000,
                            timeStr: '22s',
                            readableTimeStr: '22 seconds'
                        }
                    },
                    timersDataArray[4],
                    timersDataArray[5]
                ]
            });
        });
    });

    describe('getTimerFor', () => {
        test.each([
            ['test', null, 0],
            ['testPart', 'testPart-1', 1],
            ['section', 'assessmentSection-1', 2],
            ['item', 'item-1', 3]
        ])('get the timer for %s', (level, id, index) => {
            const store = getTimersStore('jkl');
            store.initializeTimers(timersDataArray);
            const timer = store.getTimerFor(level, id);
            expect(timer).toEqual(timersDataArray[index]);
        });

        test.each([
            ['testPart', 'testPart-2'],
            ['section', 'assessmentSection-2'],
            ['item', 'item-4']
        ])('returns undefined for invalid identifiers', (level, id) => {
            const store = getTimersStore('jkl');
            store.initializeTimers(timersDataArray);
            const timer = store.getTimerFor(level, id);
            expect(timer).toBeUndefined();
        });
    });

    describe('getTimersForContext', () => {
        it('gets the correct timers', () => {
            const store = getTimersStore('jkl');
            store.initializeTimers(timersDataArray);
            const testContext = {
                testPartId: 'testPart-1',
                sectionId: 'assessmentSection-1',
                itemIdentifier: 'item-1'
            };

            const result = store.getTimersForContext(testContext);
            expect(result).toEqual([...timersDataArray.slice(0, 4), timersDataArray[5]]); // test, testPart, section, first item and extra
        });

        it('gets timers without extra if includeExtra=false', () => {
            const store = getTimersStore('jkl');
            store.initializeTimers(timersDataArray);
            const testContext = {
                testPartId: 'testPart-1',
                sectionId: 'assessmentSection-1',
                itemIdentifier: 'item-1'
            };

            const result = store.getTimersForContext(testContext, false);
            expect(result).toEqual(timersDataArray.slice(0, 4)); // test, testPart, section and first item
        });

        it('gets partial timers', () => {
            const store = getTimersStore('jkl');
            store.initializeTimers(timersDataArray);
            const testContext = {
                testPartId: 'testPart-1',
                sectionId: 'assessmentSection-2',
                itemIdentifier: 'item-3'
            };
            const result = store.getTimersForContext(testContext);
            expect(result).toEqual([...timersDataArray.slice(0, 2), timersDataArray[5]]); // just test & testPart, and extra
        });

        it('returns [] if no timers', () => {
            const store = getTimersStore('jkl');
            const testContext = {
                testPartId: 'testPart-1',
                sectionId: 'assessmentSection-1',
                itemIdentifier: 'item-1'
            };
            const result = store.getTimersForContext(testContext);
            expect(result).toEqual([]);
        });
    });

    describe('isContextTimedOut', () => {
        test.each([
            [false, 'item-4'],
            [false, 'item-1'],
            [true, 'item-2']
        ])('returns %s', (expected, itemIdentifier) => {
            const store = getTimersStore('jkl');
            store.initializeTimers(timersDataArray);
            const testContext = {
                testPartId: 'testPart-2',
                sectionId: 'assessmentSection-2',
                itemIdentifier
            };
            const result = store.isContextTimedOut(testContext);
            expect(result).toBe(expected);
        });

        test.each([
            [false, 'item-1'],
            [false, 'item-2']
        ])('if extra-time remains, returns %s', (expected, itemIdentifier) => {
            const store = getTimersStore('jkl');
            store.initializeTimers(timersDataArrayWithExtra);
            const testContext = {
                testPartId: 'testPart-2',
                sectionId: 'assessmentSection-2',
                itemIdentifier
            };
            const result = store.isContextTimedOut(testContext);
            expect(result).toBe(expected);
        });
    });

    describe('isPositionTimedOut', () => {
        const testMap = {
            parts: {
                'testPart-2': {
                    id: 'testPart-2',
                    sections: {
                        'assessmentSection-2': {
                            id: 'assessmentSection-2',
                            items: {
                                'item-1': {
                                    id: 'item-1',
                                    position: 0
                                },
                                'item-2': {
                                    id: 'item-2',
                                    position: 1
                                },
                                'item-4': {
                                    id: 'item-4',
                                    position: 2
                                }
                            }
                        }
                    }
                }
            }
        };

        test.each([
            [false, 2],
            [false, 0],
            [true, 1]
        ])('returns %s', (expected, position) => {
            const store = getTimersStore('jkl');
            store.initializeTimers(timersDataArray);
            const result = store.isPositionTimedOut(position, testMap);
            expect(result).toBe(expected);
        });

        test.each([
            [false, 0],
            [false, 1]
        ])('if extra-time remains, returns %s', (expected, position) => {
            const store = getTimersStore('jkl');
            store.initializeTimers(timersDataArrayWithExtra);
            const result = store.isPositionTimedOut(position, testMap);
            expect(result).toBe(expected);
        });
    });
});

describe('clearAllTimersStores', () => {
    it('clears store contents', () => {
        const store1 = getTimersStore('mno');
        const store2 = getTimersStore('pqr');
        store1.set({ foo: true });
        store2.set({ bar: true });

        clearAllTimersStores();

        expect(store1.get()).toEqual({
            timersArray: []
        });
        expect(store2.get()).toEqual({
            timersArray: []
        });
    });
});
