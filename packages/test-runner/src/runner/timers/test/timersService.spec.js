// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

var timersProxyApiRef;

vi.mock('../timersProxy.js', () => {
    const timersProxyApi = {
        start: vi.fn(),
        stop: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
    };
    // make spies available outside mock setup scope
    timersProxyApiRef = timersProxyApi;

    return {
        timersProxyFactory: vi.fn().mockReturnValue(timersProxyApi)
    };
});

import { timersServiceFactory } from '../timersService.js';
import { clearAllTimersStores } from '../timersStore.js';
import timerModes from '../timerModes.js';

const initTimersData = {
    test: {
        id: 'test-1',
        maxTime: 60000,
        maxTimeRemaining: 45000
    },
    extra: null,
    testParts: [
        {
            id: 'testPart-1',
            minTime: 1000,
            maxTime: 50000,
            maxTimeRemaining: 35000
        }
    ],
    sections: [
        {
            id: 'assessmentSection-1',
            minTime: 1000,
            maxTime: 40000,
            maxTimeRemaining: 25000
        }
    ],
    items: [
        {
            id: 'item-1',
            minTime: 1000,
            maxTime: 30000,
            maxTimeRemaining: 15000
        },
        {
            id: 'item-2',
            minTime: 1000,
            maxTime: 20000,
            maxTimeRemaining: 0
        }
    ]
};

const initTimersDataWithExtra = {
    ...initTimersData,
    extra: {
        maxTime: 80000,
        maxTimeRemaining: 75000
    }
};

