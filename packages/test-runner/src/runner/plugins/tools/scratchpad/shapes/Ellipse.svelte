<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;

    import { getPointerEventCoords, remToPx } from '@oat-sa-private/ui-core';
    import ResizeAnchor from './ResizeAnchor.svelte';
    import { createEventDispatcher, onDestroy } from 'svelte';

    /**
     * @typedef geometry
     * @property {Number} cx ellipse center x-axis
     * @property {Number} cy ellipse center y-axis
     * @property {Number} rx ellipse x-axis radius
     * @property {Number} ry ellipse y-axis radius
     */

    /**
     * Component is used to draw/display ellipse (oval)
     * @property {DrawingGeometry} [drawingGeometry] details of draw start
     * @property {Geometry} [geometry] individual shape props
     * @property {Boolean} [selected=false] selected state of the shape
     * @fires 'finishDraw' when drawing has finished
     */

    const bboxOffset = remToPx(-0.125);
    const hitboxOffset = remToPx(1);
    const minSize = remToPx(1);
    const dispatch = createEventDispatcher();

    export let drawingGeometry;
    export let geometry;
    export let selected;

    let cx;
    let cy;
    let rx;
    let ry;
    let dx;
    let dy;
    let drawAreaStartX;
    let drawAreaStartY;
    let initialPointerX;
    let initialPointerY;
    let resizeInitialX;
    let resizeInitialY;
    let resizeInitialWidth;
    let resizeInitialHeight;

    //if we are in drawing mode, init variables and setup event listening
    if (drawingGeometry) {
        drawAreaStartX = drawingGeometry.drawAreaStartX;
        drawAreaStartY = drawingGeometry.drawAreaStartY;
        initialPointerX = drawingGeometry.initialPointerX;
        initialPointerY = drawingGeometry.initialPointerY;
        cx = drawAreaStartX;
        cy = drawAreaStartY;
        rx = 0;
        ry = 0;
        window.addEventListener('mousemove', draw);
        window.addEventListener('touchmove', draw);
        window.addEventListener('mouseup', finishDraw);
        window.addEventListener('touchend', finishDraw);
    } else if (geometry) {
        cx = geometry.cx;
        cy = geometry.cy;
        rx = geometry.rx;
        ry = geometry.ry;
    }

    /**
     * Calculates shape props based on mousemove offset related to initial point
     * @param {Event} e
     */
    function draw(e) {
        //check we are operating with left mouse button or single touch
        if (!(e.buttons === 1 || (e.changedTouches && e.changedTouches.length === 1))) {
            finishDraw();
        } else {
            const { x, y } = getPointerEventCoords(e);
            dx = x - initialPointerX;
            dy = y - initialPointerY;
            cx = drawAreaStartX + dx / 2;
            cy = drawAreaStartY + dy / 2;
            rx = Math.abs(dx) / 2;
            ry = Math.abs(dy) / 2;
        }
    }

    /**
     * Finishes the drawing, removes event listeners
     * @fires finishDraw
     */
    function finishDraw() {
        removeWindowEventListeners();
        if (rx * 2 >= minSize && ry * 2 >= minSize) {
            dispatch('finishDraw', { type: 'oval', geometry: { cx, cy, rx, ry } });
        } else {
            dispatch('finishDraw', false);
        }
    }

    /**
     * Removes attached event listeners from window
     */
    function removeWindowEventListeners() {
        window.removeEventListener('mousemove', draw);
        window.removeEventListener('touchmove', draw);
        window.removeEventListener('mouseup', finishDraw);
        window.removeEventListener('touchend', finishDraw);
    }

    /**
     * Handles start of resizing
     */
    function handleStartResizing() {
        resizeInitialX = cx - rx;
        resizeInitialY = cy - ry;
        resizeInitialWidth = 2 * rx;
        resizeInitialHeight = 2 * ry;
    }

    /**
     * Handles resize event
     * @param {CustomEvent} e
     */
    function handleResize(e) {
        dx = e.detail.dx;
        dy = e.detail.dy;
        const newWidth = Math.max(resizeInitialWidth + dx, minSize);
        const newHeight = Math.max(resizeInitialHeight + dy, minSize);
        rx = newWidth / 2;
        ry = newHeight / 2;
        cx = resizeInitialX + newWidth / 2;
        cy = resizeInitialY + newHeight / 2;
    }

    /**
     * Handles finishResizing event
     */
    function handleFinishResizing() {
        dispatch('finishResizing', { geometry: { cx, cy, rx, ry } });
    }

    onDestroy(removeWindowEventListeners);
</script>

<ellipse class="shape" class:too-small={rx * 2 < minSize || ry * 2 < minSize} {cx} {cy} {rx} {ry} />
<rect
    class="hitbox"
    x={cx - rx + bboxOffset - hitboxOffset}
    y={cy - ry + bboxOffset - hitboxOffset}
    width={(rx - bboxOffset + hitboxOffset) * 2}
    height={(ry - bboxOffset + hitboxOffset) * 2} />
{#if typeof cx !== 'undefined' && typeof cy !== 'undefined' && rx !== 'undefined' && ry !== 'undefined'}
    <rect
        class="bounding"
        x={cx - rx + bboxOffset}
        y={cy - ry + bboxOffset}
        width={(rx - bboxOffset) * 2}
        height={(ry - bboxOffset) * 2} />
{/if}
{#if selected}
    <ResizeAnchor
        cx={cx + rx - bboxOffset}
        cy={cy + ry - bboxOffset}
        on:startResizing={handleStartResizing}
        on:resize={handleResize}
        on:finishResizing={handleFinishResizing} />
{/if}
