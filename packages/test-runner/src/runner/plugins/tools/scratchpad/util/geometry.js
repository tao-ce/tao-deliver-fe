// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Ensure the given x value is within the viewbox
 * @param {number} viewBoxX - the x coordinate of start of the viewbox start
 * @param {number} viewBoxWidth - the width of the viewbox
 * @param {number} x - the value to check
 * @param {number} [width] - if the value is the left of a shape take the shape width into account
 * @returns {number} x in the viewbox
 */
function inViewBoxXAxis(viewBoxX = 0, viewBoxWidth = Infinity, x = 0, width = 0) {
    return Math.min(viewBoxWidth - width, Math.max(viewBoxX, x));
}

/**
 * Ensure the given y value is within the viewbox
 * @param {number} viewBoxY - the y coordinate of start of the viewbox start
 * @param {number} viewBoxHeight - the height of the viewbox
 * @param {number} y - the value to check
 * @param {number} [height] - if the value is the top of a shape take the shape height into account
 * @returns {number} y in the viewbox
 */
function inViewBoxYAxis(viewBoxY = 0, viewBoxHeight = Infinity, y = 0, height = 0) {
    return Math.min(viewBoxHeight - height, Math.max(viewBoxY, y));
}

/**
 * Move a rectangle to the new position
 * @param {Object} geometry - the rectangle geometry x/y/width/height
 * @param {number} x
 * @param {number} y
 * @param {Object} canvasViewBox - the canvas view box constraints x/y/width/height
 * @returns {Object} the geometry object with updated values
 */
function moveRectangle(geometry, x, y, canvasViewBox = {}) {
    geometry.x = inViewBoxXAxis(canvasViewBox.x, canvasViewBox.width, x, geometry.width);
    geometry.y = inViewBoxYAxis(canvasViewBox.y, canvasViewBox.height, y, geometry.height);
    return geometry;
}

/**
 * Move an ellipse to the new position
 * @param {Object} geometry - the ellipse geometry cx/cy/rx/ry
 * @param {number} x
 * @param {number} y
 * @param {Object} canvasViewBox - the canvas view box constraints x/y/width/height
 * @returns {Object} the geometry object with updated values
 */
function moveEllipse(geometry, x, y, canvasViewBox = {}) {
    geometry.cx = inViewBoxXAxis((canvasViewBox.x || 0) + geometry.rx, canvasViewBox.width, x, geometry.rx);
    geometry.cy = inViewBoxYAxis((canvasViewBox.y || 0) + geometry.ry, canvasViewBox.height, y, geometry.ry);
    return geometry;
}

/**
 * Move a line to the new position
 * @param {Object} geometry - the line geometry x1/y1/x2/y2
 * @param {number} x
 * @param {number} y
 * @param {Object} canvasViewBox - the canvas view box constraints x/y/width/height
 * @returns {Object} the geometry object with updated values
 */
function moveLine(geometry, x, y, canvasViewBox = {}) {
    let { x: deltaX, y: deltaY } = calculateDelta(geometry.x1, geometry.y1, x, y);
    const newX1 = inViewBoxXAxis(canvasViewBox.x, canvasViewBox.width, x);
    const newY1 = inViewBoxYAxis(canvasViewBox.y, canvasViewBox.height, y);
    const newX2 = inViewBoxXAxis(canvasViewBox.x, canvasViewBox.width, geometry.x2 + deltaX);
    const newY2 = inViewBoxYAxis(canvasViewBox.y, canvasViewBox.height, geometry.y2 + deltaY);

    if (newX1 === x && newY1 === y && newX2 === geometry.x2 + deltaX && newY2 === geometry.y2 + deltaY) {
        geometry.x1 = newX1;
        geometry.y1 = newY1;
        geometry.x2 = newX2;
        geometry.y2 = newY2;
    }
    return geometry;
}

/**
 * Move a path to the new position
 * @param {Object} geometry - the path geometry x/y/points
 * @param {number} x
 * @param {number} y
 * @param {Object} canvasViewBox - the canvas view box constraints x/y/width/height
 * @returns {Object} the geometry object with updated values
 */
