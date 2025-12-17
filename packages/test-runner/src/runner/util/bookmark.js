// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { itemPathForPosition, updateItemProperty, updateStats } from './testMap.js';

/**
 * Update 'bookmarked'('flagged') state of the given item in the testMap
 * @param {Object} testMap
 * @param {number} position - item position
 * @param {boolean} bookmarked - set or remove bookmark
 * @returns {Object} the updated testMap
 */
export function updateBookmarkInTestMap(testMap, position, bookmarked) {
    const { itemId, sectionId, testPartId } = itemPathForPosition(testMap, position);
    if (itemId && sectionId && testPartId) {
        updateItemProperty(testMap, testPartId, sectionId, itemId, 'flagged', bookmarked);
        updateStats(testMap, testPartId, sectionId, 'flagged', bookmarked);
    }
    return testMap;
}
