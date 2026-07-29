// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import {
    isLastPartOfTest,
    isLastSectionOfPart,
    isLastItemOfPart,
    hasTimeRemainingItems,
    hasTimeRemainingItemsAhead,
    countOfIncompleteOrUnseenItems,
    isItemIncomplete,
    isItemIncompleteOrUnseen,
    isItemOutOfAttempts,
    getPartIndex,
    getPartTitle
} from '../testPart.js';
import { getTimersStore, clearAllTimersStores } from '../../../runner/timers/timersStore.js';

describe('isLastPartOfTest', () => {
    it('throws if no testPart or testMap', () => {
        expect(() => {
            isLastPartOfTest(null, {});
        }).toThrow();
        expect(() => {
            isLastPartOfTest({}, null);
        }).toThrow();
    });

    it('returns true for if test has only one part', () => {
        const testPart = { position: 0 };
        const testMap = {
            parts: {
                part1: testPart
            }
        };
        expect(isLastPartOfTest(testPart, testMap)).toBe(true);
    });

    it('returns true for the last part', () => {
        const testPart1 = { position: 0 };
        const testPart2 = { position: 3 };
        const testPart3 = { position: 5 };
        const testMap = {
            parts: {
                part1: testPart1,
                part2: testPart2,
                part3: testPart3
            }
        };
        expect(isLastPartOfTest(testPart3, testMap)).toBe(true);
        expect(isLastPartOfTest(testPart2, testMap)).toBe(false);
        expect(isLastPartOfTest(testPart1, testMap)).toBe(false);
    });
});

describe('isLastSectionOfPart', () => {
    it('throws if no section or testPart', () => {
        expect(() => {
            isLastSectionOfPart(null, {});
        }).toThrow();
        expect(() => {
            isLastSectionOfPart({}, null);
        }).toThrow();
    });

    it('returns true if testPart has only one section', () => {
        const section1 = { position: 0 };
        const testPart = {
            sections: {
                section1
            }
        };
        expect(isLastSectionOfPart(section1, testPart)).toBe(true);
    });

    it('returns true for the last section', () => {
        const section1 = { position: 0 };
        const section2 = { position: 3 };
        const section3 = { position: 5 };
        const testPart = {
            sections: {
                section1,
                section2,
                section3
            }
        };
        expect(isLastSectionOfPart(section3, testPart)).toBe(true);
        expect(isLastSectionOfPart(section2, testPart)).toBe(false);
        expect(isLastSectionOfPart(section1, testPart)).toBe(false);
    });
});

describe('isLastItemOfPart', () => {
    it('throws if no item or testPart', () => {
        expect(() => {
            isLastItemOfPart(null, {});
        }).toThrow();
        expect(() => {
            isLastItemOfPart({}, null);
        }).toThrow();
    });

    it('returns true if testPart has only one item', () => {
        const item1 = { position: 0 };
        const testPart = {
            sections: {
                section1: {
                    id: 'section1',
                    items: {
                        item1
                    }
                }
            }
        };
        expect(isLastItemOfPart(item1, testPart)).toBe(true);
    });

    it('returns true for the last item', () => {
        const item1 = { position: 0 };
        const item2 = { position: 1 };
        const item3 = { position: 2 };
        const item4 = { position: 3 };
        const testPart = {
            sections: {
                section1: {
                    id: 'section1',
                    items: {
                        item1,
                        item2
                    }
                },
                section2: {
                    id: 'section2',
                    items: {
                        item3,
                        item4
                    }
                }
            }
        };
        expect(isLastItemOfPart(item4, testPart)).toBe(true);
        expect(isLastItemOfPart(item3, testPart)).toBe(false);
        expect(isLastItemOfPart(item2, testPart)).toBe(false);
        expect(isLastItemOfPart(item1, testPart)).toBe(false);
    });
});

