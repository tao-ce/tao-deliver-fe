// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getVertexCoords, fixCoordinates, getIsThin, getInvertedClipPathCoords } from '../polygon.js';
import { SVG } from '@svgdotjs/svg.js';

function createSvgEl() {
    const rootSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    rootSvgEl.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink');
    document.body.append(rootSvgEl);
    return rootSvgEl;
}

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

    describe('getIsThin', () => {
        let svgGroup;
        const originalElementFromPoint = document.elementFromPoint;
        const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

        const createDomFixture = () => {
            document.body.innerHTML = '';

            const rootSvgEl = createSvgEl();
            rootSvgEl.innerHTML = '<g><polygon points="0,0,10,0,10,40,0,40"></polygon></g>';

            svgGroup = SVG(document.querySelector('g'));
            svgGroup.cx = 5;
            svgGroup.cy = 20;
        };

        beforeEach(() => {
            createDomFixture();
            document.elementFromPoint = vi.fn().mockImplementation((x, y) => {
                //for `<polygon points="0,0,10,0,10,40,0,40">`
                const outside = x < 0 || x > 10 || y < 0 || y > 40;
                if (outside) {
                    return document.querySelector('svg');
                }
                return document.querySelector('g polygon') || document.querySelector('g');
            });
            Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function () {
                const attrs = [this.getAttribute('cx'), this.getAttribute('cy'), this.getAttribute('r')].map(str =>
                    parseInt(str)
                );
                return {
                    top: attrs[1] - attrs[2],
                    left: attrs[0] - attrs[2],
                    bottom: attrs[1] + attrs[2],
                    right: attrs[0] + attrs[2]
                };
            });
        });

        afterAll(() => {
            document.body.innerHTML = '';
            document.elementFromPoint = originalElementFromPoint;
            Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
        });

        it('returns true if center of the element cannot contain minSize', () => {
            const initialHtml = document.body.innerHTML;
            expect(getIsThin(svgGroup, svgGroup.cx, svgGroup.cy, 20)).toBe(true);

            expect(document.body.innerHTML).toEqual(initialHtml); // everything was cleaned up
        });

        it('returns false if center of the element can contain minSize (point on the child)', () => {
            const initialHtml = document.body.innerHTML;
            expect(getIsThin(svgGroup, svgGroup.cx, svgGroup.cy, 8)).toBe(false);

            expect(document.body.innerHTML).toEqual(initialHtml);
        });

        it('returns false if center of the element can contain minSize (point on the parent)', () => {
            svgGroup.clear();
            expect(document.querySelector('g polygon')).toBeFalsy();

            const initialHtml = document.body.innerHTML;
            expect(getIsThin(svgGroup, svgGroup.cx, svgGroup.cy, 8)).toBe(false);

            expect(document.body.innerHTML).toEqual(initialHtml);
        });
    });

    describe('getInvertedClipPathCoords', () => {
        let svgGroup;
        const originalGetBBox = Element.prototype.getBBox;

        const createDomFixture = () => {
            document.body.innerHTML = '';

            const rootSvgEl = createSvgEl();
            rootSvgEl.innerHTML = '<g></g>';

            svgGroup = SVG(document.querySelector('g'));
        };

        beforeEach(() => {
            createDomFixture();
            Element.prototype.getBBox = vi.fn();
        });

        afterAll(() => {
            document.body.innerHTML = '';
            Element.prototype.getBBox = originalGetBBox;
        });

        it('clockwise polygon: returns coords of its cut-out shape', () => {
            Element.prototype.getBBox.mockReturnValue({ x: 0, y: 0, width: 10, height: 10 });

            //simple rect shape; closest to bbox left-top is the first point
            let result = getInvertedClipPathCoords(
                [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                    [0, 10]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();

            //repeat first-last point
            result = getInvertedClipPathCoords(
                [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                    [0, 10],
                    [0, 0]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();

            //closest to bbox left-top is the last point
            result = getInvertedClipPathCoords(
                [
                    [0, 10],
                    [0, 0],
                    [10, 0],
                    [10, 10]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();

            //closest to bbox left-top is the middle point
            result = getInvertedClipPathCoords(
                [
                    [10, 10],
                    [0, 10],
                    [0, 0],
                    [10, 0]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();

            //complex shape (star)
            Element.prototype.getBBox.mockReturnValue({ x: 252, y: 391, width: 543 - 252, height: 625 - 391 });
            result = getInvertedClipPathCoords(
                [
                    [404, 479],
                    [438, 391],
                    [435, 489],
                    [543, 532],
                    [433, 526],
                    [464, 625],
                    [401, 532],
                    [252, 610],
                    [359, 506],
                    [261, 432]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();
        });

        it('counter-clockwise polygon: returns coords of its cut-out shape', () => {
            Element.prototype.getBBox.mockReturnValue({ x: 0, y: 0, width: 10, height: 10 });

            //simple rect shape; closest to bbox left-top is the first point
            let result = getInvertedClipPathCoords(
                [
                    [0, 0],
                    [0, 10],
                    [10, 10],
                    [10, 0]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();

            //repeat first-last point
            result = getInvertedClipPathCoords(
                [
                    [0, 0],
                    [0, 10],
                    [10, 10],
                    [10, 0],
                    [0, 0]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();

            //closest to bbox left-top is the last point
            result = getInvertedClipPathCoords(
                [
                    [0, 10],
                    [10, 10],
                    [10, 0],
                    [0, 0]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();

            //closest to bbox left-top is the middle point
            result = getInvertedClipPathCoords(
                [
                    [10, 10],
                    [10, 0],
                    [0, 0],
                    [0, 10]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();

            //complex shape (corner)
            Element.prototype.getBBox.mockReturnValue({ x: 204, y: 626, width: 486 - 204, height: 752 - 626 });
            result = getInvertedClipPathCoords(
                [
                    [420, 679],
                    [204, 748],
                    [242, 752],
                    [486, 689],
                    [383, 626],
                    [284, 628]
                ],
                svgGroup
            );
            expect(JSON.stringify(result)).toMatchSnapshot();
        });
    });
});
