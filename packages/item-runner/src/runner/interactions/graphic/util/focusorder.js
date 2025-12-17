// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';

/**
 * Sort the SVG choices so they can be navigated in the order of reading
 * (typically top-to-bottom, left-to-right)
 * @param {Object[]} choiceList
 * @param {Boolean} [isRTL=false]
 * @returns {String[]} sorted choiceList, keys only
 */
export function sortChoicesByBoundingBox(choiceList, isRTL = false) {
    const choiceBoundingBoxes = choiceList.map(choice => ({
        key: choice.key,
        bbox: (choice && choice.svg && choice.svg.bbox()) || {}
    }));
    return sortByBoundingBox(choiceBoundingBoxes, isRTL);
}

/**
 * Sort the choices so they can be navigated in the order of reading
 * (typically top-to-bottom, left-to-right)
 * @param {Object[]} choiceBoundingBoxes - [{key: String, bbox: {x: Number, y: Number, x2: Number, y2: Number} }]
 * @param {Boolean} [isRTL=false]
 * @returns {String[]} sorted choiceList, keys only
 */
export function sortByBoundingBox(choiceBoundingBoxes, isRTL = false) {
    return choiceBoundingBoxes
        .map(({ key, bbox }) => {
            const choice = {
                key,
                startY: bbox.y || 0,
                startX: bbox.x || 0,
                endX: bbox.x2 || bbox.x || 0
            };
            return choice;
        })
        .sort((choiceA, choiceB) => {
            // put into nearest 20px horizontal band before Y value comparison:
            const bandA = Math.round(choiceA.startY / 20);
            const bandB = Math.round(choiceB.startY / 20);
            if (bandA !== bandB) {
                // top before bottom
                return choiceA.startY - choiceB.startY;
            } else {
                if (isRTL) {
                    // right before left
                    return choiceB.endX - choiceA.endX;
                } else {
                    // left before right
                    return choiceA.startX - choiceB.startX;
                }
            }
        })
        .map(choice => choice.key);
}

/**
 * Get an ARIA label composed of list position description,
 * according to the choice's position in given tabbing order,
 * and optional authored ariaLabel
 * @param {Object} choice
 * @param {String[]} [keyOrder=[]]
 * @returns {String}
 */
export function getChoiceNumericLabel(choice, keyOrder = []) {
    if (!choice.key || !keyOrder.length) {
        return '';
    }
    const index = keyOrder.indexOf(choice.key);
    const numericPart = __('option %d of %d', index + 1, keyOrder.length);
    return `${numericPart} ${choice.hotspotLabel || ''}`.trim();
}

/**
 * Tells if an element is rendered as right-to-left
 * @param {DOMElement} element
 * @returns {Boolean}
 */
export function isRTLElement(element) {
    return window.getComputedStyle(element).getPropertyValue('direction') === 'rtl';
}
