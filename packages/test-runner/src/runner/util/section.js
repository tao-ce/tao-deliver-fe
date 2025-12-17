// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Get the item identifiers of the whole section
 * @param {Object} testMap
 * @param {String} testPartId
 * @param {String} sectionId
 * @returns {String[]} item identifiers, sorted by position in section
 */
export function getSectionItems(testMap, testPartId, sectionId) {
    const items = [];
    if (testMap && testPartId && sectionId && testMap.parts && testMap.parts[testPartId]) {
        const part = testMap.parts[testPartId];
        if (part && part.sections && part.sections[sectionId]) {
            const section = part.sections[sectionId];
            if (section && section.items) {
                for (let item of Object.values(section.items)) {
                    items.push(item);
                }
            }
        }
    }
    if (items.length) {
        return items.sort((a, b) => a.position - b.position).map(item => item.id);
    }
    return [];
}

/**
 * Calculate an item list for batch preloading.
 * The strategy is to collect identifiers ahead of the current item in a test section,
 * followed by those behind the current item.
 * @param {String[]} sectionItems item identifiers in section order
 * @param {String[]} excludeItems item identifiers which shouldn't appear in result
 * @param {String} currentItem current item identifier
 * @param {Number} [limit=10]
 * @returns {String[]} filtered item identifiers
 */
export function limitSectionItems(sectionItems, excludeItems, currentItem, limit = 10) {
    const currentItemIndex = sectionItems.indexOf(currentItem);
    if (currentItemIndex === -1) {
        throw new TypeError(`itemIdentifier "${currentItem}" not found in section items [${sectionItems}]`);
    }

    limit = Math.max(limit, 1); // allow first (current) item to pass

    let items = [];

    // fill current item and items ahead in section
    let i;
    for (i = currentItemIndex; i < sectionItems.length; i++) {
        if (items.length >= limit) {
            break;
        }
        if (!excludeItems.includes(sectionItems[i])) {
            items.push(sectionItems[i]);
        }
    }
    // fill backwards
    for (i = currentItemIndex - 1; i >= 0; i--) {
        if (items.length >= limit) {
            break;
        }
        if (!excludeItems.includes(sectionItems[i])) {
            items.push(sectionItems[i]);
        }
    }
    return items;
}
