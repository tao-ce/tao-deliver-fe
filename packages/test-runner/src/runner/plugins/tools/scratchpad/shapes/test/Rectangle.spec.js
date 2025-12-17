// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import { remToPx } from '@oat-sa-private/ui-core';
import { tick } from 'svelte';
import Rectangle from '../Rectangle.svelte';

/**
 * Checks x, y, width, height of rectangle match expected values
 * @param {HTMLElement} container
 * @param {Object} geometry
 */
function ensureGeometry(container, geometry) {
    const rect = container.querySelector('rect');
    expect(parseFloat(rect.getAttribute('x'))).toBeCloseTo(geometry.x);
    expect(parseFloat(rect.getAttribute('y'))).toBeCloseTo(geometry.y);
    expect(parseFloat(rect.getAttribute('width'))).toBeCloseTo(geometry.width);
    expect(parseFloat(rect.getAttribute('height'))).toBeCloseTo(geometry.height);
}
describe('Rectangle', () => {
    describe('rendering', () => {
        it('renders with the given geometry', () => {
            const { container } = render(Rectangle, {
                props: {
                    geometry: {
                        x: 100,
                        y: 100,
                        width: 200,
                        height: 300
                    }
                }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders with the given key and selected state', () => {
            const { container } = render(Rectangle, {
                props: {
                    geometry: {
                        x: 100,
                        y: 100,
                        width: 200,
                        height: 300
                    },
                    key: 'somekey',
                    selected: true
                }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders with given drawingGeometry', () => {
            const { container } = render(Rectangle, {
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
        it('draws rect with mousemove', () => {
            const { container } = render(Rectangle, {
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
                ensureGeometry(container, { x: 100, y: 100, width: 100, height: 100 });
                //NW direction
                fireEvent.mouseMove(window, { clientX: 200, clientY: 100, buttons: 1 });
                return tick().then(() => {
                    expect(container).toMatchSnapshot();
                    ensureGeometry(container, { x: 0, y: 0, width: 100, height: 100 });
                });
            });
        });

        it('adds too-small class to the rect if offset is small', () => {
            const { container } = render(Rectangle, {
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
                expect(container.querySelector('rect')).toHaveClass('too-small');
            });
        });
    });
    describe('events', () => {
        it('fires finishDraw with false in details if offset is too small', () => {
            const { component } = render(Rectangle, {
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
            const { component } = render(Rectangle, {
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
                    type: 'rectangle',
                    geometry: { x: 100, y: 100, width: 100, height: 100 }
                });
            });
        });

        it('can be resized by resize anchor', () => {
            const { container } = render(Rectangle, {
                props: {
                    geometry: {
                        x: 100,
                        y: 100,
                        width: 200,
                        height: 300
                    },
                    selected: true
                }
            });

            fireEvent.mouseDown(container.querySelector('.resize-hitbox'), { clientX: 300, clientY: 400, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 350, clientY: 450, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, { x: 100, y: 100, width: 250, height: 350 });
            });
        });

        it('respects minSize constraint during resizing', () => {
            const minSize = remToPx(1);
            const { container } = render(Rectangle, {
                props: {
                    geometry: {
                        x: 100,
                        y: 100,
                        width: 200,
                        height: 300
                    },
                    selected: true
                }
            });

            fireEvent.mouseDown(container.querySelector('.resize-hitbox'), { clientX: 300, clientY: 400, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 0, clientY: 0, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, { x: 100, y: 100, width: minSize, height: minSize });
            });
        });

        it('fires finishResizing event on resize finish', () => {
            const { container, component } = render(Rectangle, {
                props: {
                    geometry: {
                        x: 100,
                        y: 100,
                        width: 200,
                        height: 300
                    },
                    selected: true
                }
            });

            const finishResizingListener = vi.fn();
            component.$on('finishResizing', finishResizingListener);
            fireEvent.mouseDown(container.querySelector('.resize-hitbox'), { clientX: 300, clientY: 400, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 350, clientY: 450, buttons: 1 });
            fireEvent.mouseUp(window);
            expect(finishResizingListener).toHaveBeenCalled();
            expect(finishResizingListener.mock.calls[0][0].detail).toEqual({
                geometry: { x: 100, y: 100, width: 250, height: 350 }
            });
        });
    });
});
