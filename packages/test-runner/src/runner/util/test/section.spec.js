// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getSectionItems, limitSectionItems } from '../section.js';

describe('getSectionItems', () => {
    const bigTestMap = {
        parts: {
            p1: {
                sections: {
                    s1: {
                        items: {
                            a: {
                                id: 'a'
                            },
                            b: {
                                id: 'b'
                            },
                            c: {
                                id: 'c'
                            }
                        }
                    }
                }
            },
            p2: {
                sections: {
                    s1: {
                        items: {}
                    }
                }
            },
            p3: {
                sections: {}
            }
        }
    };

    it('returns all item ids in some section', () => {
        expect(getSectionItems(bigTestMap, 'p1', 's1')).toEqual(['a', 'b', 'c']);
    });

    test.each([
        ['no testPartId', bigTestMap, null, 's1'],
        ['no sectionId', bigTestMap, 'p1', null],
        ['invalid testPartId', bigTestMap, 'wahoo', 's1'],
        ['invalid sectionId', bigTestMap, 'p1', 'yazaa'],
        ['no parts in test', {}, 'p1', 's1'],
        ['no sections in part', bigTestMap, 'p3', 's1'],
        ['no items in section', bigTestMap, 'p2', 's1']
    ])('returns [] when %s', (title, testMap, testPartId, sectionId) => {
        expect(getSectionItems(testMap, testPartId, sectionId)).toEqual([]);
    });
});

describe('limitSectionItems', () => {
    const sectionItems = [1, 2, 3, 4, 5, 6, 7];
    const evens = [2, 4, 6];
    const center = [2, 3, 4, 5, 6];

    it('throws if current item not in section', () => {
        expect(() => {
            limitSectionItems(sectionItems, [], 'foo');
        }).toThrow(TypeError);
    });

    test.each([
        ['picks single item', [], 2, 1, [2]],
        ['picks 3 ahead', [], 1, 3, [1, 2, 3]],
        ['picks 3 behind', [], 7, 3, [7, 6, 5]],
        ['picks ahead & behind', [], 6, 3, [6, 7, 5]],
        ['picks more ahead & behind', [], 4, 5, [4, 5, 6, 7, 3]],
        ['picks until everything picked', [], 1, 99, [1, 2, 3, 4, 5, 6, 7]],
        ['picks 3 ahead (exclusions)', evens, 1, 3, [1, 3, 5]],
        ['picks 3 behind (exclusions)', evens, 7, 3, [7, 5, 3]],
        ['picks more ahead & behind (exclusions)', evens, 4, 5, [5, 7, 3, 1]],
        ['picks ahead over large exluded span', center, 1, 3, [1, 7]],
        ['picks behind over large exluded span', center, 7, 3, [7, 1]],
        ['picks around current item if exluded', [3], 3, 7, [4, 5, 6, 7, 2, 1]],
        ['picks 1 item if limit is 0', [], 3, 0, [3]]
    ])('returns correct items list: %s', (title, excludeItems, currentItem, limit, expected) => {
        expect(limitSectionItems(sectionItems, excludeItems, currentItem, limit)).toEqual(expected);
    });
});
