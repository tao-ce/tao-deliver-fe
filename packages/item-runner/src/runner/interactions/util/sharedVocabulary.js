// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { extractAllFromClasses } from '../util/attributes.js';

/**
 * Enumeration of QTI orientations.
 * @type {object}
 */
export const orientations = Object.freeze({
    horizontal: 'horizontal',
    vertical: 'vertical'
});

/**
 * Enumeration of QTI positions.
 * @type {object}
 */
export const positions = Object.freeze({
    top: 'top',
    left: 'left',
    bottom: 'bottom',
    right: 'right'
});

/**
 * Enumeration of interaction areas.
 * @type {object}
 */
export const areas = Object.freeze({
    choices: 'choices',
    answers: 'answers'
});

/**
 * Enumeration of interaction order types.
 * @type {object}
 */
export const orders = Object.freeze({
    sort: 'sort',
    single: 'single',
});

/**
 * The list of possible QTI orientations.
 * @type {string[]}
 */
export const orientationStrings = Object.values(orientations);

/**
 * The list of possible QTI positions.
 * @type {string[]}
 */
export const positionStrings = Object.values(positions);

/**
 * The list of possible interaction areas.
 * @type {string[]}
 */
export const areaStrings = Object.values(areas);

/**
 * The list of QTI positions leading to vertical positioning.
 * @type {string[]}
 */
export const verticalPositions = [positions.top, positions.bottom];

/**
 * The list of QTI positions leading to horizontal positioning.
 * @type {string[]}
 */
export const horizontalPositions = [positions.left, positions.right];

/**
 * The list of QTI positions leading to reverted positioning.
 * @type {string[]}
 */
export const revertedPositions = [positions.right, positions.bottom];

/**
 * The list of interaction areas in classical order.
 * @type {string[]}
 */
export const orderedAreas = [areas.choices, areas.answers];

/**
 * The list of interaction areas in reverted order.
 * @type {string[]}
 */
export const revertedAreas = [areas.answers, areas.choices];

/**
 * Gets the orientation from the classes (shared vocabulary).
 *
 * The orientation may come either from a QTI attribute or from a class as a shared vocabulary.
 * We prefer the QTI class over the attribute.
 *
 * @param {string|string[]} classes - A list of classes in which find a shared vocabulary related to orientation.
 * @param {string} orientation - The default orientation.
 * @returns {string} The orientation as defined either by the shared vocabulary or by the attribute.
 */
export function getOrientation(classes, orientation = orientations.vertical) {
    const specifiers = extractAllFromClasses(classes, 'qti-orientation-');

    for (const specifier of orientationStrings) {
        if (specifiers.includes(specifier)) {
            return specifier;
        }
    }

    return orientations[orientation] || orientations.vertical;
}

/**
 * Gets the positioning from the classes (shared vocabulary).
 *
 * @param {string|string[]} classes - A list of classes in which find a shared vocabulary related to orientation.
 * @param {string} position - The default positioning.
 * @returns {string} The positioning as defined by the shared vocabulary.
 */
export function getPositioning(classes, position = positions.left) {
    const specifiers = extractAllFromClasses(classes, 'qti-choices-');

    for (const specifier of positionStrings) {
        if (specifiers.includes(specifier)) {
            return specifier;
        }
    }

    return positions[position] || positions.left;
}

/**
 * Tells if a position relates to vertical positioning.
 * @param {string} position - The position to check.
 * @returns {boolean} Returns `true` if the position relates to vertical positioning.
 */
export const isVerticalPosition = position => verticalPositions.includes(position);

/**
 * Tells if a position relates to horizontal positioning.
 * @param {string} position - The position to check.
 * @returns {boolean} Returns `true` if the position relates to horizontal positioning.
 */
export const isHorizontalPosition = position => horizontalPositions.includes(position);

/**
 * Tells if a position relates to reverted positioning.
 * @param {string} position - The position to check.
 * @returns {boolean} Returns `true` if the position relates to reverted positioning.
 */
export const isRevertedPosition = position => revertedPositions.includes(position);

/**
 * Gets the list of interaction areas in the correct order with respect to the given position.
 * @param {string} position - The position to check.
 * @returns {string[]} Returns a list of areas in the expected order.
 */
export function getAreasOrder(position) {
    if (isRevertedPosition(position)) {
        return revertedAreas;
    }
    return orderedAreas;
}
