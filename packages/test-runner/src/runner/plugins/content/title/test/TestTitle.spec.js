// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { tick } from 'svelte';
import { render } from '@testing-library/svelte';
import TestTitle from '../TestTitle.svelte';
import testsStateStore, { getTestStateStore, getTestSessionStatusStore } from '../../../../testsStateStore.js';
import { screenSize } from '../../../../screenSizeStore.js';
import { getTimersStore, clearAllTimersStores } from '../../../../timers/timersStore.js';

describe('TestTitle', () => {
    const serviceCallId = 'test-session-123afdhj';
    const statusStore = getTestSessionStatusStore(serviceCallId);

    afterEach(() => {
        testsStateStore.clear();
        screenSize.set({ unknown: true });
        clearAllTimersStores();
    });

    it('fails without a serviceCallId', () => {
        expect(() => render(TestTitle, { props: {} })).toThrow(TypeError);
    });

    it('renders correctly with a serviceCallId and interacting status', () => {
        statusStore.set('interacting');

        const { container } = render(TestTitle, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('renders correctly with a serviceCallId and overlay status', () => {
        statusStore.set('overlay');

        const { container } = render(TestTitle, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
    });

    it('updates based on the test map content and screen size', () => {
        expect.assertions(6);

        statusStore.set('interacting');

        const { container } = render(TestTitle, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
        expect(container.querySelectorAll('.content').length).toBe(0);

        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap({
            title: 'Awesome test',
            parts: {
                p1: {
                    id: 'p1',
                    sections: {
                        s1: {
                            id: 's1',
                            label: 'Awesome section',
                            items: {
                                i1: {
                                    id: 'i1',
                                    label: 'Delightful item'
                                }
                            }
                        },
                        s2: {
                            id: 's2',
                            label: 'Beautiful section',
                            items: {
                                i2: {
                                    id: 'i2',
                                    label: 'Charming item'
                                }
                            }
                        }
                    }
                }
            }
        });
        stateStore.setTestContext({
            testPartId: 'p1',
            sectionId: 's1',
            itemIdentifier: 'i1'
        });

        //2 ticks, one for the testMap, one for the testContext
        return tick()
            .then(() => tick())
            .then(() => {
                expect(container).toMatchSnapshot();
                expect(container.querySelectorAll('.content').length).toBe(3);

                stateStore.setTestContext({
                    testPartId: 'p1',
                    sectionId: 's2',
                    itemIdentifier: 'i2'
                });
                return tick();
            })
            .then(() => {
                expect(container).toMatchSnapshot();

                screenSize.set({ mobile: true });
                return tick();
            })
            .then(() => {
                expect(container).toMatchSnapshot();
            });
    });

    it('adds only titles for known part', () => {
        expect.assertions(4);

        statusStore.set('interacting');

        const { container } = render(TestTitle, {
            props: {
                serviceCallId
            }
        });
        expect(container).toMatchSnapshot();
        expect(container.querySelectorAll('.content').length).toBe(0);

        const stateStore = getTestStateStore(serviceCallId);
        stateStore.setTestMap({
            title: 'Delightful test',
            parts: {
                p1: {
                    sections: {
                        s1: {
                            items: {
                                i1: {
                                    label: 'Item without section'
                                }
                            }
                        }
                    }
                }
            }
        });
        stateStore.setTestContext({
            testPartId: 'p1',
            sectionId: 's1',
            itemIdentifier: 'i1'
        });

        //2 ticks, one for the testMap, one for the testContext
        return tick()
            .then(() => tick())
            .then(() => {
                expect(container).toMatchSnapshot();
                expect(container.querySelectorAll('.content').length).toBe(2);
            });
    });

    it.each([
        ['override test title', [{ type: 'test', label: 'Some overrided test title' }]],
        ['change order of delivery titles', [{ type: 'section' }, { type: 'item' }, { type: 'test' }]],
        ['skip title pieces', [{ type: 'item' }]],
        [
            'skip unavailable pieces',
            [{ type: 'test', label: 'Test title' }, { type: 'section' }, { type: 'item' }],
            { item: 'Some item title' }
        ],
        ['empty title', []],
        [
            'constant title',
            [
                { type: 'test', label: 'Foo' },
                { type: 'section', label: 'Bar' },
                { type: 'item', label: 'Baz' }
            ]
        ],
        ['invalid type is skipped', [{ type: 'invalid', label: 'Some invalid' }, { type: 'section' }]],
        ['same type for multiple part is kept', [{ type: 'test' }, { type: 'test', label: 'Second test title' }]]
    ])(
        '%s',
        (
            testName,
            titles,
            { test, section, item } = {
                test: 'Some test title',
                section: 'Some section title',
                item: 'Some item title'
            }
        ) => {
            expect.assertions(1);

            statusStore.set('interacting');

            const { container } = render(TestTitle, {
                props: {
                    serviceCallId,
                    titles
                }
            });

            const stateStore = getTestStateStore(serviceCallId);
            stateStore.setTestMap({
                title: test,
                parts: {
                    p1: {
                        sections: {
                            s1: {
                                label: section,
                                items: {
                                    i1: {
                                        label: item
                                    }
                                }
                            }
                        }
                    }
                }
            });
            stateStore.setTestContext({
                testPartId: 'p1',
                sectionId: 's1',
                itemIdentifier: 'i1'
            });

            //2 ticks, one for the testMap, one for the testContext
            return tick()
                .then(tick)
                .then(() => {
                    expect(container.querySelectorAll('.label')).toMatchSnapshot();
                });
        }
    );

    describe('timers', () => {
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
                    timeAssigned: 2 * 10 * 1000,
                    timeLeft: 30 * 1000,
                    timeStr: '30s'
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
                    timeAssigned: 2 * 5 * 60 * 1000,
                    timeLeft: 5 * 60 * 1000,
                    timeStr: '5min'
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

        beforeEach(() => {
            statusStore.set('interacting');

            const stateStore = getTestStateStore(serviceCallId);
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
        });

        it('renders and updates timer remaining time', () => {
            expect.assertions(2);

            const timersStore = getTimersStore(serviceCallId);
            timersStore.initializeTimers(getTimerData());

            const { container } = render(TestTitle, {
                props: {
                    serviceCallId
                }
            });
            return tick()
                .then(() => tick())
                .then(() => {
                    expect(container).toMatchSnapshot();

                    timersStore.updateTimeLeft([
                        {
                            level: 'item',
                            id: 'i3',
                            timerValue: {
                                timeAssigned: 2 * 10 * 1000,
                                timeLeft: 1 * 1000,
                                timeStr: '1s'
                            }
                        },
                        {
                            level: 'item',
                            id: 'i4',
                            timerValue: {
                                timeAssigned: 2 * 10 * 1000,
                                timeLeft: 3 * 1000,
                                timeStr: '3s'
                            }
                        },
                        {
                            level: 'section',
                            id: 's2',
                            timerValue: {
                                timeAssigned: 2 * 8 * 60 * 1000,
                                timeLeft: 6 * 60 * 1000,
                                timeStr: '6min'
                            }
                        },
                        {
                            level: 'section',
                            id: 's3',
                            timerValue: {
                                timeAssigned: 2 * 5 * 60 * 1000,
                                timeLeft: 8 * 1000,
                                timeStr: '8s'
                            }
                        },
                        {
                            level: 'testPart',
                            id: 'p1',
                            timerValue: {
                                timeAssigned: 2 * (2 * 60 * 60 * 1000 + 7 * 60 * 1000),
                                timeLeft: 2 * 60 * 60 * 1000 + 5 * 60 * 1000,
                                timeStr: '2h 5min'
                            }
                        },
                        {
                            level: 'testPart',
                            id: 'p2',
                            timerValue: {
                                timeAssigned: 2 * (1 * 60 * 60 * 1000 + 48 * 60 * 1000),
                                timeLeft: 1 * 60 * 60 * 1000 + 8 * 60 * 1000,
                                timeStr: '1h 8min'
                            }
                        },
                        {
                            level: 'test',
                            timerValue: {
                                timeAssigned: 2 * 2 * 60 * 60 * 1000,
                                timeLeft: 56 * 1000,
                                timeStr: '56s'
                            }
                        }
                    ]);

                    return tick();
                })
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });

        it('does not show test-part title if no test-part timer', () => {
            expect.assertions(1);

            const timersStore = getTimersStore(serviceCallId);
            timersStore.initializeTimers(getTimerData().filter(i => i.level !== 'testPart'));

            const { container } = render(TestTitle, {
                props: {
                    serviceCallId
                }
            });
            return tick()
                .then(() => tick())
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });

        it('does not show timer for timed-out levels', () => {
            expect.assertions(2);

            const timersStore = getTimersStore(serviceCallId);
            //timed-out timer on one level (testPart)
            const timerData = getTimerData();
            timerData.find(i => i.level === 'testPart' && i.id === 'p2').timerValue = {
                timeAssigned: 60000,
                timeLeft: 0,
                timeStr: '0s'
            };
            timersStore.initializeTimers(timerData);

            const { container } = render(TestTitle, {
                props: {
                    serviceCallId
                }
            });
            return tick()
                .then(() => tick())
                .then(() => {
                    expect(container).toMatchSnapshot();

                    //timed-out timer on all levels
                    timersStore.updateTimeLeft(
                        timerData.map(i => ({
                            ...i,
                            timerValue: {
                                timeAssigned: 60000,
                                timeLeft: 0,
                                timeStr: '0s'
                            }
                        }))
                    );

                    return tick();
                })
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });

        it('includes extra-time in the label', () => {
            const timersStore = getTimersStore(serviceCallId);
            //smallest timer is item, so extra is applied to it and not shown here
            const timerData = [
                ...getTimerData().filter(a => a.level !== 'extra'),
                {
                    level: 'extra',
                    timerValue: {
                        timeAssigned: 42000,
                        timeLeft: 32000,
                        timeStr: '32s'
                    }
                }
            ];
            timersStore.initializeTimers(timerData);

            const { container } = render(TestTitle, {
                props: {
                    serviceCallId
                }
            });
            return tick()
                .then(() => tick())
                .then(() => {
                    expect(container).toMatchSnapshot();

                    //smallest timer is testPart, so extra is shown for it
                    timersStore.updateTimeLeft([
                        {
                            level: 'testPart',
                            id: 'p2',
                            timerValue: {
                                timeAssigned: 2 * 5 * 60 * 1000,
                                timeLeft: 8000,
                                timeStr: '8s'
                            }
                        }
                    ]);

                    return tick();
                })
                .then(() => {
                    expect(container).toMatchSnapshot();

                    //smallest testPart timer has timed out, but extra is still applied to it
                    timersStore.updateTimeLeft([
                        {
                            level: 'testPart',
                            id: 'p2',
                            timerValue: {
                                timeAssigned: 2 * 5 * 60 * 1000,
                                timeLeft: 0,
                                timeStr: '0s'
                            }
                        }
                    ]);

                    return tick();
                })
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });

        it('on mobile shows level with smallest timer value', () => {
            expect.assertions(4);
            screenSize.set({ mobile: true });

            const timersStore = getTimersStore(serviceCallId);
            const timerData = getTimerData();
            timerData.find(i => i.level === 'item' && i.id === 'i4').timerValue = {
                timeAssigned: 60000,
                timeLeft: 59 * 60 * 1000,
                timeStr: '59min'
            };
            timerData.find(i => i.level === 'section' && i.id === 's3').timerValue = {
                timeAssigned: 60000,
                timeLeft: 60 * 60 * 1000,
                timeStr: '1h'
            };
            timersStore.initializeTimers(timerData);

            const { container } = render(TestTitle, {
                props: {
                    serviceCallId
                }
            });
            return tick()
                .then(() => tick())
                .then(() => {
                    //timers on all levels; smallest item
                    expect(container).toMatchSnapshot();

                    timerData.find(i => i.level === 'section' && i.id === 's3').timerValue = {
                        timeAssigned: 60000,
                        timeLeft: 58 * 60 * 1000,
                        timeStr: '58min'
                    };
                    timersStore.updateTimeLeft(timerData);
                    return tick();
                })
                .then(() => {
                    //timers on all levels; smallest section
                    expect(container).toMatchSnapshot();

                    timerData.find(i => i.level === 'testPart' && i.id === 'p2').timerValue = {
                        timeAssigned: 60000,
                        timeLeft: 57 * 60 * 1000,
                        timeStr: '57min'
                    };
                    timersStore.updateTimeLeft(timerData);
                    return tick();
                })
                .then(() => {
                    //timers on all levels; smallest part
                    expect(container).toMatchSnapshot();

                    timerData.find(i => i.level === 'test').timerValue = {
                        timeAssigned: 60000,
                        timeLeft: 56 * 60 * 1000,
                        timeStr: '56min'
                    };
                    timersStore.updateTimeLeft(timerData);
                    return tick();
                })
                .then(() => {
                    //timers on all levels; smallest test
                    expect(container).toMatchSnapshot();
                });
        });

        it('title overrides: shows timers for for levels in override order', () => {
            expect.assertions(1);

            const timersStore = getTimersStore(serviceCallId);
            const timerData = getTimerData().filter(i => i.level !== 'testPart');
            timersStore.initializeTimers(timerData);

            const { container } = render(TestTitle, {
                props: {
                    serviceCallId,
                    titles: [
                        { type: 'item', label: 'Very' },
                        { type: 'test', label: 'strange' },
                        { type: 'section', label: 'ordering' }
                    ]
                }
            });
            return tick()
                .then(() => tick())
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });

        it('title overrides: if level is skipped in the override and this level has a timer, override is ignored', () => {
            expect.assertions(1);

            const timersStore = getTimersStore(serviceCallId);
            const timerData = getTimerData().filter(i => i.level === 'testPart');
            timersStore.initializeTimers(timerData);

            const { container } = render(TestTitle, {
                props: {
                    serviceCallId,
                    titles: [{ type: 'test', label: 'strange' }]
                }
            });
            return tick()
                .then(() => tick())
                .then(() => {
                    expect(container).toMatchSnapshot();
                });
        });
    });
});
