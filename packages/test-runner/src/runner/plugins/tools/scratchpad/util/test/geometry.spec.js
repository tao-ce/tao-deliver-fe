// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getShapePositionDelta, move, getShapeBBoxDelta } from '../geometry.js';

describe('geometry util', () => {
    describe('getShapePositionDelta', () => {
        test.each([
            [void 0, 0, 0, 0, 0],
            [null, 0, 0, 0, 0],
            [{}, 0, 0, 0, 0],
            [{ x: 0, y: 0 }, NaN, NaN, 0, 0],
            [{ x: 10, y: 10 }, 15, 15, 5, 5],
            [{ x: 50, y: 100 }, 0, 130, -50, 30],
            [{ cx: 25, cy: 10 }, 50, 50, 25, 40],
            [{ cx: 250, cy: 0 }, 50, 50, -200, 50],
            [{ x1: 25, y: 10 }, 50, 50, 0, 0],
            [{ x1: -10, y1: -10 }, 20, 20, 30, 30]
        ])('returns the correct delta', (geometry, x, y, expectedX, expectedY) => {
            const { x: deltaX, y: deltaY } = getShapePositionDelta(geometry, x, y);
            expect(deltaX).toEqual(expectedX);
            expect(deltaY).toEqual(expectedY);
        });
    });

    describe('getShapeBBoxDelta', () => {
        test.each([
            [void 0, 0, 0, 0, 0],
            [null, 0, 0, 0, 0],
            [{}, 0, 0, 0, 0],
            [{ x: 0, y: 0 }, NaN, NaN, 0, 0],
            [{ x: 10, y: 10 }, 15, 15, 5, 5],
            [{ x: 50, y: 100 }, 0, 130, -50, 30],
            [{ cx: 25, cy: 10 }, 50, 50, 0, 0],
            [{ cx: 25, cy: 10, rx: 0, ry: 0 }, 50, 50, 25, 40],
            [{ cx: 250, cy: 0, rx: 25, ry: 10 }, 50, 50, -175, 60],
            [{ x1: 25, y: 10 }, 50, 50, 0, 0],
            [{ x1: -10, y1: -10, x2: -20, y2: -20 }, 20, 20, 37, 37]
        ])('returns the correct delta', (geometry, x, y, expectedX, expectedY) => {
            const { x: deltaX, y: deltaY } = getShapeBBoxDelta(geometry, x, y);
            expect(deltaX).toEqual(expectedX);
            expect(deltaY).toEqual(expectedY);
        });
    });

    describe('move shape', () => {
        it('throws if the shape type is unknown', () => {
            expect(() => move()).toThrow(TypeError);
            expect(() => move(null)).toThrow(TypeError);
            expect(() => move('foo')).toThrow(TypeError);
        });

        test.each([
            ['rectangle', { x: 10, y: 10 }, 15, 15, { x: 15, y: 15 }],
            ['oval', { cx: 50, cy: 50, rx: 20, ry: 10 }, 100, 100, { cx: 100, cy: 100, rx: 20, ry: 10 }],
            ['ellipse', { cx: 10, cy: 10, rx: 10, ry: 10 }, 15, 15, { cx: 15, cy: 15, rx: 10, ry: 10 }],
            ['line', { x1: 10, y1: 10, x2: 50, y2: 50 }, 15, 15, { x1: 15, y1: 15, x2: 55, y2: 55 }],
            [
                'path',
                {
                    x: 5,
                    y: 5,
                    points: [
                        [5, 5],
                        [10, 10],
                        [15, 5]
                    ]
                },
                15,
                15,
                {
                    x: 15,
                    y: 15,
                    points: [
                        [15, 15],
                        [20, 20],
                        [25, 15]
                    ]
                }
            ],
            [
                'brush',
                {
                    x: 50,
                    y: 50,
                    points: [
                        [100, 50],
                        [50, 100],
                        [150, 150]
                    ]
                },
                10,
                10,
                {
                    x: 10,
                    y: 10,
                    points: [
                        [60, 10],
                        [10, 60],
                        [110, 110]
                    ]
                }
            ],
            ['text', { x: 50, y: 75 }, 15, 15, { x: 15, y: 15 }]
        ])('move a %s shape', (type, geometry, x, y, expected) => {
            expect(move(type, geometry, x, y)).toEqual(expected);
        });

        test.each([
            [{ x: 15, y: 15 }, { x: 10, y: 10, width: 50, height: 50 }, 5, 5, { x: 10, y: 10 }],
            [
                { x: 10, y: 10, width: 10, height: 10 },
                { x: 0, y: 0, width: 50, height: 50 },
                100,
                100,
                { x: 40, y: 40, width: 10, height: 10 }
            ],
            [
                { x: 10, y: 10, width: 10, height: 10 },
                { x: 0, y: 0, width: 50, height: 50 },
                5,
                -100,
                { x: 5, y: 0, width: 10, height: 10 }
            ]
        ])('move a rectangle within constraints', (geometry, canvasViewBox, x, y, expected) => {
            expect(move('rectangle', geometry, x, y, canvasViewBox)).toEqual(expected);
        });

        test.each([
            [
                { cx: 15, cy: 15, rx: 10, ry: 20 },
                { x: 10, y: 10, width: 50, height: 50 },
                5,
                5,
                { cx: 20, cy: 30, rx: 10, ry: 20 }
            ],
            [
                { cx: 10, cy: 10, rx: 5, ry: 10 },
                { x: 0, y: 0, width: 50, height: 50 },
                100,
                100,
                { cx: 45, cy: 40, rx: 5, ry: 10 }
            ],
            [
                { cx: 10, cy: 10, rx: 10, ry: 10 },
                { x: 0, y: 0, width: 50, height: 50 },
                5,
                -100,
                { cx: 10, cy: 10, rx: 10, ry: 10 }
            ]
        ])('move an ellipse within constraints', (geometry, canvasViewBox, x, y, expected) => {
            expect(move('ellipse', geometry, x, y, canvasViewBox)).toEqual(expected);
        });

        test.each([
            [
                { x1: 10, y1: 10, x2: 20, y2: 20 },
                { x: 0, y: 0, width: 50, height: 50 },
                50,
                50,
                { x1: 10, y1: 10, x2: 20, y2: 20 }
            ],
            [
                { x1: 10, y1: 10, x2: 20, y2: 20 },
                { x: 0, y: 0, width: 100, height: 100 },
                50,
                50,
                { x1: 50, y1: 50, x2: 60, y2: 60 }
            ],
            [
                { x1: 10, y1: 10, x2: 20, y2: 20 },
                { x: 0, y: 0, width: 50, height: 50 },
                -100,
                50,
                { x1: 10, y1: 10, x2: 20, y2: 20 }
            ]
        ])('move a line within constraints', (geometry, canvasViewBox, x, y, expected) => {
            expect(move('line', geometry, x, y, canvasViewBox)).toEqual(expected);
        });

        test.each([
            [
                {
                    x: 10,
                    y: 10,
                    points: [
                        [10, 10],
                        [15, 15]
                    ],
                    width: 5,
                    height: 5
                },
                { x: 0, y: 0, width: 50, height: 50 },
                50,
                50,
                {
                    x: 10,
                    y: 10,
                    points: [
                        [10, 10],
                        [15, 15]
                    ],
                    width: 5,
                    height: 5
                }
            ],
            [
                {
                    x: 10,
                    y: 10,
                    points: [
                        [10, 10],
                        [15, 15]
                    ],
                    width: 5,
                    height: 5
                },
                { x: 0, y: 0, width: 50, height: 50 },
                25,
                25,
                {
                    x: 25,
                    y: 25,
                    points: [
                        [25, 25],
                        [30, 30]
                    ],
                    width: 5,
                    height: 5
                }
            ]
        ])('move a path within constraints', (geometry, canvasViewBox, x, y, expected) => {
            expect(move('path', geometry, x, y, canvasViewBox)).toEqual(expected);
        });
    });
});
