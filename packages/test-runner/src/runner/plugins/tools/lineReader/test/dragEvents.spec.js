// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { createMouseEvent, createTouchEvent, simulateVerticalDrag } from './helpers.js';
import useDragEvents from '../dragEvents.js';

const createDomFixture = () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.style.marginTop = '100px';
    return div;
};

describe('dragEvents action', () => {
    it("emits 'dragup' event on dragging element up by mouse", () => {
        const dragupListener = vi.fn();
        const domFixture = createDomFixture();
        useDragEvents(domFixture);
        domFixture.addEventListener('dragup', dragupListener);

        return simulateVerticalDrag(domFixture, createMouseEvent, -100).then(() => {
            expect(dragupListener).toBeCalled();
        });
    });

    it("emits 'dragup' event on dragging element up by touch", () => {
        const dragupListener = vi.fn();
        const domFixture = createDomFixture();
        useDragEvents(domFixture);
        domFixture.addEventListener('dragup', dragupListener);

        return simulateVerticalDrag(domFixture, createTouchEvent, -100).then(() => {
            expect(dragupListener).toBeCalled();
        });
    });

    it("emits 'dragdown' event on dragging element down by mouse", () => {
        const dragdownListener = vi.fn();
        const domFixture = createDomFixture();
        useDragEvents(domFixture);
        domFixture.addEventListener('dragdown', dragdownListener);

        return simulateVerticalDrag(domFixture, createMouseEvent, 100).then(() => {
            expect(dragdownListener).toBeCalled();
        });
    });

    it("emits 'dragdown' event on dragging element down by touch", () => {
        const dragdownListener = vi.fn();
        const domFixture = createDomFixture();
        useDragEvents(domFixture);
        domFixture.addEventListener('dragdown', dragdownListener);

        return simulateVerticalDrag(domFixture, createTouchEvent, 100).then(() => {
            expect(dragdownListener).toBeCalled();
        });
    });

    it("emits 'dragpress' event if no movement was done between start and end positions using mouse", () => {
        const dragpressListener = vi.fn();
        const domFixture = createDomFixture();
        const { top, left } = domFixture.getBoundingClientRect();
        useDragEvents(domFixture);
        domFixture.addEventListener('dragpress', dragpressListener);

        domFixture.dispatchEvent(
            createMouseEvent('mousedown', {
                clientX: left,
                clientY: top
            })
        );
        window.dispatchEvent(
            createMouseEvent('mouseup', {
                clientX: left,
                clientY: top
            })
        );

        expect(dragpressListener).toBeCalled();
    });

    it("emits 'dragpress' event if no movement was done between start and end positions using touch", () => {
        const dragpressListener = vi.fn();
        const domFixture = createDomFixture();
        const { top, left } = domFixture.getBoundingClientRect();
        useDragEvents(domFixture);
        domFixture.addEventListener('dragpress', dragpressListener);

        domFixture.dispatchEvent(
            createTouchEvent('touchstart', {
                clientX: left,
                clientY: top
            })
        );
        window.dispatchEvent(
            createTouchEvent('touchend', {
                clientX: left,
                clientY: top
            })
        );

        expect(dragpressListener).toBeCalled();
    });

    it('removes listeners on destroy', () => {
        const dragpressListener = vi.fn();
        const dragupListener = vi.fn();
        const dragdownListener = vi.fn();
        const domFixture = createDomFixture();
        const { top, left } = domFixture.getBoundingClientRect();
        const dragEvents = useDragEvents(domFixture);
        domFixture.addEventListener('dragpress', dragpressListener);
        domFixture.addEventListener('dragup', dragpressListener);
        domFixture.addEventListener('dragdown', dragpressListener);

        dragEvents.destroy();

        domFixture.dispatchEvent(
            createMouseEvent('mousedown', {
                clientX: left,
                clientY: top
            })
        );
        window.dispatchEvent(
            createMouseEvent('mouseup', {
                clientX: left,
                clientY: top
            })
        );
        domFixture.dispatchEvent(
            createTouchEvent('touchstart', {
                clientX: left,
                clientY: top
            })
        );
        window.dispatchEvent(
            createTouchEvent('touchend', {
                clientX: left,
                clientY: top
            })
        );

        expect(dragpressListener).not.toBeCalled();

        simulateVerticalDrag(domFixture, createMouseEvent, -100);
        simulateVerticalDrag(domFixture, createTouchEvent, -100);

        expect(dragupListener).not.toBeCalled();

        simulateVerticalDrag(domFixture, createMouseEvent, 100);
        simulateVerticalDrag(domFixture, createTouchEvent, 100);

        expect(dragdownListener).not.toBeCalled();
    });
});
