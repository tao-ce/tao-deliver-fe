// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { updateBookmarkInTestMap } from '../bookmark.js';

describe('updateBookmarkInTestMap', () => {
    it('throws if no testMap', () => {
        expect(() => {
            updateBookmarkInTestMap(null, true, 0, 0, 0);
        }).toThrow();
    });

    it('updates flagged property of item and stats, and returns mutated object', () => {
        const testMap = {
            parts: {
                part1: {
                    id: 'part1',
                    sections: {
                        section1: {
                            id: 'section1',
                            items: {
                                item1: {
                                    id: 'item1',
                                    position: 0,
                                    flagged: false,
                                    viewed: false
                                },
                                item2: {
                                    id: 'item2',
                                    position: 1,
                                    flagged: false,
                                    viewed: false
                                }
                            },
                            stats: {
                                flagged: 0,
                                total: 2
                            }
                        }
                    },
                    stats: {
                        flagged: 0,
                        total: 2
                    }
                }
            },
            stats: {
                flagged: 0,
                total: 2
            }
        };
        const updated = updateBookmarkInTestMap(testMap, 1, true);
        expect(updated === testMap).toBe(true);
        expect(testMap).toStrictEqual({
            parts: {
                part1: {
                    id: 'part1',
                    sections: {
                        section1: {
                            id: 'section1',
                            items: {
                                item1: {
                                    id: 'item1',
                                    position: 0,
                                    flagged: false,
                                    viewed: false
                                },
                                item2: {
                                    id: 'item2',
                                    position: 1,
                                    flagged: true,
                                    viewed: false
                                }
                            },
                            stats: {
                                flagged: 1,
                                total: 2
                            }
                        }
                    },
                    stats: {
                        flagged: 1,
                        total: 2
                    }
                }
            },
            stats: {
                flagged: 1,
                total: 2
            }
        });

        updateBookmarkInTestMap(testMap, 1, false);
        expect(testMap.parts['part1'].sections['section1'].items['item2'].flagged).toBe(false);
        expect(testMap.parts['part1'].sections['section1'].stats.flagged).toBe(0);
        expect(testMap.parts['part1'].stats.flagged).toBe(0);
        expect(testMap.stats.flagged).toBe(0);
    });
});
