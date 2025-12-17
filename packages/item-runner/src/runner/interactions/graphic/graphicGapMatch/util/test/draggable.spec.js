// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent } from '@testing-library/svelte';
import { SVG } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.draggable.js/src/svg.draggable.js';
import { constrainSvgDragMoveBox, setupDraggableClickable } from '../draggable.js';

describe('constrainSvgDragMoveBox', () => {
    function createDomFixture(container, draggable, rect) {
        const div = document.createElement('div');
        div.class = 'fixture';
        div.innerHTML = `
            <div class='page' style='padding-top: ${container.y}; padding-left: ${container.x}'>
                <svg class='container' x='0' y='0' width='${container.width}' height='${container.height}'
                    viewbox='0 0 ${container.width} ${container.height}'>
                    <svg class='draggable' x='${draggable.x}' y='${draggable.y}' width='${draggable.width}' height='${draggable.height}'
                        viewbox='0 0 ${draggable.width} ${draggable.height}'>
                        <rect x='${rect.x}' y='${rect.y}' width='${rect.width}' height='${rect.height}' />
                    </svg
                </svg>
            </div>
            `;
        document.body.appendChild(div);
        const containerElem = document.querySelector('.container');
        const draggableElem = document.querySelector('.draggable');
        const draggableSvg = SVG(draggableElem);

        draggableElem.getBBox = () => ({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        });
        containerElem.getBoundingClientRect = () => ({
            bottom: container.height + container.y,
            height: container.height,
            left: container.x,
            right: container.width + container.y,
            top: container.y,
            width: container.width
        });

        return [containerElem, draggableSvg];
    }

    afterEach(() => {
        Array.from(document.querySelectorAll('.fixture')).forEach(elt => elt.remove());
    });

    it('does not constrain if move does not go over bounds', () => {
        const containerCoords = { x: 0, y: 0, width: 100, height: 100 };
        const draggableCoords = { x: 40, y: 40, width: 20, height: 20 };
        const rectCoords = { x: 0, y: 0, width: 20, height: 20 };
        const [container, draggable] = createDomFixture(containerCoords, draggableCoords, rectCoords);

        let moveEventBox = { x: 39, y: 39 };
        let constrained = { x: 39, y: 39 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);

        moveEventBox = { x: -39, y: -39 };
        constrained = { x: -39, y: -39 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);
    });

    it('returns constrained if move goes: over top', () => {
        const containerCoords = { x: 0, y: 0, width: 100, height: 100 };
        const draggableCoords = { x: 40, y: 40, width: 20, height: 20 };
        const rectCoords = { x: 0, y: 0, width: 20, height: 20 };
        const [container, draggable] = createDomFixture(containerCoords, draggableCoords, rectCoords);

        let moveEventBox = { x: 0, y: -41 };
        const constrained = { x: 0, y: -40 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);

        moveEventBox = { x: 0, y: -100 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);
    });

    it('returns constrained if move goes: over bottom', () => {
        const containerCoords = { x: 0, y: 0, width: 100, height: 100 };
        const draggableCoords = { x: 40, y: 40, width: 20, height: 20 };
        const rectCoords = { x: 0, y: 0, width: 20, height: 20 };
        const [container, draggable] = createDomFixture(containerCoords, draggableCoords, rectCoords);

        let moveEventBox = { x: 0, y: 41 };
        const constrained = { x: 0, y: 40 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);

        moveEventBox = { x: 0, y: 100 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);
    });

    it('returns constrained if move goes: over left', () => {
        const containerCoords = { x: 0, y: 0, width: 100, height: 100 };
        const draggableCoords = { x: 40, y: 40, width: 20, height: 20 };
        const rectCoords = { x: 0, y: 0, width: 20, height: 20 };
        const [container, draggable] = createDomFixture(containerCoords, draggableCoords, rectCoords);

        let moveEventBox = { x: -41, y: 0 };
        const constrained = { x: -40, y: 0 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);

        moveEventBox = { x: -100, y: 0 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);
    });

    it('returns constrained if move goes: over right', () => {
        const containerCoords = { x: 0, y: 0, width: 100, height: 100 };
        const draggableCoords = { x: 40, y: 40, width: 20, height: 20 };
        const rectCoords = { x: 0, y: 0, width: 20, height: 20 };
        const [container, draggable] = createDomFixture(containerCoords, draggableCoords, rectCoords);

        let moveEventBox = { x: 41, y: 0 };
        const constrained = { x: 40, y: 0 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);

        moveEventBox = { x: 100, y: 0 };
        expect(constrainSvgDragMoveBox(draggable, container, moveEventBox)).toEqual(constrained);
    });
});

