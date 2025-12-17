// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { itemPathForPosition } from './testMap.js';

/**
 * Check if testRunner.move method will move to another test part
 * @param {Object} testMap - current testMap object from store
 * @param {Object} currentPosition - current item position
 * @param {String} moveDirection - direction passed to testRunner.move
 * @param {String} moveScope - scope passed to testRunner.move
 * @param {String} moveRef - ref passed to testRunner.move
 * @returns {Boolean} is moving to another test part
 */
export function isLeavingTestPart(testMap, currentPosition, moveDirection, moveScope, moveRef) {
    if (
        (moveScope !== 'testPart' && moveScope !== 'section' && moveScope !== 'item' && moveScope !== 'test') ||
        (!moveRef && moveRef !== 0 && moveDirection !== 'next' && moveDirection !== 'previous')
    ) {
        throw new Error('unknown move configuration');
    }
    if (!testMap) {
        return false;
    } else if (moveScope === 'testPart' || moveScope === 'test') {
        return true;
    } else {
        const { testPartId, sectionId } = itemPathForPosition(testMap, currentPosition);
        if (
            testPartId &&
            sectionId &&
            testMap.parts[testPartId].stats &&
            testMap.parts[testPartId].sections[sectionId].stats
        ) {
            const testPart = testMap.parts[testPartId];
            const firstInTestPart = testPart.position;
            const lastInTestPart = testPart.position + testPart.stats.total - 1;
            const section = testMap.parts[testPartId].sections[sectionId];
            const firstInSection = section.position;
            const lastInSection = section.position + section.stats.total - 1;

            let movePosition;
            if (moveRef || moveRef === 0) {
                movePosition = moveRef;
            } else if (moveScope === 'item') {
                movePosition = currentPosition + (moveDirection === 'next' ? 1 : -1);
            } else if (moveScope === 'section') {
                movePosition = moveDirection === 'next' ? lastInSection + 1 : firstInSection - 1;
            }
            return movePosition < firstInTestPart || movePosition > lastInTestPart;
        } else {
            return false;
        }
    }
}

/**
 * @typedef {Object} MoveParams
 * @property {String} direction - next, previous, or jump
 * @property {String} scope - test, testPart, section, or item
 * @property {Number} ref - position to jump to
 * @property {Object} itemState
 * @property {Object} itemResponse
 */

/**
 * Get the new item position specifed by move params
 * @param {MoveParams} params
 * @param {TestMap} testMap
 * @param {TestContext} testContext
 * @returns {Number} new item position
 */
export function getNewPosition(params, testMap, testContext) {
    const { direction, scope, ref } = params;
    let newPosition = testContext.itemPosition;

    if (direction === 'next') {
        if (scope === 'testPart') {
            // moving to new part
            const testPartPosition = testMap.parts[testContext.testPartId].position;
            const nextPartsSorted = Object.values(testMap.parts)
                .filter(p => p.position > testPartPosition)
                .sort((a, b) => a.position - b.position);

            if (nextPartsSorted.length > 0) {
                newPosition = Math.min(testMap.stats.total - 1, nextPartsSorted[0].position);
            }
        } else {
            // staying in current part
            if (testContext.itemPosition + 1 < testMap.stats.total) {
                newPosition = Math.min(testMap.stats.total - 1, testContext.itemPosition + 1);
            }
        }
    } else if (direction === 'previous') {
        newPosition = Math.max(0, testContext.itemPosition - 1);
    } else if (direction === 'jump' && ref >= 0) {
        newPosition = ref;
    }

    return newPosition;
}
