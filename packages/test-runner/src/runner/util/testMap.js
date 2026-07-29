// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { isLastItemOfPart } from './testPart.js';

/**
 * Getter for item Booleans such as allowSkipping or validateResponses
 * which could be defined at item, section, part or test level
 * @param {String} property - the property name we are looking up
 * @param {Object} item - from a testMap
 * @param {Object} section - from a testMap
 * @param {Object} testPart - from a testMap
 * @param {Object} [options]
 * @param {Boolean} [options.default=false]
 * @returns {Boolean}
 */
export function deepGetItemProperty(property, item = {}, section = {}, testPart = {}, options = { default: false }) {
    if (!property) {
        throw new TypeError('Item property name is mandatory');
    }
    if (typeof item[property] === 'boolean') {
        return item[property];
    } else if (typeof section[property] === 'boolean') {
        return section[property];
    } else if (typeof testPart[property] === 'boolean') {
        return testPart[property];
    } else {
        return options && Boolean(options.default);
    }
}

/**
 * Getter for any property of any item within a testMap
 * @param {Object} testMap
 * @param {String} testPartId - id of testPart to which item belongs
 * @param {String} sectionId - id of section to which item belongs
 * @param {String} itemId - id of item
 * @param {String} property - key of item property that should be updated
 * @returns {*}
 */
export function getItemProperty(testMap, testPartId, sectionId, itemId, property) {
    if (!property || typeof property !== 'string') {
        throw new TypeError('A property key of string type is mandatory');
    }
    if (
        testMap &&
        testPartId &&
        sectionId &&
        itemId &&
        testMap.parts &&
        testMap.parts[testPartId] &&
        testMap.parts[testPartId].sections &&
        testMap.parts[testPartId].sections[sectionId] &&
        testMap.parts[testPartId].sections[sectionId].items &&
        testMap.parts[testPartId].sections[sectionId].items[itemId]
    ) {
        return testMap.parts[testPartId].sections[sectionId].items[itemId][property];
    }
    return null;
}

/**
 * Update specified property for specified item in testMap
 * @param {Object} testMap
 * @param {String} testPartId - id of testPart to which item belongs
 * @param {String} sectionId - id of section to which item belongs
 * @param {String} itemId - id of item
 * @param {String} property - key of item property that should be updated
 * @param {*} value - new value of property
 * @returns {Object} the updated testMap
 */
export function updateItemProperty(testMap, testPartId, sectionId, itemId, property, value) {
    if (!property || typeof property !== 'string') {
        throw new TypeError('A property key of string type is mandatory');
    }

    if (
        testMap &&
        testPartId &&
        sectionId &&
        itemId &&
        testMap.parts &&
        testMap.parts[testPartId] &&
        testMap.parts[testPartId].sections &&
        testMap.parts[testPartId].sections[sectionId] &&
        testMap.parts[testPartId].sections[sectionId].items &&
        testMap.parts[testPartId].sections[sectionId].items[itemId]
    ) {
        testMap.parts[testPartId].sections[sectionId].items[itemId][property] = value;
    }
    return testMap;
}

/**
 * Update the test map item and stats
 * @param {Object} testMap
 * @param {Object} testPart - the current testPart
 * @param {Object} section - the current section
 * @param {Object} updatedItem - the updated item
 * @returns {Object} the updated testMap
 */
export function updateAttempt(testMap, testPart, section, updatedItem) {
    if (
        testMap &&
        testMap.stats &&
        testPart &&
        testPart.id &&
        testMap.parts &&
        testMap.parts[testPart.id] &&
        section &&
        section.id &&
        testMap.parts[testPart.id].sections &&
        testMap.parts[testPart.id].sections[section.id] &&
        testMap.parts[testPart.id].sections[section.id].items &&
        updatedItem &&
        updatedItem.id
    ) {
        const testMapItem = testMap.parts[testPart.id].sections[section.id].items[updatedItem.id];

        // Update stats at all levels
        if (updatedItem.answered && !testMapItem.answered) {
            testMap.stats.answered++;
            testMap.parts[testPart.id].stats.answered++;
            testMap.parts[testPart.id].sections[section.id].stats.answered++;
        }
        if (updatedItem.answered === false && testMapItem.answered) {
            testMap.stats.answered--;
            testMap.parts[testPart.id].stats.answered--;
            testMap.parts[testPart.id].sections[section.id].stats.answered--;
        }

        // Replace full item with incoming version
        testMap.parts[testPart.id].sections[section.id].items[updatedItem.id] = updatedItem;
    }
    return testMap;
}

