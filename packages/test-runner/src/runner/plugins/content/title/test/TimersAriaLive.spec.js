// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import TimersAriaLive from '../TimersAriaLive.svelte';
import testsStateStore, { getTestStateStore, getTestSessionStatusStore } from '../../../../testsStateStore.js';
import { getTimersStore, clearAllTimersStores } from '../../../../timers/timersStore.js';

const getTimerData = () => [
    {
        level: 'item',
        id: 'i3',
        timerValue: {
            timeAssigned: 2 * 10 * 1000,
            timeLeft: 10 * 1000,
            timeStr: '10s'
        }
    },
    {
        level: 'item',
        id: 'i4',
        timerValue: {
            timeAssigned: 2 * 59 * 60 * 1000,
            timeLeft: 59 * 60 * 1000,
            timeStr: '59min'
        }
    },
    {
        level: 'section',
        id: 's2',
        timerValue: {
            timeAssigned: 2 * 8 * 60 * 1000,
            timeLeft: 8 * 60 * 1000,
            timeStr: '8min'
        }
    },
    {
        level: 'section',
        id: 's3',
        timerValue: {
            timeAssigned: 2 * 60 * 60 * 1000,
            timeLeft: 60 * 60 * 1000,
            timeStr: '1h'
        }
    },
    {
        level: 'testPart',
        id: 'p1',
        timerValue: {
            timeAssigned: 2 * (2 * 60 * 60 * 1000 + 7 * 60 * 1000),
            timeLeft: 2 * 60 * 60 * 1000 + 7 * 60 * 1000,
            timeStr: '2h 7min'
        }
    },
    {
        level: 'testPart',
        id: 'p2',
        timerValue: {
            timeAssigned: 2 * (1 * 60 * 60 * 1000 + 48 * 60 * 1000),
            timeLeft: 1 * 60 * 60 * 1000 + 48 * 60 * 1000,
            timeStr: '1h 48min'
        }
    },
    {
        level: 'test',
        timerValue: {
            timeAssigned: 2 * 2 * 60 * 60 * 1000,
            timeLeft: 2 * 60 * 60 * 1000,
            timeStr: '2h'
        }
    },
    {
        level: 'extra',
        timerValue: {
            timeAssigned: 0,
            timeLeft: 0,
            timeStr: '0s'
        }
    }
];

