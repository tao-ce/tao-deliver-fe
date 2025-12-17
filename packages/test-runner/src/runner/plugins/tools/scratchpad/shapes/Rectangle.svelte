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
     * @property {Number} x rectangle top-left x-axis
     * @property {Number} y rectangle top-left y-axis
     * @property {Number} width rectangle width
     * @property {Number} height rectangle height
     */

    /**
     * Component is used to draw/display ellipse (oval)
     * @property {DrawingGeometry} [drawingGeometry] details of draw start
     * @property {Geometry} [geometry] individual shape props
     * @property {Boolean} [selected=false] selected state of the shape
     * @fires 'finishDraw' when drawing has finished
     */

    const bboxOffset = remToPx(0.125);
    const hitboxOffset = remToPx(1);
    const minSize = remToPx(1);
    const dispatch = createEventDispatcher();

    export let drawingGeometry;
    export let geometry;
    export let selected;

    let x;
    let y;
    let width;
    let height;
    let startX;
    let startY;
    let initialPointerX;
    let initialPointerY;
    let resizeInitialWidth;
    let resizeInitialHeight;

    if (drawingGeometry) {
        startX = drawingGeometry.drawAreaStartX;
        startY = drawingGeometry.drawAreaStartY;
        initialPointerX = drawingGeometry.initialPointerX;
        initialPointerY = drawingGeometry.initialPointerY;
        width = 0;
        height = 0;

        window.addEventListener('mousemove', draw);
        window.addEventListener('touchmove', draw);
        window.addEventListener('mouseup', finishDraw);
        window.addEventListener('touchend', finishDraw);
    } else if (geometry) {
        x = geometry.x;
        y = geometry.y;
        width = geometry.width;
        height = geometry.height;
    }

    /**
     * Calculates shape props based on mousemove offset related to initial point
     * @param {Event} e
     */
    function draw(e) {
        if (!(e.buttons === 1 || (e.changedTouches && e.changedTouches.length === 1))) {
            finishDraw();
        } else {
            const eventCoords = getPointerEventCoords(e);
            width = eventCoords.x - initialPointerX;
            height = eventCoords.y - initialPointerY;
            if (width > 0) {
                x = startX;
            } else {
                width = Math.abs(width);
                x = startX - width;
            }
            if (height > 0) {
                y = startY;
            } else {
                height = Math.abs(height);
                y = startY - height;
            }
        }
    }

    /**
     * Removes event listeners
     * @fires finishDraw
     */
    function finishDraw() {
        removeWindowEventListeners();
        if (width >= minSize && height >= minSize) {
            dispatch('finishDraw', { type: 'rectangle', geometry: { x, y, width, height } });
        } else {
            dispatch('finishDraw', false);
        }
    }

    /**
     * Handles start of resizing
     */
    function handleStartResizing() {
        resizeInitialWidth = width;
        resizeInitialHeight = height;
    }

    /**
     * Handles resize event
     * @param {CustomEvent} e
     */
    function handleResize(e) {
        const { dx, dy } = e.detail;
        width = Math.max(resizeInitialWidth + dx, minSize);
        height = Math.max(resizeInitialHeight + dy, minSize);
    }

    /**
     * Handles finishResizing event
     */
    function handleFinishResizing() {
        dispatch('finishResizing', { geometry: { x, y, width, height } });
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

    onDestroy(removeWindowEventListeners);
</script>

<rect class="shape" class:too-small={width < minSize || height < minSize} {x} {y} {width} {height} />
{#if typeof x !== 'undefined' && typeof y !== 'undefined'}
    <rect
        class="hitbox"
        x={x - bboxOffset - hitboxOffset}
        y={y - bboxOffset - hitboxOffset}
        width={width + (bboxOffset + hitboxOffset) * 2}
        height={height + (bboxOffset + hitboxOffset) * 2} />
    <rect
        class="bounding"
        x={x - bboxOffset}
        y={y - bboxOffset}
        width={width + bboxOffset * 2}
        height={height + bboxOffset * 2} />
{/if}
{#if selected}
    <ResizeAnchor
        cx={x + width - bboxOffset}
        cy={y + height - bboxOffset}
        on:startResizing={handleStartResizing}
        on:resize={handleResize}
        on:finishResizing={handleFinishResizing} />
{/if}
