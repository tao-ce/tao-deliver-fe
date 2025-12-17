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
     * @property {Array[]} points bi-directional array of path points
     * @property {Number} size stroke size
     * @property {Number} x bounding box x
     * @property {Number} y bounding box y
     * @property {Number} width bounding box width
     * @property {Number} height bounding box height
     */

    /**
     * Component is used to draw/display path (by brush tool)
     * @property {DrawingGeometry} [drawingGeometry] details of draw start
     * @property {Geometry} [geometry] individual shape props
     * @property {Boolean} [selected=false] selected state of the shape
     * @fires 'finishDraw' when drawing has finished
     */

    const dispatch = createEventDispatcher();
    const bboxOffset = remToPx(0.125);
    const hitboxOffset = remToPx(1);
    const bufferSize = 8;

    export let drawingGeometry;
    export let geometry;
    export let selected;

    let d;
    let x;
    let y;
    let width = 0;
    let height = 0;
    let pathElement;
    let dx;
    let dy;
    let size;
    let points = [];
    let startX;
    let startY;
    let initialPointerX;
    let initialPointerY;
    let buffer = [];
    let tooSmall = false;

    if (drawingGeometry) {
        startX = drawingGeometry.drawAreaStartX;
        startY = drawingGeometry.drawAreaStartY;
        points.push([startX, startY]);
        initialPointerX = drawingGeometry.initialPointerX;
        initialPointerY = drawingGeometry.initialPointerY;
        size = drawingGeometry.size;

        d = `M ${startX} ${startY}`;

        tooSmall = true;
        x = startX;
        y = startY;
        buffer.push([x, y]);

        window.addEventListener('mousemove', draw);
        window.addEventListener('touchmove', draw);
        window.addEventListener('mouseup', finishDraw);
        window.addEventListener('touchend', finishDraw);
    } else if (geometry) {
        size = geometry.size;
        d = getD(geometry.points);
        x = geometry.x;
        y = geometry.y;
        width = geometry.width;
        height = geometry.height;
    }

    /**
     * Creates prop value for path's `d` attribute
     * @param {Array[]} pointsArray
     * @returns {String}
     */
    function getD(pointsArray) {
        return `M ${pointsArray.map(point => `${point[0]} ${point[1]}`).join(' L ')}`;
    }

    /**
     * Updates the points buffer with event point
     * @param {Event} e
     */
    function draw(e) {
        if (!(e.buttons === 1 || (e.changedTouches && e.changedTouches.length === 1))) {
            finishDraw();
        } else {
            const eventCoords = getPointerEventCoords(e);
            dx = eventCoords.x - initialPointerX;
            dy = eventCoords.y - initialPointerY;
            //once we go over 1 x size of offset we start drawing
            if (tooSmall && Math.sqrt(dx * dx + dy * dy) >= size * 2) {
                tooSmall = false;
            }
            const newPoint = [startX + dx, startY + dy];
            appendToBuffer(newPoint);
            updatePoints();
        }
    }

    /**
     * Appends new point to buffer, mutates buffer
     * @param {Array} point
     */
    function appendToBuffer(point) {
        buffer.push(point);
        while (buffer.length > bufferSize) {
            buffer.shift();
        }
    }

    /**
     * Calculates the buffer average point
     * @returns {Array} point
     */
    function getAveragePoint() {
        const len = buffer.length;
        return [
            buffer.reduce((acc, point) => acc + point[0], 0) / len,
            buffer.reduce((acc, point) => acc + point[1], 0) / len
        ];
    }

    /**
     * Updates points array with averaged point, updates path's d prop
     */
    function updatePoints() {
        let point = getAveragePoint();

        if (point) {
            points.push(point);
            d += ` L ${point[0]} ${point[1]}`;
        }
    }

    /**
     * Removes event listeners, calculates the bounding box props
     * @fires finishDraw
     */
    function finishDraw() {
        removeWindowEventListeners();
        if (tooSmall) {
            dispatch('finishDraw', false);
        } else {
            const bbox = pathElement.getBBox();
            x = bbox.x;
            y = bbox.y;
            width = bbox.width;
            height = bbox.height;
            dispatch('finishDraw', { type: 'brush', geometry: { points, size, x, y, width, height } });
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

    onDestroy(removeWindowEventListeners);
</script>

<path class="shape" bind:this={pathElement} stroke-width={size} class:too-small={tooSmall} {d} />
{#if typeof x !== 'undefined' && typeof y !== 'undefined' && typeof width !== 'undefined' && typeof height !== 'undefined'}
    <rect
        class="hitbox"
        x={x - size / 2 - bboxOffset - hitboxOffset}
        y={y - size / 2 - bboxOffset - hitboxOffset}
        width={width + size + (bboxOffset + hitboxOffset) * 2}
        height={height + size + (bboxOffset + hitboxOffset) * 2} />
    <rect
        class="bounding"
        x={x - size / 2 - bboxOffset}
        y={y - size / 2 - bboxOffset}
        width={width + size + bboxOffset * 2}
        height={height + size + bboxOffset * 2} />
{/if}
{#if selected}
    <ResizeAnchor cx={x + width + size / 2 + bboxOffset} cy={y + height + size / 2 + bboxOffset} />
{/if}