describe('TimersAriaLive', () => {
    const serviceCallId = 'test-session-123afdhj';
    const statusStore = getTestSessionStatusStore(serviceCallId);
    const stateStore = getTestStateStore(serviceCallId);
    let setTimeoutOriginal;
    let dateNowSpy;

    beforeAll(() => {
        setTimeoutOriginal = window.setTimeout;
        window.setTimeout = f => f();
    });

    afterAll(() => {
        window.setTimeout = setTimeoutOriginal;
    });

    beforeEach(() => {
        statusStore.set('interacting');

        stateStore.setTestMap({
            title: 'Delightful test',
            parts: {
                p1: {
                    id: 'p1',
                    sections: {
                        s1: {
                            id: 's1',
                            label: 'Metal section',
                            items: {
                                i1: {
                                    id: 's1',
                                    label: 'Orange item'
                                }
                            }
                        }
                    }
                },
                p2: {
                    id: 'p2',
                    sections: {
                        id: 's2',
                        s2: {
                            label: 'Wool section',
                            items: {
                                i2: {
                                    id: 'i2',
                                    label: 'Lemon item'
                                }
                            }
                        },
                        s3: {
                            id: 's3',
                            label: 'Glass section',
                            items: {
                                i3: {
                                    id: 'i3',
                                    label: 'Ginger item'
                                },
                                i4: {
                                    id: 'i4',
                                    label: 'Buckthorn item'
                                },
                                i5: {
                                    id: 'i5',
                                    label: 'Cranberry item'
                                }
                            }
                        }
                    }
                }
            }
        });
        stateStore.setTestContext({
            testPartId: 'p2',
            sectionId: 's3',
            itemIdentifier: 'i4'
        });

        dateNowSpy = vi.spyOn(Date, 'now');
    });

    afterEach(() => {
        testsStateStore.clear();
        clearAllTimersStores();
        dateNowSpy.mockRestore();
    });

    const expectContent = (container, str) => {
        expect(container.textContent.trim()).toBe(str);
    };
    const expectAnnounced = (container, announced) => {
        expect(!!container.querySelector('[role="alert"]')).toBe(announced);
    };

    it('fails without a serviceCallId', () => {
        expect(() => render(TimersAriaLive, { props: {} })).toThrow(TypeError);
    });

    it('renders empty if no timers', () => {
        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders remaining time for smallest timer: item', () => {
        const timersStore = getTimersStore(serviceCallId);
        const timerData = getTimerData();
        timersStore.initializeTimers(timerData);

        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders remaining time for smallest timer: section', () => {
        const timersStore = getTimersStore(serviceCallId);
        const timerData = getTimerData();
        timerData.find(i => i.level === 'section' && i.id === 's3').timerValue = {
            timeAssigned: 60000,
            timeLeft: 58 * 60 * 1000,
            timeStr: '58min'
        };
        timersStore.initializeTimers(timerData);

        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders remaining time for smallest timer: testPart', () => {
        const timersStore = getTimersStore(serviceCallId);
        const timerData = getTimerData();
        timerData.find(i => i.level === 'testPart' && i.id === 'p2').timerValue = {
            timeAssigned: 60000,
            timeLeft: 57 * 60 * 1000,
            timeStr: '57min'
        };
        timersStore.initializeTimers(timerData);

        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders remaining time for smallest timer: test', () => {
        const timersStore = getTimersStore(serviceCallId);
        const timerData = getTimerData();
        timerData.find(i => i.level === 'test').timerValue = {
            timeAssigned: 60000,
            timeLeft: 56 * 60 * 1000,
            timeStr: '56min'
        };
        timersStore.initializeTimers(timerData);

        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expect(container).toMatchSnapshot();
        });
    });

    it('renders empty if loading status', () => {
        statusStore.set('loading');

        const timersStore = getTimersStore(serviceCallId);
        const timerData = getTimerData();
        timersStore.initializeTimers(timerData);

        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expectContent(container, '');
        });
    });

    it('renders empty if no remaining attempts', () => {
        stateStore.setTestContext({
            testPartId: 'p2',
            sectionId: 's3',
            itemIdentifier: 'i4',
            remainingAttempts: 0,
            itemSessionState: 4
        });

        const timersStore = getTimersStore(serviceCallId);
        const timerData = getTimerData();
        timersStore.initializeTimers(timerData);

        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId
            }
        });

        return tick().then(() => {
            expectContent(container, '');
        });
    });

    it('stringifies time: initial as-is on item load', () => {
        const timersStore = getTimersStore(serviceCallId);
        const timerData = [
            {
                level: 'item',
                id: 'i3',
                timerValue: {
                    timeAssigned: 2 * 4 * 60 * 1000,
                    timeLeft: 3 * 60 * 1000 + 32 * 1000,
                    timeStr: '3min'
                }
            },
            {
                level: 'item',
                id: 'i4',
                timerValue: {
                    timeAssigned: 2 * 3 * 1000,
                    timeLeft: 3 * 1000 + 600,
                    timeStr: '3s'
                }
            },
            {
                level: 'item',
                id: 'i5',
                timerValue: {
                    timeAssigned: 2 * 59 * 60 * 1000,
                    timeLeft: 0,
                    timeStr: '0s'
                }
            },
            {
                level: 'section',
                id: 's2',
                timerValue: {
                    timeAssigned: 2 * 26 * 60 * 1000,
                    timeLeft: 5 * 60 * 1000 + 32 * 1000,
                    timeStr: '6min'
                }
            },
            {
                level: 'testPart',
                id: 'p1',
                timerValue: {
                    timeAssigned: 2 * (1 * 60 * 60 * 1000 + 3 * 60 * 1000),
                    timeLeft: 1 * 60 * 60 * 1000 + 32 * 60 * 1000 + 32 * 1000,
                    timeStr: '1h 32min'
                }
            },
            {
                level: 'extra',
                timerValue: {
                    timeAssigned: 0,
                    timeLeft: 0,
                    timeStr: '0s'
                }
            }
        ];
        timersStore.initializeTimers(timerData);

        stateStore.setTestContext({
            testPartId: 'p1',
            sectionId: 's1',
            itemIdentifier: 'i1'
        });

        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId
            }
        });
        return tick()
            .then(() => {
                expectContent(container, 'Remaining time for this part - 1 hour 33 minutes');

                stateStore.setTestContext({
                    testPartId: 'p2',
                    sectionId: 's2',
                    itemIdentifier: 'i2'
                });
                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this section - 6 minutes');
                stateStore.setTestContext({
                    testPartId: 'p2',
                    sectionId: 's3',
                    itemIdentifier: 'i3'
                });

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 3 minutes 32 seconds');

                stateStore.setTestContext({
                    testPartId: 'p2',
                    sectionId: 's3',
                    itemIdentifier: 'i4'
                });

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 3 seconds');

                stateStore.setTestContext({
                    testPartId: 'p2',
                    sectionId: 's3',
                    itemIdentifier: 'i5'
                });

                return tick();
            })
            .then(() => {
                expectContent(container, '');
            });
    });

    it('stringifies time: throttled when updating while on item', () => {
        const timersStore = getTimersStore(serviceCallId);
        const timerData = [
            {
                level: 'item',
                id: 'i4',
                timerValue: {
                    timeAssigned: 2 * (12 * 60 * 60 * 1000 + 19 * 60 * 1000),
                    timeLeft: 12 * 60 * 60 * 1000 + 27 * 60 * 1000,
                    timeStr: '12h 27min'
                }
            },
            {
                level: 'test',
                timerValue: {
                    timeAssigned: 15 * 60 * 60 * 1000,
                    timeLeft: 14 * 60 * 60 * 1000,
                    timeStr: '14h'
                }
            }
        ];
        timersStore.initializeTimers(timerData);

        const updateTimeLeft = (timeLeft, timeStr) =>
            timersStore.updateTimeLeft([
                {
                    level: 'item',
                    id: 'i4',
                    timerValue: {
                        timeAssigned: 2 * 10 * 1000,
                        timeLeft,
                        timeStr
                    }
                },
                {
                    level: 'test',
                    timerValue: {
                        timeAssigned: 15 * 60 * 60 * 1000,
                        timeLeft: 14 * 60 * 60 * 1000,
                        timeStr: '14h'
                    }
                }
            ]);

        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId,
                throttleConfig: {
                    minutesThreshold: 10
                }
            }
        });

        return tick()
            .then(() => {
                //initial
                expectContent(container, 'Remaining time for this item - 12 hours 27 minutes');

                updateTimeLeft(12 * 60 * 60 * 1000 + 21 * 60 * 1000);

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 12 hours 27 minutes');

                updateTimeLeft(12 * 60 * 60 * 1000 + 19 * 60 * 1000);

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 12 hours 20 minutes');

                updateTimeLeft(12 * 60 * 60 * 1000 + 10 * 60 * 1000 + 5 * 1000);

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 12 hours 20 minutes');

                updateTimeLeft(30 * 60 * 1000 + 5 * 1000);

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 40 minutes');

                updateTimeLeft(29 * 60 * 1000 + 55 * 1000);

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 30 minutes');

                updateTimeLeft(20 * 60 * 1000 + 5 * 1000);

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 25 minutes');

                updateTimeLeft(4 * 60 * 1000 + 40 * 1000, '4min 40s');

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 5 minutes');

                updateTimeLeft(1 * 60 * 1000 + 40 * 1000, '1min 40s');

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 5 minutes');

                updateTimeLeft(59 * 1000, '59s');

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 1 minute');

                updateTimeLeft(4 * 1000, '4s');

                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 1 minute');

                updateTimeLeft(0, '0s');

                return tick();
            })
            .then(() => {
                //does not start announcing another timer
                expectContent(container, '');
            });
    });

    it('stringifies time: not throttled between intervals, without announcing', () => {
        const timersStore = getTimersStore(serviceCallId);
        const timerData = getTimerData();
        timersStore.initializeTimers(timerData);

        const updateTimeLeft = (timeLeft, timeStr, readableTimeStr) =>
            timersStore.updateTimeLeft([
                {
                    level: 'item',
                    id: 'i4',
                    timerValue: {
                        timeAssigned: 2 * 59 * 60 * 1000,
                        timeLeft,
                        timeStr,
                        readableTimeStr
                    }
                }
            ]);

        dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 10).valueOf());

        const { container } = render(TimersAriaLive, {
            props: {
                serviceCallId,
                throttleConfig: {
                    minutesThreshold: 10
                }
            }
        });

        return tick()
            .then(() => {
                //initial
                expectContent(container, 'Remaining time for this item - 59 minutes');
                expectAnnounced(container, true);

                dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 30).valueOf());
                updateTimeLeft(59 * 60 * 1000 - 30 * 1000, '58min', '58 minutes');
                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 58 minutes');
                expectAnnounced(container, false);

                dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 40).valueOf());
                updateTimeLeft(57 * 60 * 1000, '57min', '57 minutes');
                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 57 minutes');
                expectAnnounced(container, false);

                dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 50).valueOf());
                updateTimeLeft(50 * 60 * 1000 + 30 * 1000, '50min', '50 minutes');
                return tick();
            })
            .then(() => {
                expectContent(container, 'Remaining time for this item - 50 minutes');
                expectAnnounced(container, false);

                dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 50).valueOf());
                updateTimeLeft(50 * 60 * 1000 - 30 * 1000, '49min', '49 minutes');
                return tick();
            })
            .then(() => {
                //throttled
                expectContent(container, 'Remaining time for this item - 50 minutes');
                expectAnnounced(container, true);
            });
    });

    describe('extra time', () => {
        it('normal timers running; then extra added', () => {
            const timersStore = getTimersStore(serviceCallId);
            const timerData = getTimerData();
            timersStore.initializeTimers(timerData);
            dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 10).valueOf());

            const { container } = render(TimersAriaLive, { props: { serviceCallId } });
            return tick()
                .then(() => {
                    //initial
                    expectContent(container, 'Remaining time for this item - 59 minutes');

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 31, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 81 * 60 * 1000,
                                timeLeft: 81 * 60 * 1000,
                                timeStr: '1h 21min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra added
                    expectContent(
                        container,
                        'Remaining time for this item - 59 minutes, remaining extra time - 1 hour 21 minutes'
                    );
                    expectAnnounced(container, true);

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 32, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'item',
                            id: 'i4',
                            timerValue: {
                                timeAssigned: 2 * 59 * 60 * 1000,
                                timeLeft: 58 * 60 * 1000,
                                timeStr: '58min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //usual announcement rule is intact
                    expectContent(
                        container,
                        'Remaining time for this item - 58 minutes, remaining extra time - 1 hour 21 minutes'
                    );
                    expectAnnounced(container, false);
                });
        });

        it('normal timers timed out; then extra added', () => {
            const timersStore = getTimersStore(serviceCallId);
            const timerData = getTimerData();
            timersStore.initializeTimers(
                timerData.map(i => ({
                    level: i.level,
                    id: i.id,
                    timerValue: {
                        timeAssigned: i.timeAssigned,
                        timeLeft: 0,
                        timeStr: '0s'
                    }
                }))
            );
            dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 10).valueOf());

            const { container } = render(TimersAriaLive, { props: { serviceCallId } });
            return tick()
                .then(() => {
                    //initial
                    expectContent(container, '');

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 31, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 81 * 60 * 1000,
                                timeLeft: 81 * 60 * 1000,
                                timeStr: '1h 21min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra added
                    expectContent(container, 'Remaining extra time - 1 hour 21 minutes');
                    expectAnnounced(container, true);
                });
        });

        it('higher timer running, lower timer timed out; then extra added; extra counts down', () => {
            const timersStore = getTimersStore(serviceCallId);
            const timerData = [
                {
                    level: 'test',
                    timerValue: {
                        timeAssigned: 2 * 60 * 60 * 1000,
                        timeLeft: 60 * 60 * 1000,
                        timeStr: '1h'
                    }
                },
                {
                    level: 'section',
                    id: 's3',
                    timerValue: {
                        timeAssigned: 2 * 60 * 60 * 1000,
                        timeLeft: 0,
                        timeStr: '0s'
                    }
                },
                {
                    level: 'extra',
                    timerValue: {
                        timeAssigned: 0,
                        timeLeft: 0,
                        timeStr: '0s'
                    }
                }
            ];
            timersStore.initializeTimers(timerData);
            dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 10).valueOf());

            const { container } = render(TimersAriaLive, { props: { serviceCallId } });
            return tick()
                .then(() => {
                    //initial: section is timed-out, but test timer is running...
                    expectContent(container, 'Remaining time for this test - 1 hour');

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 31, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 81 * 60 * 1000,
                                timeLeft: 81 * 60 * 1000,
                                timeStr: '1h 21min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra added: section is in focus again, extra starts being used, test timer is paused by extra
                    //usual announcement rule is reset (`throttledSeconds > initialTimeSeconds` case)
                    expectContent(container, 'Remaining extra time - 1 hour 21 minutes');
                    expectAnnounced(container, true);

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 35, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 81 * 60 * 1000,
                                timeLeft: 79 * 60 * 1000,
                                timeStr: '1h 19min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra starts counting down, usual announcement rule applies (`seconds !== announcedSeconds` case)
                    expectContent(container, 'Remaining extra time - 1 hour 20 minutes');
                    expectAnnounced(container, true);

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 40, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 81 * 60 * 1000,
                                timeLeft: 78 * 60 * 1000,
                                timeStr: '1h 18min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra starts counting down, usual announcement rule applies  (`seconds === announcedSeconds` case)
                    expectContent(container, 'Remaining extra time - 1 hour 18 minutes');
                    expectAnnounced(container, false);

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 45, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 81 * 60 * 1000,
                                timeLeft: 70 * 60 * 1000,
                                timeStr: '1h 10min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra starts counting down, usual announcement rule applies
                    expectContent(container, 'Remaining extra time - 1 hour 10 minutes');
                    expectAnnounced(container, true);

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 50, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 81 * 60 * 1000,
                                timeLeft: 61 * 60 * 1000,
                                timeStr: '1h 1min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra starts counting down, usual announcement rule applies
                    expectContent(container, 'Remaining extra time - 1 hour 1 minute');
                    expectAnnounced(container, false);
                });
        });

        it('lower timer running, higher timer timed out; then extra added; then extra increased', () => {
            const timersStore = getTimersStore(serviceCallId);
            const timerData = [
                {
                    level: 'item',
                    id: 'i4',
                    timerValue: {
                        timeAssigned: 2 * 60 * 60 * 1000,
                        timeLeft: 60 * 60 * 1000,
                        timeStr: '1h'
                    }
                },
                {
                    level: 'section',
                    id: 's3',
                    timerValue: {
                        timeAssigned: 2 * 60 * 60 * 1000,
                        timeLeft: 0,
                        timeStr: '0s'
                    }
                },
                {
                    level: 'extra',
                    timerValue: {
                        timeAssigned: 0,
                        timeLeft: 0,
                        timeStr: '0s'
                    }
                }
            ];
            timersStore.initializeTimers(timerData);
            dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 10).valueOf());

            const { container } = render(TimersAriaLive, { props: { serviceCallId } });
            return tick()
                .then(() => {
                    //initial: section is timed-out, but item timer is running...
                    expectContent(container, 'Remaining time for this item - 1 hour');
                    expectAnnounced(container, true);

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 31, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 81 * 60 * 1000,
                                timeLeft: 81 * 60 * 1000,
                                timeStr: '1h 21min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra added: section is in focus again, extra starts being used, item timer is paused by extra
                    expectContent(container, 'Remaining extra time - 1 hour 21 minutes');
                    expectAnnounced(container, true);

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 32, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 82 * 60 * 1000,
                                timeLeft: 82 * 60 * 1000,
                                timeStr: '1h 22min'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra increased: usual announcement rule is reset
                    expectContent(container, 'Remaining extra time - 1 hour 22 minutes');
                    expectAnnounced(container, true);
                });
        });

        it('normal timer running & extra exists; then normal timer times out; then extra times out too', () => {
            const timersStore = getTimersStore(serviceCallId);
            const timerData = [
                {
                    level: 'section',
                    id: 's3',
                    timerValue: {
                        timeAssigned: 2 * 60 * 60 * 1000,
                        timeLeft: 59 * 60 * 1000,
                        timeStr: '59min'
                    }
                },
                {
                    level: 'extra',
                    timerValue: {
                        timeAssigned: 81 * 60 * 1000,
                        timeLeft: 81 * 60 * 1000,
                        timeStr: '1h 21min'
                    }
                }
            ];
            timersStore.initializeTimers(timerData);
            dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 30, 10).valueOf());

            const { container } = render(TimersAriaLive, { props: { serviceCallId } });
            return tick()
                .then(() => {
                    //initial: section timer running, extra time exists but doesn't run
                    expectContent(
                        container,
                        'Remaining time for this section - 59 minutes, remaining extra time - 1 hour 21 minutes'
                    );
                    expectAnnounced(container, true);

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 32, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'section',
                            id: 's3',
                            timerValue: {
                                timeAssigned: 2 * 60 * 60 * 1000,
                                timeLeft: 0,
                                timeStr: '0s'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //section times out, extra starts being used
                    expectContent(container, 'Remaining extra time - 1 hour 21 minutes');
                    expectAnnounced(container, true);

                    dateNowSpy.mockImplementation(() => new Date(2022, 5, 25, 1, 33, 10).valueOf());
                    timersStore.updateTimeLeft([
                        {
                            level: 'extra',
                            timerValue: {
                                timeAssigned: 81 * 60 * 1000,
                                timeLeft: 0,
                                timeStr: '0s'
                            }
                        }
                    ]);
                    return tick();
                })
                .then(() => {
                    //extra time out too
                    expectContent(container, '');
                    expectAnnounced(container, false);
                });
        });
    });
});
