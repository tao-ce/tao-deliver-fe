// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import EllipseHotspotChoice from '../EllipseHotspotChoice.svelte';
import { remToPx } from '@oat-sa-private/ui-core';

const minSize = remToPx(5);

//mock getBBox for <text> rendering
const originalGetBBox = SVGElement.prototype.getBBox;
beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });
});
afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

describe('ellipse hotspot choice', () => {
    describe('rendering', () => {
        it('renders with no props', () => {
            const { container } = render(EllipseHotspotChoice, { props: {} });
            expect(container.getElementsByClassName('shape')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('renders ellipse elements with given coords', () => {
            const { container } = render(EllipseHotspotChoice, { props: { coords: [100, 100, 50, 60] } });
            expect(container.querySelectorAll('ellipse')).toBeTruthy();
            //renders outer ellipse, inner and one for focus outline
            expect(container.querySelectorAll('ellipse').length).toEqual(3);
            expect(container).toMatchSnapshot();
        });

        it('sets correct class to group if selected', () => {
            const { container } = render(EllipseHotspotChoice, {
                props: { coords: [100, 100, 50, 60], selected: true }
            });
            expect(container.querySelector('g').classList).toContain('selected');
        });

        it('renders text label as a checkmark if label is set', () => {
            const { container } = render(EllipseHotspotChoice, {
                props: { coords: [100, 100, 50, 60], selected: true, label: '1' }
            });
            expect(container.querySelector('text')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('sets invisible class to group invisible is set', () => {
            const { container } = render(EllipseHotspotChoice, {
                props: { coords: [100, 100, 50, 60], invisible: true }
            });
            expect(container.querySelector('g').classList).toContain('invisible');
        });

        it('scales small ellipse to fit min size of 5 rem', () => {
            const smallRadiusX = 30; //smaller radius than needed 5rem size
            const greatRadiusY = 50; //vertical doesn't need scaling

            const expectedScalingSizeRX = minSize / 2 - remToPx(0.25);
            const expectedScaledSizeRY = greatRadiusY - remToPx(0.25);
            const { container } = render(EllipseHotspotChoice, {
                props: { coords: [50, 50, smallRadiusX, greatRadiusY] }
            });

            expect(parseFloat(container.querySelector('.shape-outer-border').getAttribute('rx'))).toEqual(
                expectedScalingSizeRX
            );

            expect(parseFloat(container.querySelector('.shape-outer-border').getAttribute('ry'))).toEqual(
                expectedScaledSizeRY
            );
        });
    });

    describe('events', () => {
        it('forwards click event', () => {
            const { container, component } = render(EllipseHotspotChoice, { props: { coords: [100, 100, 50, 60] } });
            const fn = vi.fn();
            component.$on('click', fn);
            const groupEl = container.querySelector('g');
            fireEvent.click(groupEl);
            expect(fn).toHaveBeenCalled();
        });

        it('forwards keyup event', () => {
            const { container, component } = render(EllipseHotspotChoice, { props: { coords: [100, 100, 50, 60] } });
            const fn = vi.fn();
            component.$on('keyup', fn);
            const groupEl = container.querySelector('g');
            fireEvent.keyUp(groupEl);
            expect(fn).toHaveBeenCalled();
        });
        it('forwards "center" event', () => {
            const { component } = render(EllipseHotspotChoice, { props: { coords: [100, 50, 50, 60] } });
            const fn = vi.fn();
            component.$on('center', fn);

            component.$set({ coords: [200, 100, 50, 60] });
            return tick().then(() => {
                expect(fn).toHaveBeenCalled();
                expect(fn.mock.calls[0][0].detail).toEqual({ cx: 200, cy: 100 });
            });
        });
    });
});
