// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { remToPx } from '@oat-sa-private/ui-core';
import Line from '../Line.svelte';

const lineMinSize = 5.5;

/**
 * Checks x1, y1, x2, y2 of line match expected values
 * @param {HTMLElement} container
 * @param {Object} geometry
 */
function ensureGeometry(container, geometry) {
    const line = container.querySelector('line');
    expect(parseFloat(line.getAttribute('x1'))).toBeCloseTo(geometry.x1);
    expect(parseFloat(line.getAttribute('y1'))).toBeCloseTo(geometry.y1);
    expect(parseFloat(line.getAttribute('x2'))).toBeCloseTo(geometry.x2);
    expect(parseFloat(line.getAttribute('y2'))).toBeCloseTo(geometry.y2);
}
describe('Line', () => {
    describe('rendering', () => {
        it('renders with the given geometry', () => {
            const { container } = render(Line, {
                props: {
                    geometry: {
                        x1: 100,
                        y1: 100,
                        x2: 300,
                        y2: 300
                    }
                }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders with the given key and selected state', () => {
            const { container } = render(Line, {
                props: {
                    geometry: {
                        x1: 100,
                        y1: 100,
                        x2: 300,
                        y2: 300
                    },
                    key: 'somekey',
                    selected: true
                }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders with given drawingGeometry (no geometry props)', () => {
            const { container } = render(Line, {
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
        it('draws initial line of minlength with mouseup', () => {
            const { container } = render(Line, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    }
                }
            });

            fireEvent.mouseUp(window, { clientX: 300, clientY: 200 });
            return tick().then(() => {
                ensureGeometry(container, { x1: 100, y1: 100, x2: 100 + remToPx(lineMinSize), y2: 100 });
            });
        });

        it('draws line of minimum size in a direaction of a small offset', () => {
            const { container } = render(Line, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    }
                }
            });

            fireEvent.mouseUp(window, { clientX: 300, clientY: 200 });
            fireEvent.mouseMove(window, { clientX: 300, clientY: 210, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, { x1: 100, y1: 100, x2: 100, y2: 100 + remToPx(lineMinSize) });
            });
        });

        it('draws line following the pointer movement', () => {
            const { container } = render(Line, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    }
                }
            });

            fireEvent.mouseUp(window, { clientX: 300, clientY: 200 });
            fireEvent.mouseMove(window, { clientX: 500, clientY: 400, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, { x1: 100, y1: 100, x2: 300, y2: 300 });
            });
        });

        it('draws line with drag', () => {
            const { container } = render(Line, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200
                    }
                }
            });
            fireEvent.mouseMove(window, { clientX: 450, clientY: 350, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 500, clientY: 400, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, { x1: 100, y1: 100, x2: 300, y2: 300 });
            });
        });
    });
    describe('events', () => {
        it('fires finishDraw with the second click', () => {
            const { component } = render(Line, {
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

            fireEvent.mouseUp(window, { clientX: 300, clientY: 200 });
            fireEvent.mouseMove(window, { clientX: 400, clientY: 300, buttons: 1 });

            //need to postpone second click a bit due to implementation
            return new Promise(res =>
                setTimeout(() => {
                    res();
                }, 150)
            )
                .then(() => {
                    fireEvent.mouseUp(window, { clientX: 400, clientY: 300 });
                    return tick();
                })
                .then(() => {
                    expect(finishDrawHandler).toHaveBeenCalled();
                    expect(finishDrawHandler.mock.calls[0][0].detail).toEqual({
                        type: 'line',
                        geometry: { x1: 100, y1: 100, x2: 200, y2: 200 }
                    });
                });
        });
    });
});