describe('hasTimeRemainingItems', () => {
    afterEach(() => {
        clearAllTimersStores();
    });

    const serviceCallId = 'acb123';
    const timersStore = getTimersStore(serviceCallId);

    const testPart = {
        sections: {
            section1: {
                id: 'section1',
                items: {
                    item1: { id: 'item1' },
                    item2: { id: 'item2' }
                }
            },
            section2: {
                id: 'section2',
                items: {
                    item3: { id: 'item3' },
                    item4: { id: 'item4' }
                }
            }
        }
    };

    it('returns true if no other timers', () => {
        expect(hasTimeRemainingItems(testPart, timersStore)).toBe(true);
    });

    it('returns false if all items are timed out', () => {
        timersStore.initializeTimers(
            [1, 2, 3, 4].map(i => ({
                level: 'item',
                id: `item${i}`,
                timerValue: {
                    timeLeft: 0
                }
            }))
        );

        expect(hasTimeRemainingItems(testPart, timersStore)).toBe(false);
    });

    it('returns false if all sections are timed out', () => {
        timersStore.initializeTimers(
            [1, 2].map(i => ({
                level: 'section',
                id: `section${i}`,
                timerValue: {
                    timeLeft: 0
                }
            }))
        );

        expect(hasTimeRemainingItems(testPart, timersStore)).toBe(false);
    });

    it('returns true if only 1 item has time', () => {
        timersStore.initializeTimers(
            [1, 2, 3]
                .map(i => ({
                    level: 'item',
                    id: `item${i}`,
                    timerValue: {
                        timeLeft: 0
                    }
                }))
                .concat([
                    {
                        level: 'item',
                        id: 'item4',
                        timerValue: {
                            timeLeft: 1000
                        }
                    }
                ])
        );

        expect(hasTimeRemainingItems(testPart, timersStore)).toBe(true);
    });

    it('returns true if only 1 section has time', () => {
        timersStore.initializeTimers([
            {
                level: 'section',
                id: 'section1',
                timerValue: {
                    timeLeft: 0
                }
            },
            {
                level: 'section',
                id: 'section2',
                timerValue: {
                    timeLeft: 1000
                }
            }
        ]);

        expect(hasTimeRemainingItems(testPart, timersStore)).toBe(true);
    });

    it('returns true if all items are timed out but there is extra time', () => {
        timersStore.initializeTimers([
            ...[1, 2, 3, 4].map(i => ({
                level: 'item',
                id: `item${i}`,
                timerValue: {
                    timeLeft: 0
                }
            })),
            {
                level: 'extra',
                timerValue: {
                    timeLeft: 1000
                }
            }
        ]);

        expect(hasTimeRemainingItems(testPart, timersStore)).toBe(true);
    });

    it('returns true if all sections are timed out but there is extra time', () => {
        timersStore.initializeTimers([
            ...[1, 2].map(i => ({
                level: 'section',
                id: `section${i}`,
                timerValue: {
                    timeLeft: 0
                }
            })),
            {
                level: 'extra',
                timerValue: {
                    timeLeft: 1000
                }
            }
        ]);

        expect(hasTimeRemainingItems(testPart, timersStore)).toBe(true);
    });
});

