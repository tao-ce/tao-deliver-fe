// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { render, fireEvent } from '@testing-library/svelte';
import { defaultGapSize, maxGapSize, minGapSize } from '../sizes';
import { createMouseEvent, createTouchEvent, simulateVerticalDrag } from './helpers.js';
import LineReaderMask from '../LineReaderMask.svelte';
import { remToPx } from '@oat-sa-private/ui-core';

const GAP_SELECTOR = '.line-reader-gap';
const MOVE_CONTROL_SELECTOR = '.line-reader-control.move';
const RESIZE_CONTROL_SELECTOR = '.line-reader-control.resize';

describe('LineReaderMask rendering', () => {
    it('renders correctly', () => {
        const { container } = render(LineReaderMask);

        expect(container).toMatchSnapshot();
    });

    it('renders correctly with provided properties', () => {
        const { container } = render(LineReaderMask, {
            gapSize: 85,
            gapYOffset: 100
        });

        expect(container).toMatchSnapshot();
    });
});

describe('LineReaderMask behaviour', () => {
    beforeEach(() => {
        Element.prototype.getBoundingClientRect = function () {
            if (this.classList.contains('line-reader')) {
                return {
                    width: 1024,
                    height: 768,
                    top: 0,
                    left: 0,
                    bottom: 768,
                    right: 1024
                };
            } else if (this.classList.contains('line-reader-gap')) {
                const height = Number(this.style.height.replace(/\D/g, ''));
                const top = Number(this.style.transform.replace(/\D/g, ''));

                return {
                    width: 1024,
                    height,
                    top,
                    left: 0,
                    bottom: top + height,
                    right: 1024
                };
            } else if (this.classList.contains('line-reader-controls')) {
                const gapHeight = Number(this.parentElement.style.height.replace(/\D/g, ''));
                const gapOffset = Number(this.parentElement.style.transform.replace(/\D/g, ''));

                return {
                    width: 1024,
                    height: remToPx(5.5),
                    top: gapOffset + gapHeight,
                    left: 0,
                    bottom: gapOffset + gapHeight + remToPx(5.5),
                    right: 1024
                };
            } else if (this.classList.contains('line-reader-control')) {
                const gap = this.closest(GAP_SELECTOR);
                const gapHeight = Number(gap.style.height.replace(/\D/g, ''));
                const gapOffset = Number(gap.style.transform.replace(/\D/g, ''));

                return {
                    width: this.classList.contains('move') ? remToPx(8) : remToPx(5.5),
                    height: remToPx(5.5),
                    top: gapOffset + gapHeight,
                    left: this.classList.contains('move') ? (1024 - remToPx(8)) / 2 : 0,
                    bottom: gapOffset + gapHeight + remToPx(5.5),
                    right: this.classList.contains('move') ? (1024 + remToPx(8)) / 2 : remToPx(5.5)
                };
            } else {
                return {
                    width: 0,
                    height: 0,
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0
                };
            }
        };
    });

    it('default gap position when opened for the first time is at the top of the content', () => {
        const { container } = render(LineReaderMask);
        const gap = container.querySelector(GAP_SELECTOR);

        expect(gap.style.transform).toBe('translateY(0px)');
    });

    it('gap size when opened for the first time equals defaultGapSize', () => {
        const { container } = render(LineReaderMask);
        const gap = container.querySelector(GAP_SELECTOR);

        expect(gap.style.height).toBe(`${defaultGapSize}px`);
    });

    it('gap can be moved by cursor tracking', () => {
        const { container, component } = render(LineReaderMask, {
            props: {
                gapYOffset: 200
            }
        });
        const moveHandler = vi.fn();
        component.$on('move', moveHandler);
        const gap = container.querySelector(GAP_SELECTOR);
        const { top, bottom } = gap.getBoundingClientRect();

        return fireEvent(
            window,
            new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                clientX: 90,
                clientY: top - 10
            })
        )
            .then(() =>
                fireEvent(
                    window,
                    new MouseEvent('mousemove', {
                        bubbles: true,
                        cancelable: true,
                        clientX: 90,
                        clientY: bottom + 10
                    })
                )
            )
            .then(() => {
                expect(moveHandler).toBeCalledTimes(2);
            });
    });

    it('if cursor is inside of the gap or one of the controls gap is not being moved', () => {
        const { container, component } = render(LineReaderMask, {
            props: {
                gapYOffset: 200
            }
        });
        const moveHandler = vi.fn();
        component.$on('move', moveHandler);
        const gap = container.querySelector(GAP_SELECTOR);
        const moveControl = container.querySelector(MOVE_CONTROL_SELECTOR);
        const resizeControl = container.querySelector(RESIZE_CONTROL_SELECTOR);
        const { top: gapTop, left: gapLeft } = gap.getBoundingClientRect();
        const { top: moveControlTop, left: moveControlLeft } = moveControl.getBoundingClientRect();
        const { top: resizeControlTop, left: resizeControlLeft } = resizeControl.getBoundingClientRect();

        return fireEvent(
            window,
            new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                clientX: gapLeft + 1,
                clientY: gapTop + 1
            })
        )
            .then(() =>
                fireEvent(
                    window,
                    new MouseEvent('mousemove', {
                        bubbles: true,
                        cancelable: true,
                        clientX: moveControlLeft + 1,
                        clientY: moveControlTop + 1
                    })
                )
            )
            .then(() =>
                fireEvent(
                    window,
                    new MouseEvent('mousemove', {
                        bubbles: true,
                        cancelable: true,
                        clientX: resizeControlLeft + 1,
                        clientY: resizeControlTop + 1
                    })
                )
            )
            .then(() => {
                expect(moveHandler).not.toBeCalled();
            });
    });

    it('gap can be moved by dragging move control with mouse', () => {
        const { container, component } = render(LineReaderMask);
        const moveHandler = vi.fn();
        component.$on('move', moveHandler);

        const moveControl = container.querySelector(MOVE_CONTROL_SELECTOR);
        return simulateVerticalDrag(moveControl, createMouseEvent, 1).then(() => {
            expect(moveHandler).toBeCalledTimes(1);
        });
    });

    it('gap can be moved by dragging move control with touch', () => {
        const { container, component } = render(LineReaderMask);
        const moveHandler = vi.fn();
        component.$on('move', moveHandler);

        const moveControl = container.querySelector(MOVE_CONTROL_SELECTOR);
        return simulateVerticalDrag(moveControl, createTouchEvent, 1).then(() => {
            expect(moveHandler).toBeCalledTimes(1);
        });
    });

    it('gap can be moved using arrow keys on focused move control', () => {
        const { container, component } = render(LineReaderMask, {
            gapYOffset: 90
        });
        const moveHandler = vi.fn();
        component.$on('move', moveHandler);

        const moveControl = container.querySelector(MOVE_CONTROL_SELECTOR);

        return fireEvent(
            moveControl,
            new KeyboardEvent('keydown', {
                key: 'ArrowUp'
            })
        )
            .then(() =>
                fireEvent(
                    moveControl,
                    new KeyboardEvent('keydown', {
                        key: 'ArrowDown'
                    })
                )
            )
            .then(() => {
                expect(moveHandler).toBeCalledTimes(2);
            });
    });

    it('gap can be resized by dragging resize control with mouse', () => {
        const { container, component } = render(LineReaderMask);
        const resizeHandler = vi.fn();
        component.$on('resize', resizeHandler);

        const resizeControl = container.querySelector(RESIZE_CONTROL_SELECTOR);
        return simulateVerticalDrag(resizeControl, createMouseEvent, 1).then(() => {
            expect(resizeHandler).toBeCalledTimes(1);
        });
    });

    it('gap can be resized by dragging resize control with touch', () => {
        const { container, component } = render(LineReaderMask);
        const resizeHandler = vi.fn();
        component.$on('resize', resizeHandler);

        const resizeControl = container.querySelector(RESIZE_CONTROL_SELECTOR);
        return simulateVerticalDrag(resizeControl, createTouchEvent, 1).then(() => {
            expect(resizeHandler).toBeCalledTimes(1);
        });
    });

    it('gap can be resized using arrow keys on focused resize control', () => {
        const { container, component } = render(LineReaderMask, {
            gapSize: minGapSize
        });
        const resizeHandler = vi.fn();
        component.$on('resize', resizeHandler);

        const resizeControl = container.querySelector(RESIZE_CONTROL_SELECTOR);

        return fireEvent(
            resizeControl,
            new KeyboardEvent('keydown', {
                key: 'ArrowUp'
            })
        )
            .then(() =>
                fireEvent(
                    resizeControl,
                    new KeyboardEvent('keydown', {
                        key: 'ArrowDown'
                    })
                )
            )
            .then(() => {
                expect(resizeHandler).toBeCalledTimes(2);
            });
    });

    it('gap is being moved if resized to it’s minimum size by dragging resize control with mouse', () => {
        const { container, component } = render(LineReaderMask, {
            gapSize: minGapSize,
            gapYOffset: 400
        });
        const moveHandler = vi.fn();
        component.$on('move', moveHandler);

        const resizeControl = container.querySelector(RESIZE_CONTROL_SELECTOR);
        return simulateVerticalDrag(resizeControl, createMouseEvent, -1).then(() => {
            expect(moveHandler).toBeCalledTimes(1);
        });
    });

    it('gap is being moved if resized to it’s minimum size by dragging resize control with touch', () => {
        const { container, component } = render(LineReaderMask, {
            gapSize: minGapSize,
            gapYOffset: 400
        });
        const moveHandler = vi.fn();
        component.$on('move', moveHandler);

        const resizeControl = container.querySelector(RESIZE_CONTROL_SELECTOR);
        return simulateVerticalDrag(resizeControl, createTouchEvent, -1).then(() => {
            expect(moveHandler).toBeCalledTimes(1);
        });
    });

    it('gap is being moved if resized to it’s maximum size by dragging resize control with mouse', () => {
        const { container, component } = render(LineReaderMask, {
            gapSize: maxGapSize,
            gapYOffset: 400
        });
        const moveHandler = vi.fn();
        component.$on('move', moveHandler);

        const resizeControl = container.querySelector(RESIZE_CONTROL_SELECTOR);
        return simulateVerticalDrag(resizeControl, createMouseEvent, 1).then(() => {
            expect(moveHandler).toBeCalledTimes(1);
        });
    });

    it('gap is being moved if resized to it’s maximum size by dragging resize control with touch', () => {
        const { container, component } = render(LineReaderMask, {
            gapSize: maxGapSize,
            gapYOffset: 400
        });
        const moveHandler = vi.fn();
        component.$on('move', moveHandler);

        const resizeControl = container.querySelector(RESIZE_CONTROL_SELECTOR);
        return simulateVerticalDrag(resizeControl, createTouchEvent, 1).then(() => {
            expect(moveHandler).toBeCalledTimes(1);
        });
    });

    it('cycles gap size between minGapSize, defaultGapSize and maxGapSize on resize control click', () => {
        const { container, component } = render(LineReaderMask, {
            gapSize: minGapSize + 2
        });
        const resizeHandler = vi.fn();
        component.$on('resize', ({ detail: { size } }) => resizeHandler(size));

        const resizeControl = container.querySelector(RESIZE_CONTROL_SELECTOR);

        return fireEvent
            .mouseDown(resizeControl)
            .then(() => fireEvent.mouseUp(resizeControl))
            .then(() => {
                expect(resizeHandler).toBeCalledWith(defaultGapSize);

                return fireEvent.mouseDown(resizeControl);
            })
            .then(() => fireEvent.mouseUp(resizeControl))
            .then(() => {
                expect(resizeHandler).toBeCalledWith(maxGapSize);

                return fireEvent.mouseDown(resizeControl);
            })
            .then(() => fireEvent.mouseUp(resizeControl))
            .then(() => {
                expect(resizeHandler).toBeCalledWith(minGapSize);
            });
    });
});

describe('LineReaderMask API', () => {
    it('exports handleTopOverlayTap and handleBottomOverlayTap methods', () => {
        const { component } = render(LineReaderMask);

        expect(typeof component.handleTopOverlayTap).toBe('function');
        expect(typeof component.handleBottomOverlayTap).toBe('function');
    });
});
