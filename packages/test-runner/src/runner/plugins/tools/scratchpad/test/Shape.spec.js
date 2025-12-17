// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import Shape from '../Shape.svelte';

describe('Shape', () => {
    describe('rendering', () => {
        it('should render the rect shape based on rectangle type', () => {
            const { container } = render(Shape, {
                props: {
                    type: 'rectangle'
                }
            });
            expect(container.querySelector('rect')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });
        it('should render the ellipse shape based on oval type', () => {
            const { container } = render(Shape, {
                props: {
                    type: 'oval'
                }
            });
            expect(container.querySelector('ellipse')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });
        it('should render the line shape based on line type', () => {
            const { container } = render(Shape, {
                props: {
                    type: 'line'
                }
            });
            expect(container.querySelector('line')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });
        it('should render the path shape based on brush type', () => {
            const { container } = render(Shape, {
                props: {
                    type: 'brush'
                }
            });
            expect(container.querySelector('path')).toBeTruthy();
            expect(container).toMatchSnapshot();
        });
    });
    describe('events', () => {
        it('should fire finishDraw event when receives one', () => {
            const { component } = render(Shape, {
                props: {
                    type: 'rectangle',
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

            expect(finishDrawHandler).toHaveBeenCalled();
            expect(finishDrawHandler.mock.calls[0][0].detail).toEqual({
                type: 'rectangle',
                geometry: { x: 100, y: 100, width: 100, height: 100 }
            });
        });
    });
});