describe('setupDraggableClickable', () => {
    function createDomFixture() {
        const root = document.createElement('div');
        root.id = 'drawing';
        root.class = 'fixture';
        document.body.appendChild(root);
        const rootSvg = SVG().addTo('#drawing');
        const target = rootSvg.group();
        const nestedClickTarget = target.group();

        target.bbox = () => ({
            x: 0,
            y: 0,
            width: 100,
            height: 100
        });
        target.point = () => ({
            x: 0,
            y: 0
        });
        nestedClickTarget.bbox = () => ({
            x: 0,
            y: 0,
            width: 100,
            height: 100
        });
        nestedClickTarget.point = () => ({
            x: 0,
            y: 0
        });

        return [target, nestedClickTarget];
    }

    function callWithSpyHandlers(target, nestedClickTarget) {
        const beforeActionSpy = vi.fn();
        const dragStartSpy = vi.fn();
        const dragMoveSpy = vi.fn();
        const dragStopSpy = vi.fn();
        const clickSpy = vi.fn();
        const nestedClickSpy = vi.fn();
        setupDraggableClickable(target, nestedClickTarget, {
            handleBeforeAction: beforeActionSpy,
            handleDragStart: dragStartSpy,
            handleDragMove: dragMoveSpy,
            handleDragStop: dragStopSpy,
            handleClick: clickSpy,
            handleNestedClick: nestedClickSpy
        });
        return [beforeActionSpy, dragStartSpy, dragMoveSpy, dragStopSpy, clickSpy, nestedClickSpy];
    }

    afterEach(() => {
        Array.from(document.querySelectorAll('.fixture')).forEach(elt => elt.remove());
    });

    it('detects click', () => {
        const [target, nestedClickTarget] = createDomFixture();
        const [beforeActionSpy, dragStartSpy, dragMoveSpy, dragStopSpy, clickSpy, nestedClickSpy] = callWithSpyHandlers(
            target,
            nestedClickTarget
        );

        fireEvent.mouseDown(target.node, { clientX: 10, clientY: 10, buttons: 1 });
        fireEvent.mouseMove(window, { clientX: 10, clientY: 10, buttons: 1 });
        fireEvent.mouseUp(window, { clientX: 10, clientY: 10, buttons: 1 });

        expect(beforeActionSpy).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(nestedClickSpy).not.toHaveBeenCalled();
        expect(dragStartSpy).not.toHaveBeenCalled();
        expect(dragMoveSpy).not.toHaveBeenCalled();
        expect(dragStopSpy).not.toHaveBeenCalled();
    });

    it('detects click on nested target', () => {
        const [target, nestedClickTarget] = createDomFixture();
        const [beforeActionSpy, dragStartSpy, dragMoveSpy, dragStopSpy, clickSpy, nestedClickSpy] = callWithSpyHandlers(
            target,
            nestedClickTarget
        );

        fireEvent.mouseDown(nestedClickTarget.node, { clientX: 10, clientY: 10, buttons: 1 });
        fireEvent.mouseMove(window, { clientX: 10, clientY: 10, buttons: 1 });
        fireEvent.mouseUp(window, { clientX: 10, clientY: 10, buttons: 1 });

        expect(beforeActionSpy).toHaveBeenCalled();
        expect(nestedClickSpy).toHaveBeenCalled();
        expect(clickSpy).not.toHaveBeenCalled();
        expect(dragStartSpy).not.toHaveBeenCalled();
        expect(dragMoveSpy).not.toHaveBeenCalled();
        expect(dragStopSpy).not.toHaveBeenCalled();
    });

    it('detects drag', () => {
        const [target, nestedClickTarget] = createDomFixture();
        const [beforeActionSpy, dragStartSpy, dragMoveSpy, dragStopSpy, clickSpy, nestedClickSpy] = callWithSpyHandlers(
            target,
            nestedClickTarget
        );

        fireEvent.mouseDown(target.node, { clientX: 10, clientY: 10, buttons: 1 });
        fireEvent.mouseMove(window, { clientX: 90, clientY: 90, buttons: 1 });
        fireEvent.mouseUp(window, { clientX: 90, clientY: 90, buttons: 1 });

        expect(beforeActionSpy).toHaveBeenCalled();
        expect(dragStartSpy).toHaveBeenCalled();
        expect(dragMoveSpy).toHaveBeenCalled();
        expect(dragStopSpy).toHaveBeenCalled();
        expect(nestedClickSpy).not.toHaveBeenCalled();
        expect(clickSpy).not.toHaveBeenCalled();
    });

    it('detects drag starting on nested target', () => {
        const [target, nestedClickTarget] = createDomFixture();
        const [beforeActionSpy, dragStartSpy, dragMoveSpy, dragStopSpy, clickSpy, nestedClickSpy] = callWithSpyHandlers(
            target,
            nestedClickTarget
        );

        fireEvent.mouseDown(nestedClickTarget.node, { clientX: 10, clientY: 10, buttons: 1 });
        fireEvent.mouseMove(window, { clientX: 90, clientY: 90, buttons: 1 });
        fireEvent.mouseUp(window, { clientX: 90, clientY: 90, buttons: 1 });

        expect(beforeActionSpy).toHaveBeenCalled();
        expect(dragStartSpy).toHaveBeenCalled();
        expect(dragMoveSpy).toHaveBeenCalled();
        expect(dragStopSpy).toHaveBeenCalled();
        expect(nestedClickSpy).not.toHaveBeenCalled();
        expect(clickSpy).not.toHaveBeenCalled();
    });

    it('does not detect drag if threshold not met', () => {
        const [target, nestedClickTarget] = createDomFixture();
        const [, dragStartSpy, , , clickSpy] = callWithSpyHandlers(target, nestedClickTarget);

        fireEvent.mouseDown(target.node, { clientX: 10, clientY: 10, buttons: 1 });
        fireEvent.mouseMove(window, { clientX: 11, clientY: 11, buttons: 1 });
        fireEvent.mouseUp(window, { clientX: 11, clientY: 11, buttons: 1 });

        expect(dragStartSpy).not.toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        dragStartSpy.mockClear();
        clickSpy.mockClear();

        fireEvent.mouseDown(target.node, { clientX: 10, clientY: 10, buttons: 1 });
        fireEvent.mouseMove(window, { clientX: 101, clientY: 101, buttons: 1 });
        fireEvent.mouseUp(window, { clientX: 101, clientY: 101, buttons: 1 });

        expect(dragStartSpy).toHaveBeenCalled();
        expect(clickSpy).not.toHaveBeenCalled();
        dragStartSpy.mockClear();
        clickSpy.mockClear();

        fireEvent.mouseDown(target.node, { clientX: 10, clientY: 10, buttons: 1 });
        fireEvent.mouseMove(window, { clientX: 11, clientY: 11, buttons: 1 });
        return new Promise(resolve => setTimeout(resolve, 250)).then(() => {
            fireEvent.mouseUp(window, { clientX: 11, clientY: 11, buttons: 1 });

            expect(dragStartSpy).toHaveBeenCalled();
            expect(clickSpy).not.toHaveBeenCalled();
        });
    });
});
