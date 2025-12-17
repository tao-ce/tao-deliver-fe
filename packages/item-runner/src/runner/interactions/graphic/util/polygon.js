// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const floatPrecision = 0.01;

/**
 * Detects the orientation of a polygon
 * https://en.wikipedia.org/wiki/Curve_orientation#Orientation_of_a_simple_polygon
 * @param {Array(Number[])} vertexCoords vertex coordinates array
 * @returns {(1|-1)} -1 is for clockwise 1 is for counter-clockwise
 */
function getOrientation(vertexCoords) {
    //find the vertex with the largest x and smallest y
    const maxX = Math.max.apply(
        null,
        vertexCoords.map(vertexCoord => vertexCoord[0])
    );
    const minY = Math.min.apply(
        null,
        vertexCoords
            .filter(vertexCoord => Math.abs(vertexCoord[0] - maxX) < floatPrecision)
            .map(vertexCoord => vertexCoord[1])
    );
    const convexHullVertexIndex = vertexCoords.findIndex(
        vertexCoord =>
            //eslint-disable-next-line implicit-arrow-linebreak
            Math.abs(vertexCoord[0] - maxX) < floatPrecision && Math.abs(vertexCoord[1] - minY) <= floatPrecision
    );

    const B = vertexCoords[convexHullVertexIndex];
    const A = vertexCoords[(convexHullVertexIndex + vertexCoords.length - 1) % vertexCoords.length];
    const C = vertexCoords[(convexHullVertexIndex + 1) % vertexCoords.length];

    //orientation matrix determinant
    const det = B[0] * C[1] + A[0] * B[1] + A[1] * C[0] - A[1] * B[0] - B[1] * C[0] - A[0] * C[1];
    return det / Math.abs(det);
}

/**
 * Calculates the vertex coordinates of inset polygon
 * @param {Number[]} coords raw array of coordinates
 * @param {Number} delta offset value in pixels
 * @returns {Array[Number[]]} vertex coordinates array
 */
export function calculateInnerPolygonCoords(coords, delta) {
    const vertexArray = getVertexCoords(coords);
    const orientation = getOrientation(vertexArray);
    const sideVectors = vertexArray.map((vertexCoord, index) => {
        const next = (index + 1) % vertexArray.length;
        return [vertexCoord[0] - vertexArray[next][0], vertexCoord[1] - vertexArray[next][1]];
    });
    const normalVectors = sideVectors.map(vectorCoords => {
        const sideVectorLength = Math.sqrt(Math.pow(vectorCoords[0], 2) + Math.pow(vectorCoords[1], 2));
        return [vectorCoords[1] / sideVectorLength, -vectorCoords[0] / sideVectorLength];
    });

    return vertexArray.map((coord, index) => {
        const prevNormalVector = index === 0 ? normalVectors[normalVectors.length - 1] : normalVectors[index - 1];
        const currentNormalVector = normalVectors[index];
        const sumNormal = calculateSumNormal(prevNormalVector, currentNormalVector);
        const shiftVectorLength = calculateShiftVectorLength(prevNormalVector, currentNormalVector, delta);
        return [
            coord[0] + shiftVectorLength * sumNormal[0] * orientation,
            coord[1] + shiftVectorLength * sumNormal[1] * orientation
        ];
    });
}

/**
 * Calculates the vertex coordinates of offset polygon
 * @param {Number[]} coords raw array of coordinates
 * @param {Number} delta offset value in pixels
 * @returns {Array(Number[])} vertex coordinates array
 */
export function calculateOuterPolygonCoords(coords, delta) {
    return calculateInnerPolygonCoords(coords, -delta);
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
 * Offsets small shape coordinates to fit minSize
 * @param {Number[]} coords raw array of coordinates
 * @param {Number} minSize minimum dimension of shape
 * @returns {Number[]} raw coordinates array
 */
export function offsetToFit(coords, minSize) {
    const precision = 0.5;
    let offset = calculateFitOffset(coords, minSize, precision);
    let offsetCoords = coords;
    let iterations = 30; // iteration limit to avoid infinite loop due to whatever
    if (offset > 0) {
        while (offset !== 0 && --iterations > 0) {
            offsetCoords = getCoordsArray(calculateOuterPolygonCoords(offsetCoords, offset));
            offset = calculateFitOffset(offsetCoords, minSize, precision);
        }
    }
    return offsetCoords;
}

/**
 * Returns array of vertex coordinates
 * @param {Number[]} coords raw array of coordinates
 * @returns {Array(Number[])} vertex coordinates array
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
 * calculates distance of the bounding box to minSize box
 * @param {Number[]} coords raw array of coordinates
 * @param {Number} minSize minimum dimension of shape
 * @param {Number} precision precision of minSize and bounding box size difference
 * @returns {Number[]} raw coordinates array
 */
function calculateFitOffset(coords, minSize, precision) {
    const xCoords = coords.filter((coord, i) => i % 2 === 0);
    const yCoords = coords.filter((coord, i) => i % 2 === 1);
    const boundingWidth = Math.max.apply(null, xCoords) - Math.min.apply(null, xCoords);
    const boundingHeight = Math.max.apply(null, yCoords) - Math.min.apply(null, yCoords);

    const minDimension = Math.min(boundingHeight, boundingWidth);
    if (minDimension >= minSize - precision && minDimension <= minSize + precision) {
        return 0;
    } else {
        return (minSize - minDimension) / 2;
    }
}

/**
 * Returns array of raw coordinates from array of vertex coordinates
 * @param {Array(Number[])} vertexCoords vertex coordinates array
 * @returns {Number[]} raw coordinates array
 */
function getCoordsArray(vertexCoords) {
    return vertexCoords.reduce((acc, currentCoords) => [...acc, ...currentCoords], []);
}

/**
 * Calculates normalizes vector sum
 * @param {Number[]} vector1 vector coordinates
 * @param {Number[]} vector2 vector coordinates
 * @returns {Number[]} vector coordinates
 */
function calculateSumNormal(vector1, vector2) {
    const sum = vectorSum(vector1, vector2);
    const length = vectorLength(sum);
    return [sum[0] / length, sum[1] / length];
}

/**
 * Calculates the move vector for the given offset
 * @param {Number[]} vector1 vector coordinates
 * @param {Number[]} vector2 vector coordinates
 * @param {Number} d offset distance
 * @returns {Number[]} vector coordinates
 */
function calculateShiftVectorLength(vector1, vector2, d) {
    return (d * vectorLength(vectorSum(vector1, vector2))) / dotProduct(vector1, vectorSum(vector1, vector2));
}

/**
 * Calculates vector sum of twor vectors
 * @param {Number[]} vector1 vector coordinates
 * @param {Number[]} vector2 vector coordinates
 * @returns {Number[]} vector sum
 */
function vectorSum(vector1, vector2) {
    return [vector1[0] + vector2[0], vector1[1] + vector2[1]];
}

/** Calculates vector length of a given vector
 * @param {Number[]} vector vector coordinates
 * @returns {Number} vector length
 */
function vectorLength(vector) {
    return Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2));
}

/**
 * Calculates dotproduct of two vectors
 * @param {Number[]} vector1 vector coordinates
 * @param {Number[]} vector2 vector coordinates
 * @returns {Number} dotproduct
 */
function dotProduct(vector1, vector2) {
    return vector1[0] * vector2[0] + vector1[1] * vector2[1];
}
