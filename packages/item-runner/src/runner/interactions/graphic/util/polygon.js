// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const floatPrecision = 0.01;

/**
 * Detects the orientation of a polygon
 * https://en.wikipedia.org/wiki/Curve_orientation#Orientation_of_a_simple_polygon
 * @param {Number[][]} vertexCoords vertex coordinates array
 * @returns {boolean} true if clockwise, false if counter-clockwise
 */
function getIsClockwise(vertexCoords) {
    //find the vertex with the largest x and smallest y
    const maxX = Math.max(...vertexCoords.map(vertexCoord => vertexCoord[0]));
    const minY = Math.min(
        ...vertexCoords
            .filter(vertexCoord => Math.abs(vertexCoord[0] - maxX) < floatPrecision)
            .map(vertexCoord => vertexCoord[1])
    );
    const convexHullVertexIndex = vertexCoords.findIndex(
        vertexCoord =>
            Math.abs(vertexCoord[0] - maxX) < floatPrecision && Math.abs(vertexCoord[1] - minY) <= floatPrecision
    );

    const B = vertexCoords[convexHullVertexIndex];
    const A = vertexCoords[(convexHullVertexIndex + vertexCoords.length - 1) % vertexCoords.length];
    const C = vertexCoords[(convexHullVertexIndex + 1) % vertexCoords.length];

    //orientation matrix determinant
    const det = B[0] * C[1] + A[0] * B[1] + A[1] * C[0] - A[1] * B[0] - B[1] * C[0] - A[0] * C[1];
    return det > 0;
}

/**
 * Fix coordinates
 * @param {Number[]} coords raw coordinates
 * @returns {Number[]} raw coordinates array
 */
export function fixCoordinates(coords) {
    if (
        coords &&
        coords.length &&
        Math.abs(coords[0] - coords[coords.length - 2]) < floatPrecision &&
        Math.abs(coords[1] - coords[coords.length - 1]) < floatPrecision
    ) {
        coords = coords.slice(0, -2);
    }
    coords = removeRepeatingCoords(coords);
    return coords;
}

/**
 * Remove repeating coordinates
 * @param {Number[]} coords raw coordinates
 * @returns {Number[]} raw coordinates array
 */
function removeRepeatingCoords(coords) {
    if (coords && coords.length) {
        for (let i = 0; i < coords.length - 3; i++) {
            if (i % 2 === 0 && typeof coords[i + 2] !== 'undefined' && typeof coords[i + 3] !== 'undefined') {
                if (
                    Math.abs(coords[i] - coords[i + 2]) < floatPrecision &&
                    Math.abs(coords[i + 1] - coords[i + 3]) < floatPrecision
                ) {
                    return removeRepeatingCoords([...coords.slice(0, i), ...coords.slice(i + 2)]);
                }
            }
        }
    }
    return coords;
}

/**
 * Returns array of vertex coordinates
 * @param {Number[]} coords raw array of coordinates
 * @returns {Number[][]} vertex coordinates array
 */
export function getVertexCoords(coords) {
    return coords.reduce((acc, currentCoord, index) => {
        if (index % 2) {
            acc[acc.length - 1].push(currentCoord);
            //acc.push(acc[acc.length - 1]);
        } else {
            acc.push([currentCoord]);
        }
        return acc;
    }, []);
}

/**
 * Assume that center is in the "fattest" place in the polygon (farthest from all borders),
 * and check if at least the "fattest" place can fully fit the rectangle of the defined min size inside.
 * @param {import('@svgdotjs/svg.js').Element} polyEl
 * @param {Number} cx - polygon center x
 * @param {Number} cy - polygon center y
 * @param {Number} minSizePx
 * @returns {Boolean}
 */
export function getIsThin(polyEl, cx, cy, minSizePx) {
    const checker = polyEl.circle(minSizePx).attr({ cx, cy }).attr({ style: 'opacity:0' });
    const checkerBox = checker.node.getBoundingClientRect();
    const checkerPoints = [
        [checkerBox.left, checkerBox.top],
        [checkerBox.right, checkerBox.top],
        [checkerBox.right, checkerBox.bottom],
        [checkerBox.left, checkerBox.bottom]
    ];
    checker.remove();

    const originalStyle = polyEl.attr('style');
    polyEl.attr({ style: `${originalStyle || ''}; pointer-events: auto` });
    const result = checkerPoints.some(([x, y]) => {
        const pointNode = document.elementFromPoint(x, y);
        return !pointNode || !polyEl.node.contains(pointNode);
    });
    polyEl.attr({ style: originalStyle || null });

    return result;
}

/**
 * Finds the closest point in a set of points to a target point.
 * @param {Number[]} point - point to which the distance is checked
 * @param {Number[][]} vertexCoords - polygon coords
 * @returns {Number}
 */
function findClosestPointIdx(point, vertexCoords) {
    const distancesSq = vertexCoords.map(c => {
        const dx = point[0] - c[0];
        const dy = point[1] - c[1];
        return dx * dx + dy * dy;
    });
    const minDistanceSq = Math.min(...distancesSq);
    return distancesSq.indexOf(minDistanceSq);
}

/**
 * Get coordinates for the "inverted" clipPath for the polygon:
 * it will cut the inside half of polygon stroke, and leave the outside half
 * @param {Number[][]}  vertexCoords - polygon coords
 * @param {import('@svgdotjs/svg.js').Element} polyEl
 * @returns {Number[][]}
 */
export function getInvertedClipPathCoords(vertexCoords, polyEl) {
    const box = polyEl.node.getBBox({ fill: true, stroke: false, clipped: false });
    const offset = 10;
    let boundingRectPoints = [
        [box.x - offset, box.y - offset],
        [box.x + box.width + offset, box.y - offset],
        [box.x + box.width + offset, box.y + box.height + offset],
        [box.x - offset, box.y + box.height + offset]
    ];
    // If poly clockwise, then rect counter-clockwise. If poly counter-clockwise, then rect clockwise.
    const isPolyClockwise = getIsClockwise(vertexCoords);
    if (isPolyClockwise) {
        boundingRectPoints.reverse();
    }

    const closestVertexCoordIdx = findClosestPointIdx(boundingRectPoints[0], vertexCoords);
    const vertexCoordsReordered = [
        ...vertexCoords.slice(closestVertexCoordIdx),
        ...vertexCoords.slice(0, closestVertexCoordIdx)
    ];
    return [...vertexCoordsReordered, vertexCoordsReordered[0], ...boundingRectPoints, boundingRectPoints[0]];
}