function movePath(geometry, x, y, canvasViewBox = {}) {
    const newX = inViewBoxXAxis(canvasViewBox.x, canvasViewBox.width, x, geometry.width);
    const newY = inViewBoxYAxis(canvasViewBox.y, canvasViewBox.height, y, geometry.height);
    if (x === newX && y === newY) {
        const { x: deltaX, y: deltaY } = calculateDelta(geometry.x, geometry.y, x, y);
        geometry.x = newX;
        geometry.y = newY;
        for (let point of geometry.points) {
            point[0] += deltaX;
            point[1] += deltaY;
        }
    }
    return geometry;
}

/**
 * Move a shape to the new position
 * @param {string} type - the shape type
 * @param {Object} geometry - the shape geometry
 * @param {number} x
 * @param {number} y
 * @param {Object} canvasViewBox - the canvas view box constraints x/y/width/height
 * @returns {Object} the geometry object with updated values
 * @throws {TypeError} if the type is unknown
 */
export function move(type, geometry, x, y, canvasViewBox = {}) {
    const moveByType = {
        rectangle: moveRectangle,
        oval: moveEllipse,
        ellipse: moveEllipse,
        line: moveLine,
        path: movePath,
        brush: movePath,
        text: moveRectangle
    };
    if (typeof moveByType[type] === 'function') {
        return moveByType[type](geometry, x, y, canvasViewBox);
    }
    throw new TypeError(`Unknown type ${type}`);
}

/**
 * Calculate a delta between two position
 * @param {number} initialX
 * @param {number} initialY
 * @param {number} newX
 * @param {number} newY
 * @returns {{x: number, y:number}} the delta
 */
function calculateDelta(initialX, initialY, newX, newY) {
    return {
        x: newX - initialX,
        y: newY - initialY
    };
}

/**
 * Get the position delta between some coordinates and a shape top/left corner
 * @param {Object} geometry - shape geometry, depends on the shape
 * @param {number} x - x coordinate of the position to compare with
 * @param {number} y - y coordinate of the position to compare with
 * @returns {{x: number, y:number}} the delta
 */
export function getShapePositionDelta(geometry, x, y) {
    if (geometry) {
        if (typeof geometry.cx === 'number' && typeof geometry.cy === 'number') {
            return calculateDelta(geometry.cx, geometry.cy, x || 0, y || 0);
        }
        if (typeof geometry.x1 === 'number' && typeof geometry.y1 === 'number') {
            return calculateDelta(geometry.x1, geometry.y1, x || 0, y || 0);
        }
        if (typeof geometry.x === 'number' && typeof geometry.y === 'number') {
            return calculateDelta(geometry.x, geometry.y, x || 0, y || 0);
        }
    }
    return { x: 0, y: 0 };
}

/**
 * Get the delta between a shape's geometry bbox (x/y) and some coords (x/y)
 * TODO eventually support width/height
 * @param {Object} geometry - shape geometry, depends on the shape
 * @param {number} x - x coordinate of the position to compare with
 * @param {number} y - y coordinate of the position to compare with
 * @returns {{x: number, y:number}} the delta
 */
export function getShapeBBoxDelta(geometry, x, y) {
    if (geometry) {
        if (
            typeof geometry.cx === 'number' &&
            typeof geometry.cy === 'number' &&
            typeof geometry.rx === 'number' &&
            typeof geometry.ry === 'number'
        ) {
            return calculateDelta(geometry.cx - geometry.rx, geometry.cy - geometry.ry, x || 0, y || 0);
        }
        if (
            typeof geometry.x1 === 'number' &&
            typeof geometry.y1 === 'number' &&
            typeof geometry.x2 === 'number' &&
            typeof geometry.y2 === 'number'
        ) {
            //we add 3 because the line shape has resize handler is outside of it's bbox...
            return calculateDelta(
                Math.min(geometry.x1, geometry.x2) + 3,
                Math.min(geometry.y1, geometry.y2) + 3,
                x || 0,
                y || 0
            );
        }
        if (typeof geometry.x === 'number' && typeof geometry.y === 'number') {
            return calculateDelta(geometry.x, geometry.y, x || 0, y || 0);
        }
    }
    return { x: 0, y: 0 };
}
