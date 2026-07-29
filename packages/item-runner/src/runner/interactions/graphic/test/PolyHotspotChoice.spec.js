// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../util/polygon.js', async () => {
    const originalModule = await vi.importActual('../util/polygon.js');
    return Object.assign({ __esModule: true }, originalModule, {
        getIsThin: vi.fn().mockReturnValue(false)
    });
});

vi.mock('@oat-sa-private/ui-core', async importOriginal => {
    const actual = await importOriginal();
    return {
        ...actual,
        remToPx: rem => rem * 8
    };
});

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import PolyHotspotChoice from '../PolyHotspotChoice.svelte';
import { getIsThin } from '../util/polygon.js';

let rootSvgEl;

//mock getBBox for <text> rendering
const originalGetBBox = SVGElement.prototype.getBBox;

beforeEach(() => {
    SVGElement.prototype.getBBox = () => ({ x: 1, y: 1, width: 1, height: 1 });

    rootSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    rootSvgEl.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', 'http://www.w3.org/1999/xlink');

    getIsThin.mockReturnValue(false);
});
afterEach(() => {
    SVGElement.prototype.getBBox = originalGetBBox;
    vi.clearAllMocks();
});

describe('poly hotspot choice', () => {
    describe('rendering', () => {
        it('renders with no props', () => {
            const { container } = render(PolyHotspotChoice, { target: rootSvgEl, props: {} });
            expect(container.getElementsByClassName('shape')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('renders poly elements with given coords', () => {
            const { container } = render(PolyHotspotChoice, {
                target: rootSvgEl,
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150] }
            });
            //renders: clipPath, shadow, outer border, inner border, focus outline, cover for focus outline
            expect(container.querySelectorAll('polygon').length).toEqual(6);
            expect(container).toMatchSnapshot();
        });

        it('sets correct class to group if selected', () => {
            const { container } = render(PolyHotspotChoice, {
                target: rootSvgEl,
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150], selected: true }
            });
            expect(container.querySelector('g').classList).toContain('selected');
        });

        it('renders text label as a checkmark if label is set', () => {
            const { container } = render(PolyHotspotChoice, {
                target: rootSvgEl,
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150], selected: true, label: '1' }
            });
            expect(container.querySelector('text')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });

        it('renders thin polygons with another style', () => {
            getIsThin.mockReturnValue(true);
            const width = 10;
            const height = 100;
            const { container } = render(PolyHotspotChoice, {
                target: rootSvgEl,
                props: {
                    coords: [10, 10, 10 + width, 10, 10 + width, 10 + height, 10, 10 + height]
                }
            });
            //renders: inverted clipPath, outer border, inner border, focus outline, cover for focus outline
            expect(container.querySelectorAll('polygon').length).toEqual(5);
            expect(container.querySelector('g').classList).toContain('thin-poly');
            const getIsThinArgs = getIsThin.mock.calls[0];
            expect(getIsThinArgs).toEqual([
                expect.objectContaining({ node: container.querySelector('g') }),
                15,
                60,
                16
            ]);
            expect(container).toMatchSnapshot();
        });

        it('clears clipPath on redraw', async () => {
            const { component } = render(PolyHotspotChoice, {
                target: rootSvgEl,
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150] }
            });
            expect(rootSvgEl.querySelectorAll('clipPath').length).toBe(1);
            expect(rootSvgEl.querySelector('clipPath').innerHTML).toContain('points="100,100');

            component.$set({ coords: [200, 200, 800, 1200, 200, 1600, 0, 300] });
            await tick();
            expect(rootSvgEl.querySelectorAll('clipPath').length).toBe(1);
            expect(rootSvgEl.querySelector('clipPath').innerHTML).toContain('points="200,200');
        });
    });

    describe('events', () => {
        it('forwards click event', () => {
            const { container, component } = render(PolyHotspotChoice, {
                target: rootSvgEl,
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
                target: rootSvgEl,
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
                target: rootSvgEl,
                props: { coords: [100, 100, 400, 600, 100, 800, 0, 150] }
            });
            const fn = vi.fn();
            component.$on('center', fn);

            component.$set({ coords: [50, 50, 400, 600, 100, 800, 0, 150] });
            return tick().then(() => {
                expect(fn).toHaveBeenCalled();
                const fnResult = fn.mock.calls[0][0].detail;
                expect({ cx: Math.round(fnResult.cx), cy: Math.round(fnResult.cy) }).toEqual({ cx: 206, cy: 558 });
            });
        });
    });
});