/**
 * @typedef {Object} itemLookupPath
 * @property {string} itemId - id of item
 * @property {string} sectionId - id of section to which item belongs
 * @property {string} testPartId - id of testPart to which item belongs
 */
/**
 * Get lookup path (item id & section id & part id) of item on the given position
 * @param {Object} testMap
 * @param {number} itemPosition - position of item
 * @returns {itemLookupPath|{}} path - data needed to lookup this item in the testMap
 */
export function itemPathForPosition(testMap, itemPosition) {
    for (let testPartId in testMap.parts || {}) {
        for (let sectionId in testMap.parts[testPartId].sections || {}) {
            const section = testMap.parts[testPartId].sections[sectionId];
            for (let itemId in section.items || {}) {
                const item = section.items[itemId];
                if (item && item.position === itemPosition) {
                    return { testPartId, sectionId, itemId };
                }
            }
        }
    }
    return {};
}

/**
 * Update stats on all levels (section, testPart, test) in testMap
 * @param {Object} testMap
 * @param {String} testPartId
 * @param {String} sectionId
 * @param {String} property - key of stats property that should be updated
 * @param {Boolean} increment - 'true' to increment stats, 'false' to decrement
 * @returns {Object} the updated testMap
 */
export function updateStats(testMap, testPartId, sectionId, property, increment) {
    if (!property || typeof property !== 'string') {
        throw new TypeError('A property key of string type is mandatory');
    }

    if (testMap && testPartId && sectionId) {
        const numericIncrement = increment ? 1 : -1;
        if (
            testMap.parts &&
            testMap.parts[testPartId] &&
            testMap.parts[testPartId].sections &&
            testMap.parts[testPartId].sections[sectionId] &&
            testMap.parts[testPartId].sections[sectionId].stats
        ) {
            testMap.parts[testPartId].sections[sectionId].stats[property] += numericIncrement;
        }
        if (testMap.parts && testMap.parts[testPartId] && testMap.parts[testPartId].stats) {
            testMap.parts[testPartId].stats[property] += numericIncrement;
        }
        if (testMap.stats) {
            testMap.stats[property] += numericIncrement;
        }
    }
    return testMap;
}

/**
 * Rebuild the stats from the items
 * @param {Object} testMap
 * @returns {Object} the updated testMap
 */
export function buildStats(testMap) {
    const itemProps = ['answered', 'flagged', 'viewed'];
    const statsProps = [...itemProps, 'questions', 'questionsViewed', 'total'];
    const emptyStats = stats => statsProps.forEach(key => (stats[key] = 0));
    const forEachMapEntry = (mapEntry, key, callback) => {
        if (mapEntry && mapEntry[key]) {
            mapEntry.stats = mapEntry.stats || {};
            emptyStats(mapEntry.stats);
            Object.keys(mapEntry[key]).forEach(id => callback(mapEntry[key][id]));
        }
    };

    forEachMapEntry(testMap, 'parts', testPart => {
        forEachMapEntry(testPart, 'sections', section => {
            const incStat = key => {
                section.stats[key]++;
                testPart.stats[key]++;
                testMap.stats[key]++;
            };

            forEachMapEntry(section, 'items', item => {
                if (item) {
                    itemProps.forEach(key => item[key] && incStat(key));

                    incStat('total');

                    if (!item.informational) {
                        incStat('questions');

                        if (item.viewed) {
                            incStat('questionsViewed');
                        }
                    }
                }
            });
        });
    });

    return testMap;
}

