// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import {
    getVertexCoords,
    calculateInnerPolygonCoords,
    calculateOuterPolygonCoords,
    offsetToFit,
    fixCoordinates
} from '../polygon.js';

describe('polygon util functions', () => {
    it('fixes coordinates if start coord and end coord is the same', () => {
        expect(fixCoordinates([1, 1, 2, 2, 3, 3, 1, 1])).toEqual([1, 1, 2, 2, 3, 3]);
    });

    it('fixes coordinates by removing repeating ones', () => {
        expect(fixCoordinates([1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6])).toEqual([
            1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6
        ]);
    });

    it('gets vertex coordinates for given coordinates array', () => {
        expect(getVertexCoords([1, 2, 3, 4, 5, 6, 7, 8, 9, 0])).toEqual([
            [1, 2],
            [3, 4],
            [5, 6],
            [7, 8],
            [9, 0]
        ]);
    });

    it('calculates inner coordinates with given offset for counter-clockwise oriented polygon', () => {
        expect(
            calculateInnerPolygonCoords([10, 10, 40, 50, 10, 50], 5).map(coords => [
                Math.round(coords[0]),
                Math.round(coords[1])
            ])
        ).toEqual([
            [15, 25],
            [30, 45],
            [15, 45]
        ]);
    });

    it('calculates inner coordinates with given offset for clockwise oriented polygon', () => {
        expect(
            calculateInnerPolygonCoords([10, 10, 10, 50, 40, 50], 5).map(coords => [
                Math.round(coords[0]),
                Math.round(coords[1])
            ])
        ).toEqual([
            [15, 25],
            [15, 45],
            [30, 45]
        ]);
    });

    it('calculates outer polygon coordinates with given offset', () => {
        expect(
            calculateOuterPolygonCoords([10, 10, 40, 50, 10, 50], 5).map(coords => [
                Math.round(coords[0]),
                Math.round(coords[1])
            ])
        ).toEqual([
            [5, -5],
            [50, 55],
            [5, 55]
        ]);
    });

    it('offsets polygon to fit the size', () => {
        expect(offsetToFit([10, 10, 40, 50, 10, 50], 45).map(Math.round)).toEqual([5, -5, 50, 55, 5, 55]);
    });
});
