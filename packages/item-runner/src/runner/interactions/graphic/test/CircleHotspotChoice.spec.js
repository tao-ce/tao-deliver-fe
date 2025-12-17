// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import CircleHotspotChoice from '../CircleHotspotChoice.svelte';
import { remToPx } from '@oat-sa-private/ui-core';

const minSize = remToPx(5);

//mock getBBox for <text> rendering
const originalGetBBox = SVGElement.prototype.getBBox;
beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });
});
afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

describe('Circle hotspot choice', () => {
    describe('rendering', () => {
        it('renders with no props', () => {
            const { container } = render(CircleHotspotChoice, { props: {} });
            expect(container.getElementsByClassName('shape')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('renders circle elements with given coords', () => {
            const { container } = render(CircleHotspotChoice, { props: { coords: [100, 50, 50] } });
            expect(container.querySelectorAll('circle')).toBeTruthy();
            //renders outer circle, inner, one for checkmark and one for focus outline
            expect(container.querySelectorAll('circle').length).toEqual(4);
            expect(container).toMatchSnapshot();
        });

        it('sets correct class to group if selected', () => {
            const { container } = render(CircleHotspotChoice, { props: { coords: [100, 50, 50], selected: true } });
            expect(container.querySelector('g').classList).toContain('selected');
        });

        it('renders text label as a checkmark if label is set ', () => {
            const { container } = render(CircleHotspotChoice, {
                props: { coords: [100, 50, 50], selected: true, label: '1' }
            });
            expect(container.querySelector('text')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('sets invisible class to group invisible is set', () => {
            const { container } = render(CircleHotspotChoice, { props: { coords: [100, 50, 50], invisible: true } });
            expect(container.querySelector('g').classList).toContain('invisible');
        });

        it('scales small circle to fit min size of 5 rem', () => {
            const { container } = render(CircleHotspotChoice, { props: { coords: [50, 50, 30] } });
            expect(parseFloat(container.querySelector('.shape-outer-border').getAttribute('r'))).toEqual(
                minSize / 2 - remToPx(0.375)
            );
        });
    });

    describe('events', () => {
        it('changes the inner border size on mouseenter and mouseleave', () => {
            const { container } = render(CircleHotspotChoice, { props: { coords: [100, 50, 50] } });
            const initialInnerBorderRadius = parseFloat(
                container.querySelector('.shape-inner-border').getAttribute('r')
            );

            const groupEl = container.querySelector('g');
            fireEvent.mouseEnter(groupEl);
            return tick()
                .then(() => {
                    const currentInnerBorderRadius = parseFloat(
                        container.querySelector('.shape-inner-border').getAttribute('r')
                    );

                    expect(currentInnerBorderRadius).toBeGreaterThan(initialInnerBorderRadius);
                    return tick;
                })
                .then(() => {
                    fireEvent.mouseLeave(groupEl);
                    const currentInnerBorderRadius = parseFloat(
                        container.querySelector('.shape-inner-border').getAttribute('r')
                    );
                    expect(currentInnerBorderRadius).toEqual(initialInnerBorderRadius);
                });
        });

        it('forwards click event', () => {
            const { container, component } = render(CircleHotspotChoice, { props: { coords: [100, 50, 50] } });
            const fn = vi.fn();
            component.$on('click', fn);
            const groupEl = container.querySelector('g');
            fireEvent.click(groupEl);
            expect(fn).toHaveBeenCalled();
        });

        it('forwards keyup event', () => {
            const { container, component } = render(CircleHotspotChoice, { props: { coords: [100, 50, 50] } });
            const fn = vi.fn();
            component.$on('keyup', fn);
            const groupEl = container.querySelector('g');
            fireEvent.keyUp(groupEl);
            expect(fn).toHaveBeenCalled();
        });
        it('forwards "center" event', () => {
            const { component } = render(CircleHotspotChoice, { props: { coords: [100, 50, 50] } });
            const fn = vi.fn();
            component.$on('center', fn);

            component.$set({ coords: [200, 100, 50] });
            return tick().then(() => {
                expect(fn).toHaveBeenCalled();
                expect(fn.mock.calls[0][0].detail).toEqual({ cx: 200, cy: 100 });
            });
        });
    });
});
