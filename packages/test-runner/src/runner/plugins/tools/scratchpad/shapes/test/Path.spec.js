// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import Path from '../Path.svelte';

/**
 * Checks d of path match expected values
 * @param {HTMLElement} container
 * @param {Object} geometry
 */
function ensureGeometry(container, geometry) {
    const path = container.querySelector('path');

    const getD = points => `M ${points.map(point => `${point[0]} ${point[1]}`).join(' L ')}`;
    expect(path.getAttribute('d')).toBe(getD(geometry.points));
    expect(parseInt(path.getAttribute('stroke-width'))).toBe(geometry.size);
}

describe('Path', () => {
    describe('rendering', () => {
        it('renders with the given geometry', () => {
            const { container } = render(Path, {
                props: {
                    geometry: {
                        points: [
                            [20, 20],
                            [100, 100],
                            [60, 70],
                            [80, 90]
                        ],
                        size: 16,
                        x: 12,
                        y: 12,
                        width: 96,
                        height: 96
                    }
                }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders with the given key and selected state', () => {
            const { container } = render(Path, {
                props: {
                    geometry: {
                        points: [
                            [20, 20],
                            [100, 100],
                            [60, 70],
                            [80, 90]
                        ],
                        size: 16,
                        x: 12,
                        y: 12,
                        width: 96,
                        height: 96
                    },
                    key: 'somekey',
                    selected: true
                }
            });
            expect(container).toMatchSnapshot();
        });
        it('renders with given drawingGeometry', () => {
            const { container } = render(Path, {
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
        it('draws path with mousemove', () => {
            const { container } = render(Path, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200,
                        size: 16
                    }
                }
            });

            //SE direction
            fireEvent.mouseMove(window, { clientX: 400, clientY: 300, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, {
                    points: [
                        [100, 100],
                        [150, 150]
                    ],
                    size: 16
                });
                //NW direction
                fireEvent.mouseMove(window, { clientX: 200, clientY: 100, buttons: 1 });
                return tick().then(() => {
                    expect(container).toMatchSnapshot();
                    ensureGeometry(container, {
                        points: [
                            [100, 100],
                            [150, 150],
                            [100, 100]
                        ],
                        size: 16
                    });
                });
            });
        });

        it('smooths the path based on points buffer', () => {
            const { container } = render(Path, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200,
                        size: 16
                    }
                }
            });

            //fill buffer with same points
            for (let i = 0; i < 7; i++) {
                fireEvent.mouseMove(window, { clientX: 300, clientY: 200, buttons: 1 });
            }
            fireEvent.mouseMove(window, { clientX: 380, clientY: 280, buttons: 1 });
            return tick().then(() => {
                ensureGeometry(container, {
                    points: [
                        [100, 100],
                        [100, 100],
                        [100, 100],
                        [100, 100],
                        [100, 100],
                        [100, 100],
                        [100, 100],
                        [100, 100],
                        [110, 110]
                    ],
                    size: 16
                });
            });
        });

        it('adds too-small class to the path if offset is small', () => {
            const { container } = render(Path, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200,
                        size: 16
                    }
                }
            });

            fireEvent.mouseMove(window, { clientX: 305, clientY: 205, buttons: 1 });
            return tick().then(() => {
                expect(container.querySelector('path')).toHaveClass('too-small');
            });
        });
    });

    describe('events', () => {
        const originalGetBBox = SVGElement.prototype.getBBox;
        afterEach(() => {
            SVGElement.prototype.getBBox = originalGetBBox;
        });
        beforeEach(() => {
            SVGElement.prototype.getBBox = () => ({ x: 100, y: 100, width: 100, height: 100 });
        });

        it('fires finishDraw with geometry in details if offset is large enough', () => {
            const { component } = render(Path, {
                props: {
                    drawingGeometry: {
                        drawAreaStartX: 100,
                        drawAreaStartY: 100,
                        initialPointerX: 300,
                        initialPointerY: 200,
                        size: 16
                    }
                }
            });

            const finishDrawHandler = vi.fn();
            component.$on('finishDraw', finishDrawHandler);

            fireEvent.mouseMove(window, { clientX: 400, clientY: 300, buttons: 1 });
            return new Promise(res => setTimeout(res, 500)).then(() => {
                fireEvent.mouseUp(window, { clientX: 400, clientY: 300 });
                return tick().then(() => {
                    expect(finishDrawHandler).toHaveBeenCalled();
                    expect(finishDrawHandler.mock.calls[0][0].detail).toEqual({
                        type: 'brush',
                        geometry: {
                            points: [
                                [100, 100],
                                [150, 150]
                            ],
                            size: 16,
                            //mocked getBBox values
                            x: 100,
                            y: 100,
                            width: 100,
                            height: 100
                        }
                    });
                });
            });
        });
        it('fires finishDraw with false in details if offset is too small', () => {
            const { component } = render(Path, {
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
    });
});