describe('hasTimeRemainingItemsAhead', () => {
    afterEach(() => {
        clearAllTimersStores();
    });

    const serviceCallId = 'acb123';
    const timersStore = getTimersStore(serviceCallId);

    const testPart = {
        sections: {
            section1: {
                id: 'section1',
                items: {
                    item1: { id: 'item1', position: 0 },
                    item2: { id: 'item2', position: 1 }
                }
            },
            section2: {
                id: 'section2',
                items: {
                    item3: { id: 'item3', position: 2 },
                    item4: { id: 'item4', position: 3 }
                }
            }
        }
    };
    const testContext = {
        itemPosition: 1
    };

    it('returns true if no other timers', () => {
        expect(hasTimeRemainingItemsAhead(testContext, testPart, timersStore)).toBe(true);
    });

    it('returns false if all items ahead are timed out', () => {
        timersStore.initializeTimers(
            [2, 3, 4].map(i => ({
                level: 'item',
                id: `item${i}`,
                timerValue: {
                    timeLeft: 0
                }
            }))
        );
        expect(hasTimeRemainingItemsAhead(testContext, testPart, timersStore)).toBe(false);
    });

    it('returns false if the section ahead is timed out', () => {
        timersStore.initializeTimers([
            {
                level: 'section',
                id: 'section2',
                timerValue: {
                    timeLeft: 0
                }
            }
        ]);
        expect(hasTimeRemainingItemsAhead(testContext, testPart, timersStore)).toBe(false);
    });

    it('returns true if 1 item ahead has remaining time', () => {
        timersStore.initializeTimers(
            [1, 2, 3]
                .map(i => ({
                    level: 'item',
                    id: `item${i}`,
                    timerValue: {
                        timeLeft: 0
                    }
                }))
                .concat([
                    {
                        level: 'item',
                        id: 'item4',
                        timerValue: {
                            timeLeft: 1000
                        }
                    }
                ])
        );
        expect(hasTimeRemainingItemsAhead(testContext, testPart, timersStore)).toBe(true);
    });

    it('returns true if 1 item ahead has no timer', () => {
        timersStore.initializeTimers(
            [1, 2, 3].map(i => ({
                level: 'item',
                id: `item${i}`,
                timerValue: {
                    timeLeft: 0
                }
            }))
        );
        expect(hasTimeRemainingItemsAhead(testContext, testPart, timersStore)).toBe(true);
    });

    it('returns true if all items ahead are timed out but there is extra time', () => {
        timersStore.initializeTimers([
            ...[2, 3, 4].map(i => ({
                level: 'item',
                id: `item${i}`,
                timerValue: {
                    timeLeft: 0
                }
            })),
            {
                level: 'extra',
                timerValue: {
                    timeLeft: 1000
                }
            }
        ]);
        expect(hasTimeRemainingItemsAhead(testContext, testPart, timersStore)).toBe(true);
    });

    it('returns true if the section ahead is timed out but there is extra time', () => {
        timersStore.initializeTimers([
            {
                level: 'section',
                id: 'section2',
                timerValue: {
                    timeLeft: 0
                }
            },
            {
                level: 'extra',
                timerValue: {
                    timeLeft: 1000
                }
            }
        ]);
        expect(hasTimeRemainingItemsAhead(testContext, testPart, timersStore)).toBe(true);
    });
});

describe('countOfIncompleteOrUnseenItems', () => {
    it('throws if no testPart', () => {
        expect(() => {
            countOfIncompleteOrUnseenItems(null);
        }).toThrow();
    });

    it('returns count of items that are incomplete or unseen', () => {
        let testPart = {
            sections: {
                section1: {
                    id: 'section1',
                    items: {
                        item1: { answered: false, viewed: true, informational: false },
                        item2: { answered: false, viewed: true, informational: false }
                    }
                },
                section2: {
                    id: 'section2',
                    items: {
                        item3: { answered: false, viewed: false, informational: true },
                        item4: { answered: false, viewed: false, informational: false }
                    }
                }
            }
        };
        expect(countOfIncompleteOrUnseenItems(testPart)).toBe(3);

        testPart = {
            sections: {
                section1: {
                    id: 'section1',
                    items: {
                        item1: { answered: true, viewed: true, informational: false }
                    }
                }
            }
        };
        expect(countOfIncompleteOrUnseenItems(testPart)).toBe(0);

        testPart = {
            sections: {
                section1: {
                    id: 'section1',
                    items: {
                        item1: { answered: false, viewed: true, informational: false, remainingAttempts: 1 }
                    }
                }
            }
        };
        expect(countOfIncompleteOrUnseenItems(testPart)).toBe(1);
    });
});

describe('isItemIncomplete', () => {
    it('throws if no item', () => {
        expect(() => {
            isItemIncomplete(null);
        }).toThrow();
    });

    it('returns true for viewed but not answered item', () => {
        let item = { answered: false, viewed: true, informational: false };
        expect(isItemIncomplete(item)).toBe(true);

        item = { answered: true, viewed: true, informational: false };
        expect(isItemIncomplete(item)).toBe(false);

        item = { answered: false, viewed: false, informational: false };
        expect(isItemIncomplete(item)).toBe(false);
    });

    it('returns false for informational item', () => {
        let item = { answered: false, viewed: true, informational: true };
        expect(isItemIncomplete(item)).toBe(false);
    });
});

