// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { remToPx } from '@oat-sa-private/ui-core';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import PolyHotspotChoice from '../PolyHotspotChoice.svelte';

/**
 * Gets width of polygon bounding box
 * @param {String} points string accepted by polygon points attr
 * @returns {Number}
 */
function getWidth(points) {
    return (
        Math.max.apply(
            null,
            points.split(' ').map(point => parseFloat(point.split(',')[0]))
        ) -
        Math.min.apply(
            null,
            points.split(' ').map(point => parseFloat(point.split(',')[0]))
        )
    );
}

/**
 * Gets height of polygon bounding box
 * @param {String} points string accepted by polygon points attr
 * @returns {Number}
 */
function getHeight(points) {
    return (
        Math.max.apply(
            null,
            points.split(' ').map(point => parseFloat(point.split(',')[1]))
        ) -
        Math.min.apply(
            null,
            points.split(' ').map(point => parseFloat(point.split(',')[1]))
        )
    );
}

const minSize = remToPx(5);

//mock getBBox for <text> rendering
const originalGetBBox = SVGElement.prototype.getBBox;
beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });
});
afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

describe('poly hotspot choice', () => {
    describe('rendering', () => {
        it('renders with no props', () => {
            const { container } = render(PolyHotspotChoice, { props: {} });
            expect(container.getElementsByClassName('shape')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('renders poly elements with given coords', () => {
            const { container } = render(PolyHotspotChoice, {
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150] }
            });
            expect(container.querySelectorAll('polygon')).toBeTruthy();
            //renders outer poly, inner and one for focus outline
            expect(container.querySelectorAll('polygon').length).toEqual(3);
            expect(container).toMatchSnapshot();
        });

        it('sets correct class to group if selected', () => {
            const { container } = render(PolyHotspotChoice, {
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150], selected: true }
            });
            expect(container.querySelector('g').classList).toContain('selected');
        });

        it('renders text label as a checkmark if label is set ', () => {
            const { container } = render(PolyHotspotChoice, {
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150], selected: true, label: '1' }
            });
            expect(container.querySelector('text')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('scales small polygon to fit min size of 5 rem', () => {
            const width = 20;
            const expectedWidth = minSize - remToPx(0.75);
            const { container } = render(PolyHotspotChoice, {
                props: {
                    coords: [10, 10, 10 + width, 30, 10 + width, 60, 10, 30]
                }
            });

            expect(parseFloat(getWidth(container.querySelector('.shape-outer-border').getAttribute('points')))).toEqual(
                expectedWidth
            );
        });
    });

    describe('events', () => {
        it('changes the inner border size on mouseenter and mouseleave', () => {
            const { container } = render(PolyHotspotChoice, {
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150] }
            });
            const initialInnerBorderWidth = getWidth(
                container.querySelector('.shape-inner-border').getAttribute('points')
            );

            const initialInnerBorderHeight = getHeight(
                container.querySelector('.shape-inner-border').getAttribute('points')
            );

            const groupEl = container.querySelector('g');
            fireEvent.mouseEnter(groupEl);
            return tick()
                .then(() => {
                    const currentInnerBorderWidth = getWidth(
                        container.querySelector('.shape-inner-border').getAttribute('points')
                    );
                    const currentInnerBorderHeight = getHeight(
                        container.querySelector('.shape-inner-border').getAttribute('points')
                    );

                    expect(currentInnerBorderWidth).toBeGreaterThan(initialInnerBorderWidth);
                    expect(currentInnerBorderHeight).toBeGreaterThan(initialInnerBorderHeight);
                    return tick;
                })
                .then(() => {
                    fireEvent.mouseLeave(groupEl);
                    const currentInnerBorderWidth = getWidth(
                        container.querySelector('.shape-inner-border').getAttribute('points')
                    );
                    const currentInnerBorderHeight = getHeight(
                        container.querySelector('.shape-inner-border').getAttribute('points')
                    );
                    expect(currentInnerBorderWidth).toEqual(initialInnerBorderWidth);
                    expect(currentInnerBorderHeight).toEqual(initialInnerBorderHeight);
                });
        });

        it('forwards click event', () => {
            const { container, component } = render(PolyHotspotChoice, {
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150] }
            });
            const fn = vi.fn();
            component.$on('click', fn);
            const groupEl = container.querySelector('g');
            fireEvent.click(groupEl);
            expect(fn).toHaveBeenCalled();
        });

        it('forwards keyup event', () => {
            const { container, component } = render(PolyHotspotChoice, {
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150] }
            });
            const fn = vi.fn();
            component.$on('keyup', fn);
            const groupEl = container.querySelector('g');
            fireEvent.keyUp(groupEl);
            expect(fn).toHaveBeenCalled();
        });
        it('forwards "center" event', () => {
            const { component } = render(PolyHotspotChoice, {
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150] }
            });
            const fn = vi.fn();
            component.$on('center', fn);

            component.$set({ coords: [50, 50, 400, 600, 100, 800, 0, 150] });
            return tick().then(() => {
                expect(fn).toHaveBeenCalled();
                expect(fn.mock.calls[0][0].detail).toEqual({ cx: 205.90053680389647, cy: 558.8091169907595 });
            });
        });
    });
});
