// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import RectHotspotChoice from '../RectHotspotChoice.svelte';
import { remToPx } from '@oat-sa-private/ui-core';

const minSize = remToPx(5); // 5rem is the min size of HotspotChoice

//mock getBBox for <text> rendering
const originalGetBBox = SVGElement.prototype.getBBox;
beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });
});
afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

describe('rect hotspot choice', () => {
    describe('rendering', () => {
        it('renders with no props', () => {
            const { container } = render(RectHotspotChoice, { props: {} });
            expect(container.getElementsByClassName('shape')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('renders rect elements with given coords', () => {
            const { container } = render(RectHotspotChoice, { props: { coords: [100, 100, 200, 300] } });
            expect(container.querySelectorAll('rect')).toBeTruthy();
            //renders outer rect, inner and one for focus outline
            expect(container.querySelectorAll('rect').length).toEqual(3);
            expect(container).toMatchSnapshot();
        });

        it('sets correct class to group if selected', () => {
            const { container } = render(RectHotspotChoice, {
                props: { coords: [100, 100, 200, 300], selected: true }
            });
            expect(container.querySelector('g').classList).toContain('selected');
        });

        it('renders text label as a checkmark if label is set ', () => {
            const { container } = render(RectHotspotChoice, {
                props: { coords: [100, 100, 200, 300], selected: true, label: '1' }
            });
            expect(container.querySelector('text')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('sets invisible class to group invisible is set', () => {
            const { container } = render(RectHotspotChoice, {
                props: { coords: [100, 100, 200, 300], invisible: true }
            });
            expect(container.querySelector('g').classList).toContain('invisible');
        });

        it('scales small rect to fit min size of 5 rem', () => {
            const width = 30;
            const height = 100;

            const { container } = render(RectHotspotChoice, { props: { coords: [50, 50, 50 + width, 50 + height] } });

            const expectedWidth = minSize - remToPx(0.75); //0.75 = 2 * 0.375rem for stroke offsets
            const expectedHeight = height - remToPx(0.75); // long side doesn't need scaling

            expect(parseFloat(container.querySelector('.shape-outer-border').getAttribute('width'))).toEqual(
                expectedWidth
            );
            expect(parseFloat(container.querySelector('.shape-outer-border').getAttribute('height'))).toEqual(
                expectedHeight
            );
        });
    });

    describe('events', () => {
        it('changes the inner border size on mouseenter and mouseleave', () => {
            const { container } = render(RectHotspotChoice, { props: { coords: [100, 100, 200, 300] } });
            const initialInnerBorderWidth = parseFloat(
                container.querySelector('.shape-inner-border').getAttribute('width')
            );
            const initialInnerBorderHeight = parseFloat(
                container.querySelector('.shape-inner-border').getAttribute('height')
            );

            const groupEl = container.querySelector('g');
            fireEvent.mouseEnter(groupEl);
            return tick()
                .then(() => {
                    const currentInnerBorderWidth = parseFloat(
                        container.querySelector('.shape-inner-border').getAttribute('width')
                    );
                    const currentInnerBorderHeight = parseFloat(
                        container.querySelector('.shape-inner-border').getAttribute('height')
                    );

                    expect(currentInnerBorderWidth).toBeGreaterThan(initialInnerBorderWidth);
                    expect(currentInnerBorderHeight).toBeGreaterThan(initialInnerBorderHeight);
                    return tick;
                })
                .then(() => {
                    fireEvent.mouseLeave(groupEl);
                    const currentInnerBorderWidth = parseFloat(
                        container.querySelector('.shape-inner-border').getAttribute('width')
                    );
                    const currentInnerBorderHeight = parseFloat(
                        container.querySelector('.shape-inner-border').getAttribute('height')
                    );
                    expect(currentInnerBorderWidth).toEqual(initialInnerBorderWidth);
                    expect(currentInnerBorderHeight).toEqual(initialInnerBorderHeight);
                });
        });

        it('forwards click event', () => {
            const { container, component } = render(RectHotspotChoice, { props: { coords: [100, 100, 200, 300] } });
            const fn = vi.fn();
            component.$on('click', fn);
            const groupEl = container.querySelector('g');
            fireEvent.click(groupEl);
            expect(fn).toHaveBeenCalled();
        });

        it('forwards keyup event', () => {
            const { container, component } = render(RectHotspotChoice, { props: { coords: [100, 100, 200, 300] } });
            const fn = vi.fn();
            component.$on('keyup', fn);
            const groupEl = container.querySelector('g');
            fireEvent.keyUp(groupEl);
            expect(fn).toHaveBeenCalled();
        });
        it('forwards "center" event', () => {
            const { component } = render(RectHotspotChoice, { props: { coords: [100, 100, 200, 300] } });
            const fn = vi.fn();
            component.$on('center', fn);

            component.$set({ coords: [200, 200, 300, 400] });
            return tick().then(() => {
                expect(fn).toHaveBeenCalled();
                expect(fn.mock.calls[0][0].detail).toEqual({ cx: 250, cy: 300 });
            });
        });
    });
});