/**
 * Returns with an item from testMap based on itemIdentifier
 * @param {object} testMap
 * @param {string} itemIdentifier
 * @returns {object|null}
 */
export function getItemByIdentifier(testMap, itemIdentifier) {
    for (let testPartId in testMap.parts || {}) {
        for (let sectionId in testMap.parts[testPartId].sections || {}) {
            const section = testMap.parts[testPartId].sections[sectionId];
            for (let itemId in section.items || {}) {
                const item = section.items[itemId];
                if (item && item.id === itemIdentifier) {
                    return item;
                }
            }
        }
    }
    return null;
}

/**
 * @typedef {Object} TotalScore
 * @property {?Number} totalScore - number >= 0, or `null` if `waitingForExternalScore`
 * @property {?Number} totalMaxScore - number >= 0, or `null` if no max score outcome was defined on any of the items
 * @property {Boolean} waitingForExternalScore
 */
/**
 * Summarize scores for all item in test map
 * @param {Object} testMap
 * @returns {TotalScore}
 */
export function calculateTotalScore(testMap) {
    let totalScore = 0;
    let totalMaxScore = null;
    let waitingForExternalScore = false;

    for (let testPartId in testMap.parts || {}) {
        for (let sectionId in testMap.parts[testPartId].sections || {}) {
            const section = testMap.parts[testPartId].sections[sectionId];
            for (let itemId in section.items || {}) {
                const item = section.items[itemId];
                if (!item) {
                    continue;
                }
                if (isItemWaitingForExternalScore(item)) {
                    waitingForExternalScore = true;
                    continue;
                }
                if (Number.isFinite(item.score)) {
                    totalScore += item.score;
                }
                if (Number.isFinite(item.maxScore)) {
                    totalMaxScore += item.maxScore;
                }
            }
        }
    }

    return {
        // remove imprecisions from float addition
        totalScore: waitingForExternalScore ? null : parseFloat(totalScore.toFixed(10)),
        totalMaxScore: Number.isFinite(totalMaxScore) ? parseFloat(totalMaxScore.toFixed(10)) : null,
        waitingForExternalScore
    };
}

/**
 * If item in testMap cannot be scored yet and is awaiting for external scoring result
 * @param {Object} item
 * @returns {Boolean}
 */
export function isItemWaitingForExternalScore(item) {
    return Boolean(item && item.externalScored && item.score === null && item.maxScore);
}

/**
 * Get a flat list of all the items in test map
 * @param {Object} testMap
 * @returns {Object[]} test map items (properties)
 */
export function getAllItems(testMap = {}) {
    const allItems = [];
    if (!testMap.parts || !Object.keys(testMap.parts).length) {
        return allItems;
    }
    for (const testPart of Object.values(testMap.parts)) {
        for (const section of Object.values(testPart.sections)) {
            for (const item of Object.values(section.items)) {
                allItems.push(item);
            }
        }
    }
    return allItems;
}

/**
 * Check if item has the specified category
 * @param {Object} testMap
 * @param {string} itemIdentifier
 * @param {string} category
 * @returns {boolean}
 */
export function itemHasCategory(testMap, itemIdentifier, category) {
    const item = getItemByIdentifier(testMap, itemIdentifier);
    const { testPartId, sectionId } = itemPathForPosition(testMap, item.position);
    const categories = getItemProperty(testMap, testPartId, sectionId, itemIdentifier, 'categories');
    return Array.isArray(categories) && categories.some(ctg => ctg === category);
}

/**
 * Check if item is the last in the current testPart
 * @param {Object} testMap
 * @param {String} itemIdentifier
 * @returns {Boolean}
 */
export function isLastItemInCurrentPart(testMap, itemIdentifier) {
    const item = getItemByIdentifier(testMap, itemIdentifier);
    if (!item) {
        return false;
    }
    const { testPartId } = itemPathForPosition(testMap, item.position);
    const testPart = testMap.parts[testPartId];
    return isLastItemOfPart(item, testPart);
}
