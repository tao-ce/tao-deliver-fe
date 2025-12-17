// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { __ } from '@oat-sa-private/ui-core';
import toRoman from '@extra-number/to-roman';

/**
 * Check if test part is the last one in the test
 * @param {Object} testPart - TestPart object from store
 * @param {Object} testMap - TestMap object from store
 * @returns {Boolean} if testPart fits this condition
 */
export function isLastPartOfTest(testPart, testMap) {
    const position = testPart.position;
    const allParts = Object.values(testMap.parts);
    return !allParts.some(part => part.position > position);
}

/**
 * Check if section is the last one in its testPart
 * @param {Object} section - Section object from store
 * @param {Object} testPart - TestPart object from store
 * @returns {Boolean} if section fits this condition
 */
export function isLastSectionOfPart(section, testPart) {
    const position = section.position;
    const allSections = Object.values(testPart.sections);
    return !allSections.some(sect => sect.position > position);
}

/**
 * Check if item is the last one in its testPart
 * @param {Object} item - Item object from store
 * @param {Object} testPart - TestPart object from store
 * @returns {Boolean} if item fits this condition
 */
export function isLastItemOfPart(item, testPart) {
    const position = item.position;
    const allItems = allItemsInPart(testPart);
    return !allItems.some(itm => itm.position > position);
}

/**
 * Aggregate all items from a testPart
 * @param {Object} testPart - TestPart object from store
 * @returns {Object[]} item list
 */
function allItemsInPart(testPart) {
    const allSections = Object.values(testPart.sections);
    const allItems = allSections.reduce((acc, section) => {
        const itemsInSectionArray = Object.values(testPart.sections[section.id].items);
        return acc.concat(itemsInSectionArray);
    }, []);
    return allItems;
}

/**
 * Check if a given item and section are both not timed out
 * @param {Object} item
 * @param {Object} section
 * @param {SvelteStore} timersStore - store from timersService
 * @returns {Boolean}
 */
function itemAndSectionHasTime(item, section, timersStore) {
    const sectionTimer = timersStore.getTimerFor('section', section.id);
    const itemTimer = timersStore.getTimerFor('item', item.id);
    const extraTimer = timersStore.getTimerFor('extra');
    const extraTime = extraTimer ? extraTimer.timerValue.timeLeft : 0;
    const sectionHasTime = !sectionTimer || sectionTimer.timerValue.timeLeft + extraTime > 0;
    const itemHasTime = !itemTimer || itemTimer.timerValue.timeLeft + extraTime > 0;
    return sectionHasTime && itemHasTime;
}

/**
 * Check if there is some item in some section anywhere in the testPart which is timerless or is not timed out yet
 * @param {Object} testPart - TestPart object from store
 * @param {SvelteStore} timersStore - store from timersService
 * @returns {Boolean} if item fits this condition
 */
export function hasTimeRemainingItems(testPart, timersStore) {
    const allSections = Object.values(testPart.sections);
    return allSections.some(section => {
        const allItems = Object.values(section.items);
        return allItems.some(item => itemAndSectionHasTime(item, section, timersStore));
    });
}

/**
 * Check if there is some item in some section ahead of the current position in the testPart, which is timerless or is not timed out yet
 * @param {Object} testContext
 * @param {Object} testPart - TestPart object from store
 * @param {SvelteStore} timersStore - store from timersService
 * @returns {Boolean} if item fits this condition
 */
export function hasTimeRemainingItemsAhead(testContext, testPart, timersStore) {
    const allSections = Object.values(testPart.sections);
    return allSections.some(section => {
        const allItems = Object.values(section.items);
        return allItems.some(item => {
            if (item.position <= testContext.itemPosition) {
                return false;
            }
            return itemAndSectionHasTime(item, section, timersStore);
        });
    });
}

/**
 * Get count of incomplete or unseen items in test part
 * @param {Object} testPart - TestPart object from store
 * @returns {Number} count
 */
export function countOfIncompleteOrUnseenItems(testPart) {
    const allSections = Object.values(testPart.sections);
    return allSections.reduce((acc, section) => {
        const itemsInSectionArray = Object.values(testPart.sections[section.id].items);
        return acc + itemsInSectionArray.filter(isItemIncompleteOrUnseen).length;
    }, 0);
}

/**
 * Check if item is incomplete
 * @param {Object} item - Item object from store
 * @returns {Boolean} if item fits this condition
 */
export function isItemIncomplete(item) {
    return item.viewed && !item.answered && !item.informational;
}

/**
 * Check if item is incomplete or unseen
 * @param {Object} item - Item object from store
 * @returns {Boolean} if item fits this condition
 */
export function isItemIncompleteOrUnseen(item) {
    return !item.informational && !item.answered && !isItemOutOfAttempts(item);
}

/**
 * Check if item had remainingAttempts which are now used up
 * @param {Object} item - Item object from store
 * @returns {Boolean} if item fits this condition
 */
export function isItemOutOfAttempts(item) {
    return item.remainingAttempts === 0;
}

/**
 * Get index of this test part among other test parts
 * @param {Object} testPart - the test part
 * @param {Object} testMap - the test map
 * @returns {Number} - index of this part, or -1 if the test part is missing
 */
export function getPartIndex(testPart, testMap) {
    if (testPart && testPart.id && testMap && testMap.parts) {
        return Object.values(testMap.parts).filter(part => part.position < testPart.position).length;
    }
    return -1;
}

/**
 * Get the test part title. Since test parts don't have title
 * we use the following construction :
 *  - if the part contains a unique section :  Part <numberInRoman>: <section label>
 *  - if the part contains multiple sections :  Part <numberInRoman>
 * @param {Object} testPart - the test part
 * @param {Object} testMap - the test map
 * @param {Boolean} withSectionIfUnique
 * @returns {string|boolean} - the title or false if the test part is missing
 */
export function getPartTitle(testPart, testMap, withSectionIfUnique = false) {
    const partLabel = __('Part');
    if (testPart && testPart.id && testMap && testMap.parts) {
        const partNumber = toRoman(getPartIndex(testPart, testMap) + 1);
        if (withSectionIfUnique) {
            const sectionKeys = testPart.sections ? Object.keys(testPart.sections) : [];
            if (sectionKeys.length === 1) {
                const sectionLabel = testPart.sections[sectionKeys[0]].label;
                if (sectionLabel) {
                    return `${partLabel} ${partNumber}: ${sectionLabel}`;
                }
            }
        }
        return `${partLabel} ${partNumber}`;
    }
    return false;
}