describe('isItemIncompleteOrUnseen', () => {
    it('throws if no item', () => {
        expect(() => {
            isItemIncompleteOrUnseen(null);
        }).toThrow();
    });

    it('returns true for not viewed or not answered item', () => {
        let item = { answered: false, viewed: false, informational: false };
        expect(isItemIncompleteOrUnseen(item)).toBe(true);

        item = { answered: false, viewed: true, informational: false };
        expect(isItemIncompleteOrUnseen(item)).toBe(true);

        item = { answered: true, viewed: true, informational: false };
        expect(isItemIncompleteOrUnseen(item)).toBe(false);
    });

    it('returns true for item with attempts remaining', () => {
        let item = { answered: false, viewed: true, informational: false, remainingAttempts: 1 };
        expect(isItemIncompleteOrUnseen(item)).toBe(true);
    });

    it('returns false for item with attempts used up', () => {
        let item = { answered: false, viewed: true, informational: false, remainingAttempts: 0 };
        expect(isItemIncompleteOrUnseen(item)).toBe(false);
    });

    it('returns false for informational item', () => {
        let item = { answered: false, viewed: true, informational: true };
        expect(isItemIncompleteOrUnseen(item)).toBe(false);

        item = { answered: false, viewed: false, informational: true };
        expect(isItemIncompleteOrUnseen(item)).toBe(false);
    });
});

describe('isItemOutOfAttempts', () => {
    it('throws if no item', () => {
        expect(() => {
            isItemOutOfAttempts(null);
        }).toThrow();
    });

    test.each([
        [true, 0],
        [false, 1],
        [false, -1],
        [false, void 0]
    ])('returns %s if remainingAttempts %s', (expectedResult, remainingAttempts) => {
        const item = { remainingAttempts };
        expect(isItemOutOfAttempts(item)).toBe(expectedResult);
    });
});

describe('getPartIndex', () => {
    it('returns -1 when the testPart is not set', () => {
        const testMap = {
            parts: {
                part1: {
                    id: 'part1',
                    position: 0
                }
            }
        };
        expect(getPartIndex(void 0, testMap)).toBe(-1);
        expect(getPartIndex(null, testMap)).toBe(-1);
        expect(getPartIndex({ hello: 'hello' })).toBe(-1);
    });

    it('returns -1 when the testMap is not set', () => {
        const testPart = {
            id: 'part1',
            position: 0
        };
        expect(getPartIndex(testPart)).toBe(-1);
        expect(getPartIndex(testPart, null)).toBe(-1);
        expect(getPartIndex(testPart, { hello: 'hello' })).toBe(-1);
    });

    it('returns index of this part among other parts', () => {
        const testMap = {
            parts: {
                part1: {
                    id: 'part1',
                    position: 0
                },
                part3: {
                    id: 'part1',
                    position: 10
                },
                part2: {
                    id: 'part1',
                    position: 4
                },
                part4: {
                    id: 'part1',
                    position: 18
                }
            }
        };
        const testPart = {
            id: 'part3',
            position: 10
        };
        expect(getPartIndex(testPart, testMap)).toEqual(2);
    });

    it('returns index of this part if it is the only part', () => {
        const testMap = {
            parts: {
                part1: {
                    id: 'part1',
                    position: 0
                }
            }
        };
        const testPart = {
            id: 'part1',
            position: 0
        };
        expect(getPartIndex(testPart, testMap)).toEqual(0);
    });
});

