// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { isLeavingTestPart, getNewPosition } from '../movement.js';

describe('isLeavingTestPart', () => {
    it('throws if unknown scope or direction', () => {
        const testMap = {
            parts: {
                part1: {
                    position: 0,
                    stats: { total: 1 },
                    sections: {
                        section1: {
                            position: 0,
                            stats: {},
                            items: {
                                item1: {
                                    position: 0
                                }
                            }
                        }
                    }
                }
            }
        };
        expect(() => {
            isLeavingTestPart(testMap, 0, 'next', 'testSection', null);
        }).toThrow();
        expect(() => {
            isLeavingTestPart(testMap, 0, 'prev', 'item', null);
        }).toThrow();
    });

    it('returns true if scope:testPart or scope:test', () => {
        const testMap = {
            parts: {
                part1: {
                    position: 0,
                    stats: { total: 1 },
                    sections: {
                        section1: {
                            position: 0,
                            stats: {},
                            items: {
                                item1: {
                                    position: 0
                                }
                            }
                        }
                    }
                }
            }
        };
        expect(isLeavingTestPart(testMap, null, 'next', 'testPart', null)).toBe(true);
        expect(isLeavingTestPart(testMap, null, 'next', 'test', null)).toBe(true);
    });

    it('returns false if scope:item and ref is from the current test part', () => {
        const testMap = {
            parts: {
                part1: {
                    position: 2,
                    stats: { total: 3 },
                    sections: {
                        section1: {
                            position: 2,
                            stats: {},
                            items: {
                                item1: { position: 2 },
                                item2: { position: 3 },
                                item3: { position: 4 }
                            }
                        }
                    }
                }
            }
        };
        expect(isLeavingTestPart(testMap, 3, 'next', 'item')).toBe(false);
        expect(isLeavingTestPart(testMap, 3, 'previous', 'item')).toBe(false);
        expect(isLeavingTestPart(testMap, 3, 'jump', 'item', 3)).toBe(false);
    });

    it('returns true if scope:item and ref is from another test part', () => {
        const testMap = {
            parts: {
                part1: {
                    position: 2,
                    stats: { total: 1 },
                    sections: {
                        section1: {
                            position: 2,
                            stats: {},
                            items: {
                                item1: {
                                    position: 2
                                }
                            }
                        }
                    }
                }
            }
        };
        expect(isLeavingTestPart(testMap, 2, 'next', 'item')).toBe(true);
        expect(isLeavingTestPart(testMap, 2, 'previous', 'item')).toBe(true);
        expect(isLeavingTestPart(testMap, 2, 'jump', 'item', 3)).toBe(true);
    });

    it('returns false if scope:section and ref is from the current test part', () => {
        const testMap = {
            parts: {
                part1: {
                    position: 2,
                    stats: { total: 5 },
                    sections: {
                        section1: {
                            position: 2,
                            stats: { total: 1 },
                            items: {
                                item1: { position: 2 }
                            }
                        },
                        section2: {
                            position: 3,
                            stats: { total: 3 },
                            items: {
                                item2: { position: 3 },
                                item3: { position: 4 },
                                item4: { position: 5 }
                            }
                        },
                        section3: {
                            position: 6,
                            stats: { total: 1 },
                            items: {
                                item5: { position: 6 }
                            }
                        }
                    }
                }
            }
        };
        expect(isLeavingTestPart(testMap, 4, 'next', 'section')).toBe(false);
        expect(isLeavingTestPart(testMap, 4, 'previous', 'section')).toBe(false);
        expect(isLeavingTestPart(testMap, 4, 'jump', 'section', 6)).toBe(false);
    });

    it('returns true if scope:section and ref is from another test part', () => {
        const testMap = {
            parts: {
                part1: {
                    position: 2,
                    stats: { total: 3 },
                    sections: {
                        section1: {
                            position: 2,
                            stats: { total: 3 },
                            items: {
                                item1: { position: 2 },
                                item2: { position: 3 },
                                item3: { position: 4 }
                            }
                        }
                    }
                }
            }
        };
        expect(isLeavingTestPart(testMap, 3, 'next', 'section')).toBe(true);
        expect(isLeavingTestPart(testMap, 3, 'previous', 'section')).toBe(true);
        expect(isLeavingTestPart(testMap, 3, 'jump', 'section', 1)).toBe(true);
    });
});

describe('getNewPosition', () => {
    const bigTestMap = {
        parts: {
            part1: {
                position: 0,
                sections: {
                    section1: {
                        position: 0,
                        items: {
                            item1: {
                                position: 0
                            },
                            item2: {
                                position: 1
                            },
                            item3: {
                                position: 2
                            }
                        }
                    },
                    section2: {
                        position: 3,
                        items: {
                            item1: {
                                position: 3
                            }
                        }
                    },
                    stats: { total: 4 }
                }
            },
            part2: {
                position: 4,
                sections: {
                    section1: {
                        position: 4,
                        items: {
                            item1: {
                                position: 4
                            }
                        }
                    }
                },
                stats: { total: 1 }
            }
        },
        stats: { total: 5 }
    };

    test.each([
        ['next', 'testPart', null, 'part1', 3, 4],
        ['next', 'testPart', null, 'part1', 4, 4],
        ['next', 'item', null, 'part1', 0, 1],
        ['next', 'item', null, 'part1', 1, 2],
        ['next', 'item', null, 'part1', 2, 3],
        ['previous', 'item', null, 'part1', 3, 2],
        ['previous', 'item', null, 'part1', 2, 1],
        ['previous', 'item', null, 'part1', 1, 0],
        ['jump', 'item', 3, 'part1', 1, 3],
        ['jump', 'item', 1, 'part1', 3, 1],
        ['jump', 'item', 4, 'part1', 1, 4],
        ['jump', 'item', 1, 'part1', 4, 1]
    ])(
        'returns new position for direction: %s, scope: %s, ref: %s, part: %s, item %s to item %s',
        (direction, scope, ref, testPartId, itemPosition, expectedPos) => {
            const params = { direction, scope, ref };
            const testContext = { testPartId, itemPosition };
            const res = getNewPosition(params, bigTestMap, testContext);
            expect(res).toBe(expectedPos);
        }
    );
});
