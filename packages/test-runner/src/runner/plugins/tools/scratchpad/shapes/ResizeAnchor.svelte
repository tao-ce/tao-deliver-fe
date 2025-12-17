<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;

    import { remToPx } from '@oat-sa-private/ui-core';
    import { createEventDispatcher, onDestroy } from 'svelte';

    /**
     * Component used to display resize anchor square
     * @property {Number} cx center x-axis
     * @property {Number} cy center y-axis
     */

    const dispatch = createEventDispatcher();

    const rectWidth = remToPx(0.625);
    const rectOffset = remToPx(0.625) / 2;

    const hitboxWidth = remToPx(5.5);
    const hitboxOffset = remToPx(5.5) / 2;

    export let cx;
    export let cy;

    let resizing = false;
    let startX;
    let startY;

    function startResizing(e) {
        resizing = true;
        changeBodyCursor();
        dispatch('startResizing');
        startX = e.clientX;
        startY = e.clientY;
        attachWindowEventListeners();
        e.stopPropagation();
    }

    function finishResizing(e) {
        resizing = false;
        changeBodyCursor();
        dispatch('finishResizing');
        detachWindowEventListeners();
        e && e.stopPropagation();
    }

    function resize(e) {
        if (!(e.buttons === 1 || (e.changedTouches && e.changedTouches.length === 1))) {
            finishResizing();
        } else {
            const { clientX, clientY } = e;
            dispatch('resize', { dx: clientX - startX, dy: clientY - startY });
        }
        e.stopPropagation();
    }

    function changeBodyCursor() {
        if (resizing) {
            document.querySelector('body').classList.add('scratchpad-resizing');
        } else {
            document.querySelector('body').classList.remove('scratchpad-resizing');
        }
    }

    function attachWindowEventListeners() {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', finishResizing);
    }

    function detachWindowEventListeners() {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', finishResizing);
    }

    onDestroy(() => {
        detachWindowEventListeners();
    });
</script>

<style>
    .resize-hitbox {
        fill: transparent;
        stroke: none;
        &:hover {
            cursor: nwse-resize;
        }
    }
    .resize-square {
        pointer-events: none;
        fill: var(--color-bg-default);
        stroke: var(--color-border-default);
        stroke-width: 0.125rem;
    }
    :global(body.scratchpad-resizing) {
        cursor: nwse-resize;
    }
</style>

<g class="resize-hitbox-container">
    <rect class="resize-square" x={cx - rectOffset} y={cy - rectOffset} width={rectWidth} height={rectWidth} />
    <rect
        class="resize-hitbox"
        x={cx - hitboxOffset}
        y={cy - hitboxOffset}
        width={hitboxWidth}
        height={hitboxWidth}
        on:mousedown={startResizing} />
</g>
