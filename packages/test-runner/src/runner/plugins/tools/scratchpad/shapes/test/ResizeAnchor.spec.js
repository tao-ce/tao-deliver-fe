// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent, render } from '@testing-library/svelte';
import ResizeAnchor from '../ResizeAnchor.svelte';

describe('ResizeAnchor', () => {
    describe('rendering', () => {
        it('renders with props', () => {
            const { container } = render(ResizeAnchor, {
                props: {
                    cx: 100,
                    cy: 100
                }
            });
            expect(container).toMatchSnapshot();
        });
    });

    describe('events', () => {
        it('adds style to body on mousedown', () => {
            const { container } = render(ResizeAnchor, {
                props: {
                    cx: 100,
                    cy: 100
                }
            });

            fireEvent.mouseDown(container.querySelector('.resize-hitbox'));
            expect(document.querySelector('body')).toHaveClass('scratchpad-resizing');
        });

        it('fires startResizing event', () => {
            const { container, component } = render(ResizeAnchor, {
                props: {
                    cx: 100,
                    cy: 100
                }
            });

            const startResizingListener = vi.fn();
            component.$on('startResizing', startResizingListener);
            fireEvent.mouseDown(container.querySelector('.resize-hitbox'));
            expect(startResizingListener).toHaveBeenCalled();
        });

        it('fires resize event on window mousemove', () => {
            const { container, component } = render(ResizeAnchor, {
                props: {
                    cx: 100,
                    cy: 100
                }
            });

            const resizeListener = vi.fn();
            component.$on('resize', resizeListener);
            fireEvent.mouseDown(container.querySelector('.resize-hitbox'), { clientX: 100, clientY: 100, buttons: 1 });
            fireEvent.mouseMove(window, { clientX: 150, clientY: 150, buttons: 1 });
            expect(resizeListener).toHaveBeenCalled();
            expect(resizeListener.mock.calls[0][0].detail).toEqual({ dx: 50, dy: 50 });
        });

        it('stops resizing on mouseup', () => {
            const { container, component } = render(ResizeAnchor, {
                props: {
                    cx: 100,
                    cy: 100
                }
            });

            const finishResizingListener = vi.fn();
            component.$on('finishResizing', finishResizingListener);
            fireEvent.mouseDown(container.querySelector('.resize-hitbox'), { clientX: 100, clientY: 100, buttons: 1 });
            fireEvent.mouseUp(window);
            expect(finishResizingListener).toHaveBeenCalled();
        });

        it('stops resizing on button released', () => {
            const { container, component } = render(ResizeAnchor, {
                props: {
                    cx: 100,
                    cy: 100
                }
            });

            const finishResizingListener = vi.fn();
            component.$on('finishResizing', finishResizingListener);
            fireEvent.mouseDown(container.querySelector('.resize-hitbox'), { clientX: 100, clientY: 100, buttons: 1 });
            fireEvent.mouseMove(container.querySelector('.resize-hitbox'), { clientX: 140, clientY: 150, buttons: 0 });
            expect(finishResizingListener).toHaveBeenCalled();
        });
    });
});