describe('getPartTitle', () => {
    function generateTestMapWithParts(partsCount, itemsInPart) {
        const testMap = {
            parts: {}
        };
        for (let i = 0; i < partsCount; i++) {
            testMap.parts[i.toString()] = {
                id: i.toString(),
                position: i * itemsInPart
            };
        }
        return testMap;
    }

    it('returns false when the part is not set', () => {
        const testMap = generateTestMapWithParts(1);
        expect(getPartTitle(void 0, testMap, false)).toBe(false);
        expect(getPartTitle(null, testMap, true)).toBe(false);
        expect(getPartTitle({}, testMap, false)).toBe(false);
        expect(getPartTitle('part', testMap, true)).toBe(false);
    });

    it('returns false when the testMap is not set', () => {
        const testPart = {
            id: 'part3',
            position: 10
        };
        expect(getPartTitle(testPart, true)).toBe(false);
        expect(getPartTitle(testPart, null, false)).toBe(false);
        expect(getPartTitle(testPart, {}, true)).toBe(false);
        expect(getPartTitle(testPart, 'map', false)).toBe(false);
    });

    it('returns the short title when the part has no sections', () => {
        const testMap = generateTestMapWithParts(1459, 1);
        expect(getPartTitle({ id: 'p1', position: 0, sections: [] }, testMap, false)).toEqual('Part I');
        expect(getPartTitle({ id: 'p1', position: 2, sections: {} }, testMap, true)).toEqual('Part III');
        expect(getPartTitle({ id: 'p1', position: 15 }, testMap, false)).toEqual('Part XVI');
        expect(getPartTitle({ id: 'p1', position: 1458, sections: [] }, testMap, true)).toEqual('Part MCDLIX');
    });

    it('returns the short title when the part has more than one section', () => {
        const testMap = generateTestMapWithParts(4, 1);
        expect(getPartTitle({ id: 'p1', position: 0, sections: { s1: {}, s2: {}, s3: {} } }, testMap, true)).toEqual(
            'Part I'
        );
        expect(getPartTitle({ id: 'p1', position: 3, sections: { s1: {}, s3: {} } }, testMap, true)).toEqual('Part IV');
    });

    it('returns the long title when the part has one section and withSectionIfUnique=true', () => {
        const testMap = generateTestMapWithParts(4, 1);
        expect(getPartTitle({ id: 'p1', position: 0, sections: { s1: { label: 'Animals' } } }, testMap, true)).toEqual(
            'Part I: Animals'
        );
        expect(
            getPartTitle({ id: 'p1', position: 1, sections: { s1: { label: 'ELA & Maths, yes!' } } }, testMap, true)
        ).toEqual('Part II: ELA & Maths, yes!');
        expect(getPartTitle({ id: 'p1', position: 3, sections: { s1: {} } }, testMap, true)).toEqual('Part IV');
    });

    it('returns the short title when the part has one section and withSectionIfUnique=false', () => {
        const testMap = generateTestMapWithParts(4, 1);
        expect(getPartTitle({ id: 'p1', position: 0, sections: { s1: { label: 'Animals' } } }, testMap, false)).toEqual(
            'Part I'
        );
        expect(
            getPartTitle({ id: 'p1', position: 1, sections: { s1: { label: 'ELA & Maths, yes!' } } }, testMap, false)
        ).toEqual('Part II');
        expect(getPartTitle({ id: 'p1', position: 3, sections: { s1: {} } }, testMap, false)).toEqual('Part IV');
    });

    it('part number is calculated as index among other parts', () => {
        const testMap = generateTestMapWithParts(3, 4);
        expect(getPartTitle({ id: 'p1', position: 0, sections: { s1: {} } }, testMap, true)).toEqual('Part I');
        expect(getPartTitle({ id: 'p1', position: 4, sections: { s1: {} } }, testMap, false)).toEqual('Part II');
        expect(getPartTitle({ id: 'p1', position: 8, sections: { s1: {} } }, testMap, true)).toEqual('Part III');

        const testMap2 = generateTestMapWithParts(5, 2);
        expect(getPartTitle({ id: 'p1', position: 0, sections: { s1: {} } }, testMap2, true)).toEqual('Part I');
        expect(getPartTitle({ id: 'p1', position: 4, sections: { s1: {} } }, testMap2, false)).toEqual('Part III');
        expect(getPartTitle({ id: 'p1', position: 8, sections: { s1: {} } }, testMap2, true)).toEqual('Part V');
    });
});
