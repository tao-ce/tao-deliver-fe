// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { remToPx } from '@oat-sa-private/ui-core';
import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ellipse from '../Ellipse.svelte';

/**
 * Checks cx, cy, rx, ry of ellipse match expected values
 * @param {HTMLElement} container
 * @param {Object} geometry
 */
function ensureGeometry(container, geometry) {
    const ellipse = container.querySelector('ellipse');
    expect(parseFloat(ellipse.getAttribute('cx'))).toBeCloseTo(geometry.cx);
    expect(parseFloat(ellipse.getAttribute('cy'))).toBeCloseTo(geometry.cy);
    expect(parseFloat(ellipse.getAttribute('rx'))).toBeCloseTo(geometry.rx);
    expect(parseFloat(ellipse.getAttribute('ry'))).toBeCloseTo(geometry.ry);
}
describe('Ellipse', () => {
    describe('rendering', () => {
        it('renders with the given geometry', () => {
            const { container } = render(Ellipse, {
                props: {
                    geometry: {
                        cx: 100,
                        cy: 100,
                        rx: 30,
                        ry: 20
                    }
                }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders with the given key and selected state', () => {
            const { container } = render(Ellipse, {
                props: {
                    geometry: {
                        cx: 100,
                        cy: 100,
                        rx: 30,
                        ry: 20
                    },
                    key: 'somekey',
                    selected: true
                }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders with given drawingGeometry', () => {
            const { container } = render(Ellipse, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    }
                }
            });
            expect(container).toMatchSnapshot();
        });
    });

    describe('behaviour', () => {
        it('draws ellipse with mousemove', () => {
            const { container } = render(Ellipse, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    }
                }
            });

            //SE direction
            fireEvent.mouseMove(window, { clientX: 400, clientY: 300, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, { cx: 150, cy: 150, rx: 50, ry: 50 });
                //NW direction
                fireEvent.mouseMove(window, { clientX: 250, clientY: 150, buttons: 1 });
                return tick().then(() => {
                    expect(container).toMatchSnapshot();
                    ensureGeometry(container, { cx: 75, cy: 75, rx: 25, ry: 25 });
                });
            });
        });

        it('adds too-small class to the ellipse if offset is small', () => {
            const { container } = render(Ellipse, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    }
                }
            });

            fireEvent.mouseMove(window, { clientX: 310, clientY: 210, buttons: 1 });
            return tick().then(() => {
                expect(container.querySelector('ellipse')).toHaveClass('too-small');
            });
        });
    });
    describe('events', () => {
        it('fires finishDraw with false in details if offset is too small', () => {
            const { component } = render(Ellipse, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    }
                }
            });

            const finishDrawHandler = vi.fn();
            component.$on('finishDraw', finishDrawHandler);

            fireEvent.mouseMove(window, { clientX: 310, clientY: 210, buttons: 1 });
            fireEvent.mouseUp(window, { clientX: 310, clientY: 210 });
            return tick().then(() => {
                expect(finishDrawHandler).toHaveBeenCalled();
                expect(finishDrawHandler.mock.calls[0][0].detail).toBe(false);
            });
        });

        it('fires finishDraw with geometry in details if offset is large enough', () => {
            const { component } = render(Ellipse, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    }
                }
            });

            const finishDrawHandler = vi.fn();
            component.$on('finishDraw', finishDrawHandler);

            fireEvent.mouseMove(window, { clientX: 400, clientY: 300, buttons: 1 });
            fireEvent.mouseUp(window, { clientX: 400, clientY: 300 });
            return tick().then(() => {
                expect(finishDrawHandler).toHaveBeenCalled();
                expect(finishDrawHandler.mock.calls[0][0].detail).toEqual({
                    type: 'oval',
                    geometry: { cx: 150, cy: 150, rx: 50, ry: 50 }
                });
            });
        });

        it('can be resized by resize anchor', () => {
            const { container } = render(Ellipse, {
                props: {
                    geometry: {
                        cx: 100,
                        cy: 100,
                        rx: 50,
                        ry: 50
                    },
                    selected: true
                }
            });

            fireEvent.mouseDown(container.querySelector('.resize-hitbox'), { clientX: 200, clientY: 200, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 250, clientY: 250, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, { cx: 125, cy: 125, rx: 75, ry: 75 });
            });
        });

        it('respects minSize constraint during resizing', () => {
            const minSize = remToPx(1);
            const { container } = render(Ellipse, {
                props: {
                    geometry: {
                        cx: 100,
                        cy: 100,
                        rx: 50,
                        ry: 50
                    },
                    selected: true
                }
            });

            fireEvent.mouseDown(container.querySelector('.resize-hitbox'), { clientX: 200, clientY: 200, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 0, clientY: 0, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, {
                    cx: 50 + minSize / 2,
                    cy: 50 + minSize / 2,
                    rx: minSize / 2,
                    ry: minSize / 2
                });
            });
        });

        it('fires finishResizing event on resize finish', () => {
            const { container, component } = render(Ellipse, {
                props: {
                    geometry: {
                        cx: 100,
                        cy: 100,
                        rx: 50,
                        ry: 50
                    },
                    selected: true
                }
            });

            const finishResizingListener = vi.fn();
            component.$on('finishResizing', finishResizingListener);
            fireEvent.mouseDown(container.querySelector('.resize-hitbox'), { clientX: 200, clientY: 200, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 250, clientY: 250, buttons: 1 });
            fireEvent.mouseUp(window);
            expect(finishResizingListener).toHaveBeenCalled();
            expect(finishResizingListener.mock.calls[0][0].detail).toEqual({
                geometry: { cx: 125, cy: 125, rx: 75, ry: 75 }
            });
        });
    });
});