const timersDataArray = [
    {
        level: 'test',
        timerValue: {
            timeAssigned: 60000,
            timeLeft: 45000,
            timeStr: '45s',
            readableTimeStr: '45 seconds'
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
    },
    {
        level: 'testPart',
        id: 'testPart-1',
        timerValue: {
            minTime: 1000,
            maxTime: 50000,
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
            minTime: 1000,
            maxTime: 40000,
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
            minTime: 1000,
            maxTime: 30000,
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
            minTime: 1000,
            maxTime: 20000,
            timeAssigned: 20000,
            timeLeft: 0,
            timeStr: '0s',
            readableTimeStr: '0 seconds'
        }
    }
];

const timersDataArrayWithExtra = [
    timersDataArray[0],
    {
        level: 'extra',
        timerValue: {
            timeAssigned: 80000,
            timeLeft: 75000,
            timeStr: '1min 15s',
            readableTimeStr: '1 minute 15 seconds'
        }
    },
    ...timersDataArray.slice(2, 6)
];

const socketProxyMock = {};

describe('timersService', () => {
    const serviceCallId = 'abc%25def';

    describe('API', () => {
        it('should fail if called without a serviceCallId', () => {
            const config = { mode: timerModes.server };
            expect(() => timersServiceFactory(socketProxyMock, config)).toThrow(TypeError);
        });

        it('should fail if called without a valid mode', () => {
            const config = { serviceCallId };
            expect(() => timersServiceFactory(socketProxyMock, config)).toThrow(TypeError);
            expect(() => timersServiceFactory(socketProxyMock, { ...config, mode: 'unknownMode' })).toThrow(TypeError);
        });

        it('returns the correct API', () => {
            const config = { serviceCallId, mode: timerModes.server };

            const service = timersServiceFactory(socketProxyMock, config);
            expect(service.mode).toBe(config.mode);
            expect(service.setInitialData).toBeTypeOf('function');
            expect(service.start).toBeTypeOf('function');
            expect(service.stop).toBeTypeOf('function');
            expect(service.getStore).toBeTypeOf('function');
            expect(service.destroy).toBeTypeOf('function');
        });
    });

    describe('functionality', () => {
        afterEach(() => {
            clearAllTimersStores();
        });

        const config = { serviceCallId, mode: timerModes.server };

        describe('destroy', () => {
            it('clears store', () => {
                const service = timersServiceFactory(socketProxyMock, config);
                const store = service.getStore();
                store.set({
                    timersArray: [
                        {
                            level: 'item',
                            id: 'foo',
                            timerValue: {
                                timeLeft: 1
                            }
                        }
                    ]
                });
                service.destroy();

                expect(store.get()).toEqual({
                    timersArray: []
                });
            });
        });

        describe('start', () => {
            it('calls through to timersProxy.start with testContext', () =>
                new Promise(done => {
                    const service = timersServiceFactory(socketProxyMock, config);
                    const testContext = {
                        itemIdentifier: 'item-1'
                    };

                    timersProxyApiRef.start.mockImplementation((...params) => {
                        expect(params[0]).toEqual(testContext);
                        done();
                    });

                    service.start(testContext);
                }));
        });

        describe('stop', () => {
            it('calls through to timersProxy.stop', () =>
                new Promise(done => {
                    const service = timersServiceFactory(socketProxyMock, config);

                    timersProxyApiRef.stop.mockImplementation(() => {
                        expect(true).toBe(true);
                        done();
                    });

                    service.stop();
                }));
        });

        describe('setInitialData', () => {
            it('sets complete data into store', () => {
                const service = timersServiceFactory(socketProxyMock, config);

                service.setInitialData(initTimersDataWithExtra);

                const store = service.getStore();

                expect(store.get()).toEqual({
                    timersArray: [...timersDataArrayWithExtra]
                });
            });

            it('adds empty extra-time data even if it is not among the inital data', () => {
                const service = timersServiceFactory(socketProxyMock, config);

                service.setInitialData(initTimersData);

                const store = service.getStore();

                expect(store.get()).toEqual({
                    timersArray: [...timersDataArray]
                });
            });

            it('sets test-only data into store', () => {
                const service = timersServiceFactory(socketProxyMock, config);

                service.setInitialData({
                    test: initTimersData.test
                });

                const store = service.getStore();

                expect(store.get()).toEqual({
                    timersArray: [timersDataArray[0], timersDataArray[1]]
                });
            });

            it('sets testPart-only data into store', () => {
                const service = timersServiceFactory(socketProxyMock, config);

                service.setInitialData({
                    testParts: initTimersData.testParts
                });

                const store = service.getStore();

                expect(store.get()).toEqual({
                    timersArray: [timersDataArray[1], timersDataArray[2]]
                });
            });

            it('sets section-only data into store', () => {
                const service = timersServiceFactory(socketProxyMock, config);

                service.setInitialData({
                    sections: initTimersData.sections
                });

                const store = service.getStore();

                expect(store.get()).toEqual({
                    timersArray: [timersDataArray[1], timersDataArray[3]]
                });
            });

            it('sets item-only data into store', () => {
                const service = timersServiceFactory(socketProxyMock, config);

                service.setInitialData({
                    items: initTimersData.items
                });

                const store = service.getStore();

                expect(store.get()).toEqual({
                    timersArray: [timersDataArray[1], timersDataArray[4], timersDataArray[5]]
                });
            });
        });

        describe('refresh-timers to updateTimeLeft format', () => {
            it('updates data in the store', () => {
                let refreshTimersCallbackRef;
                timersProxyApiRef.on.mockImplementationOnce((eventName, callback) => {
                    if (eventName === 'refresh-timers') {
                        refreshTimersCallbackRef = callback;
                    }
                });
                const service = timersServiceFactory(socketProxyMock, config);
                service.setInitialData(initTimersData);

                const store = service.getStore();
                expect(store.get()).toEqual({
                    timersArray: timersDataArray
                });

                refreshTimersCallbackRef({
                    section: {
                        id: 'assessmentSection-1',
                        maxTime: 40000,
                        maxTimeRemaining: 5000
                    },
                    extra: {
                        maxTime: 80000,
                        maxTimeRemaining: 8000
                    }
                });

                expect(store.get()).toEqual({
                    timersArray: [
                        timersDataArray[0],
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 80000,
                                timeLeft: 8000,
                                timeStr: '8s',
                                readableTimeStr: '8 seconds'
                            }
                        },
                        timersDataArray[2],
                        {
                            level: 'section',
                            id: 'assessmentSection-1',
                            timerValue: {
                                maxTime: 40000,
                                minTime: 1000,
                                timeAssigned: 40000,
                                timeLeft: 5000,
                                timeStr: '5s',
                                readableTimeStr: '5 seconds'
                            }
                        },
                        timersDataArray[4],
                        timersDataArray[5]
                    ]
                });
            });

            it('updates extra-time to empty if it is not among the update data', () => {
                let refreshTimersCallbackRef;
                timersProxyApiRef.on.mockImplementationOnce((eventName, callback) => {
                    if (eventName === 'refresh-timers') {
                        refreshTimersCallbackRef = callback;
                    }
                });
                const service = timersServiceFactory(socketProxyMock, config);
                service.setInitialData(initTimersDataWithExtra);

                const store = service.getStore();
                expect(store.get()).toEqual({
                    timersArray: timersDataArrayWithExtra
                });

                refreshTimersCallbackRef({
                    extra: null
                });

                expect(store.get()).toEqual({
                    timersArray: [
                        timersDataArrayWithExtra[0],
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 0,
                                timeLeft: 0,
                                timeStr: '0s',
                                readableTimeStr: '0 seconds'
                            }
                        },
                        ...timersDataArrayWithExtra.slice(2, 6)
                    ]
                });
            });
        });

        describe('onTimerTimeout/onExtraAdded', () => {
            const configWithCallbacks = { ...config, onExtraAdded: vi.fn(), onTimerTimeout: vi.fn() };

            afterEach(() => {
                configWithCallbacks.onExtraAdded.mockClear();
                configWithCallbacks.onTimerTimeout.mockClear();
            });

            it('onExtraAdded is called if extra-time was changed from 0 to some value', () => {
                const service = timersServiceFactory(socketProxyMock, configWithCallbacks);
                service.setInitialData(initTimersData);
                expect(configWithCallbacks.onExtraAdded).not.toHaveBeenCalled();

                service.setInitialData(initTimersDataWithExtra);
                expect(configWithCallbacks.onExtraAdded).toHaveBeenCalled();
            });

            it('onExtraAdded is not called if extra-time already had value, but it was changed', () => {
                const service = timersServiceFactory(socketProxyMock, configWithCallbacks);
                service.setInitialData(initTimersDataWithExtra);
                //check that it's not called by first update by `setInitialData`
                expect(configWithCallbacks.onExtraAdded).not.toHaveBeenCalled();

                service.setInitialData({
                    ...initTimersDataWithExtra,
                    extra: {
                        maxTime: 2000,
                        maxTimeRemaining: 1000
                    }
                });
                expect(configWithCallbacks.onExtraAdded).not.toHaveBeenCalled();

                service.setInitialData({
                    ...initTimersDataWithExtra,
                    extra: {
                        maxTime: 180000,
                        maxTimeRemaining: 175000
                    }
                });
                expect(configWithCallbacks.onExtraAdded).not.toHaveBeenCalled();

                service.setInitialData({
                    ...initTimersDataWithExtra,
                    extra: null
                });
                expect(configWithCallbacks.onExtraAdded).not.toHaveBeenCalled();
            });

            it('onTimerTimeout is called when some timer changed from some value to 0 (counting extra)', () => {
                const service = timersServiceFactory(socketProxyMock, configWithCallbacks);
                service.setInitialData(initTimersData);
                expect(configWithCallbacks.onTimerTimeout).not.toHaveBeenCalled();

                //section: 25s -> 0, extra: 0
                service.setInitialData({
                    ...initTimersData,
                    sections: [
                        {
                            id: 'assessmentSection-1',
                            maxTime: 40000,
                            maxTimeRemaining: 0
                        }
                    ]
                });
                expect(configWithCallbacks.onTimerTimeout).toHaveBeenCalled();
                configWithCallbacks.onTimerTimeout.mockClear();

                //section: 0, extra: 0 -> 8s
                service.setInitialData({
                    ...initTimersData,
                    sections: [
                        {
                            id: 'assessmentSection-1',
                            maxTime: 40000,
                            maxTimeRemaining: 0
                        }
                    ],
                    extra: {
                        maxTime: 8000,
                        maxTimeRemaining: 8000
                    }
                });
                expect(configWithCallbacks.onTimerTimeout).not.toHaveBeenCalled();

                //section: 0, extra: 0
                service.setInitialData({
                    ...initTimersData,
                    sections: [
                        {
                            id: 'assessmentSection-1',
                            maxTime: 40000,
                            maxTimeRemaining: 0
                        }
                    ],
                    extra: null
                });
                expect(configWithCallbacks.onTimerTimeout).toHaveBeenCalled();
                configWithCallbacks.onTimerTimeout.mockClear();

                //test: 45s -> 10s, extra: 0
                service.setInitialData({
                    ...initTimersData,
                    test: {
                        id: 'test-1',
                        maxTime: 60000,
                        maxTimeRemaining: 10000
                    },
                    sections: [
                        {
                            id: 'assessmentSection-1',
                            maxTime: 40000,
                            maxTimeRemaining: 0
                        }
                    ],
                    extra: null
                });
                expect(configWithCallbacks.onTimerTimeout).not.toHaveBeenCalled();

                //test: 10s -> 0, extra: 0 -> 8s
                service.setInitialData({
                    ...initTimersData,
                    test: {
                        id: 'test-1',
                        maxTime: 60000,
                        maxTimeRemaining: 0
                    },
                    sections: [
                        {
                            id: 'assessmentSection-1',
                            maxTime: 40000,
                            maxTimeRemaining: 0
                        }
                    ],
                    extra: {
                        maxTime: 8000,
                        maxTimeRemaining: 8000
                    }
                });
                expect(configWithCallbacks.onTimerTimeout).not.toHaveBeenCalled();

                //test: 0, extra: 8s -> 0
                service.setInitialData({
                    ...initTimersData,
                    test: {
                        id: 'test-1',
                        maxTime: 60000,
                        maxTimeRemaining: 0
                    },
                    sections: [
                        {
                            id: 'assessmentSection-1',
                            maxTime: 40000,
                            maxTimeRemaining: 0
                        }
                    ],
                    extra: {
                        maxTime: 8000,
                        maxTimeRemaining: 0
                    }
                });
                expect(configWithCallbacks.onTimerTimeout).toHaveBeenCalled();
            });

            it('onTimerTimeout is not called if some timer was 0 from the start', () => {
                const service = timersServiceFactory(socketProxyMock, configWithCallbacks);
                service.setInitialData({
                    sections: [
                        {
                            id: 'assessmentSection-1',
                            maxTime: 40000,
                            maxTimeRemaining: 0
                        }
                    ]
                });
                expect(configWithCallbacks.onTimerTimeout).not.toHaveBeenCalled();
            });
        });
    });
});
