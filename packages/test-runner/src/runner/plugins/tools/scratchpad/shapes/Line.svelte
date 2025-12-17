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
     * @property {Number} x1 line start x-axis
     * @property {Number} y1 line start y-axis
     * @property {Number} x2 line end x-axis
     * @property {Number} y2 line end y-axis
     */

    /**
     * Component is used to draw/display ellipse (oval)
     * @property {DrawingGeometry} [drawingGeometry] details of draw start
     * @property {Geometry} [geometry] individual shape props
     * @property {Boolean} [selected=false] selected state of the shape
     * @fires 'finishDraw' when drawing has finished
     */

    const dispatch = createEventDispatcher();
    const minSize = remToPx(5.5);

    export let drawingGeometry;
    export let geometry;
    export let selected;

    let x1;
    let y1;
    let x2;
    let y2;
    let dx;
    let dy;
    let initialPointerX;
    let initialPointerY;
    let isDragDraw = false;
    let isTouching = false; // working on touching device

    if (drawingGeometry) {
        attachInitialClickListeners();
        attachInitialDragOffsetListeners();
    } else if (geometry) {
        x1 = geometry.x1;
        y1 = geometry.y1;
        x2 = geometry.x2;
        y2 = geometry.y2;
    }

    /**
     * Attaches mouseup/touchend listeners to detect start drawing by click
     */
    function attachInitialClickListeners() {
        window.addEventListener('mouseup', startDraw);
        window.addEventListener('touchend', startDraw);
        window.addEventListener('touchstart', enableTouchMode);
    }

    /**
     * Detaches mouseup/touchend listeners to detect start drawing by drag
     */
    function detachInitialClickListeners() {
        window.removeEventListener('mouseup', startDraw);
        window.removeEventListener('touchend', startDraw);
        window.removeEventListener('touchstart', enableTouchMode);
    }

    /**
     * Attaches mousemove/touchmove listeners to detect start drawing by drag
     */
    function attachInitialDragOffsetListeners() {
        window.addEventListener('mousemove', checkStartDragDistance);
        window.addEventListener('touchmove', checkStartDragDistance);
    }

    /**
     * Detaches mousemove/touchmove listeners to detect start drawing by drag
     */
    function detachInitialDragOffsetListeners() {
        window.removeEventListener('mousemove', checkStartDragDistance);
        window.removeEventListener('touchmove', checkStartDragDistance);
    }

    /**
     * Attaches mousemove/touchmove draw listeners
     */
    function attachDrawListeners() {
        window.addEventListener('mousemove', draw);
        window.addEventListener('touchmove', draw);
    }

    /**
     * Detaches mousemove/touchmove draw listeners
     */
    function detachDrawListeners() {
        window.removeEventListener('mousemove', draw);
        window.removeEventListener('touchmove', draw);
    }

    /**
     * Switch to touching device flow
     */
    function enableTouchMode() {
        isTouching = true;
    }

    /**
     * Checks the dragged distance to allow drawing by dragging
     * @param {Event} e
     */
    function checkStartDragDistance(e) {
        const { x, y } = getPointerEventCoords(e);
        if (
            Math.abs(x - drawingGeometry.initialPointerX) > minSize ||
            Math.abs(y - drawingGeometry.initialPointerY) > minSize
        ) {
            isDragDraw = true;
            startDraw();
        }
    }

    /**
     * Does initialization of variables, event listeners setup
     */
    function startDraw() {
        detachInitialDragOffsetListeners();
        detachInitialClickListeners();
        x1 = drawingGeometry.drawAreaStartX;
        y1 = drawingGeometry.drawAreaStartY;
        x2 = x1 + minSize;
        y2 = y1;
        initialPointerX = drawingGeometry.initialPointerX;
        initialPointerY = drawingGeometry.initialPointerY;
        attachDrawListeners();
        if (isDragDraw) {
            window.addEventListener('mouseup', finishDraw);
            window.addEventListener('touchend', finishDraw);
        } else {
            //postpone attaching event listener as because it is handled immediately
            //after mouseup is fired (handler is attached in attachInitialClickListeners)
            setTimeout(() => {
                window.addEventListener('mouseup', finishDraw);
                window.addEventListener('touchend', finishDraw);
            }, 100);
        }
    }

    /**
     * Calculates shape props based on starting point and offset
     * @param {Event} e
     */
    function draw(e) {
        const getLength = (x, y) => Math.sqrt(x * x + y * y);
        const getNormal = (x, y) => [x / getLength(x, y), y / getLength(x, y)];

        const { x, y } = getPointerEventCoords(e);
        dx = x - initialPointerX;
        dy = y - initialPointerY;
        if (dx === 0 && dy === 0) {
            x2 = x1 + minSize;
            y2 = y1 + minSize;
        } else if (getLength(dx, dy) < minSize) {
            const normal = getNormal(dx, dy);
            x2 = x1 + normal[0] * minSize;
            y2 = y1 + normal[1] * minSize;
        } else {
            x2 = x1 + dx;
            y2 = y1 + dy;
        }
        e.preventDefault();
    }

    /**
     * Removes event listeners
     * @param {Event} e
     * @fires finishDraw
     */
    function finishDraw(e) {
        // tap + tap require to draw line on last tap
        if (isTouching) {
            draw(e);
            isTouching = false;
        }
        dispatch('finishDraw', { type: 'line', geometry: { x1, y1, x2, y2 } });

        removeWindowEventListeners();
    }

    /**
     * Removes attached event listeners from window
     */
    function removeWindowEventListeners() {
        //call all remove listeners for safety
        detachDrawListeners();
        detachInitialClickListeners();
        detachInitialDragOffsetListeners();
        window.removeEventListener('mouseup', finishDraw);
        window.removeEventListener('touchend', finishDraw);
    }

    onDestroy(removeWindowEventListeners);
</script>

<line class="shape" {x1} {y1} {x2} {y2} />
<line class="line-hitbox" {x1} {y1} {x2} {y2} />
<line class="bounding" {x1} {y1} {x2} {y2} />
{#if selected}
    <ResizeAnchor cx={x1} cy={y1} />
    <ResizeAnchor cx={x2} cy={y2} />
{/if}
