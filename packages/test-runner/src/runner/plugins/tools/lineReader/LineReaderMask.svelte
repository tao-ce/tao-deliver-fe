<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
    import { onMount, createEventDispatcher } from 'svelte';
    import { Icon } from '@oat-sa-private/ui-elements';
    import { remToPx } from '@oat-sa-private/ui-core/dom/sizing.js';
    import { defaultGapSize, maxGapSize, minGapSize } from './sizes.js';
    import arrowKeys from './arrowKeys.js';
    import dragEvents from './dragEvents.js';
    import { __ } from '@oat-sa-private/ui-core';

    /**
     * @typedef ViewportPoint
     * @property {number} x
     * @property {number} y
     */

    const dispatch = createEventDispatcher();

    export let gapSize = defaultGapSize;
    export let gapYOffset = 0;

    let root = null;
    let gap = null;
    let gapControls = null;
    let gapMoveControl = null;
    let gapResizeControl = null;

    let rootYOffset = 0;
    let maxSafeGapYOffset = 0;

    let enableCursorTracking = true;

    $: windowMouseMoveHandler = enableCursorTracking
        ? handleMouseMove
        : void 0;

    onMount(() => {
        updateOffsets(gapSize);
    });

    function handleWindowResize() {
        updateOffsets(gapSize);
        if (gapYOffset > maxSafeGapYOffset) {
            gapYOffset = maxSafeGapYOffset;
        }
    }

    /**
     * Gets new gap offset from cursor position
     * @param {ViewportPoint} cursorPosition
     * @returns {number} - new gap offset. If cursor is neither above nor below gap - returns current gap offset.
     */
    function getNewGapOffset(cursorPosition) {
        const { top, bottom } = gap.getBoundingClientRect();

        if (cursorPosition.y < top) {
            return cursorPosition.y - rootYOffset;
        } else if (cursorPosition.y > bottom) {
            return cursorPosition.y - rootYOffset - gapSize;
        } else {
            return gapYOffset;
        }
    }

    /**
     * Update gap offset within safe movement area
     * @param {number} newGapYOffset
     */
    function updateGapOffset(newGapYOffset) {
        if (newGapYOffset < 0) {
            gapYOffset = 0;
        } else if (newGapYOffset > maxSafeGapYOffset) {
            gapYOffset = maxSafeGapYOffset;
        } else {
            gapYOffset = newGapYOffset;
        }
        dispatchMove(gapYOffset);
    }

    /**
     * Update key points.
     * Should be called on window resize, on mount and on gap resize.
     * @param {number} currentGapSize
     */
    function updateOffsets(currentGapSize) {
        const {
            top: rootTop,
            height: rootHeight
        } = root.getBoundingClientRect();
        const {
            height: controlsHeight
        } = gapControls.getBoundingClientRect();
        rootYOffset = rootTop;
        maxSafeGapYOffset = rootHeight - controlsHeight - currentGapSize;
    }

    /**
     * Checks if viewport point is inside specified element
     * @param {Element} el
     * @param {ViewportPoint} viewportPoint
     * @returns {Boolean}
     */
    function isInsideElement(el, viewportPoint) {
        const { top, bottom, left, right } = el.getBoundingClientRect();
        return viewportPoint.y >= top &&
            viewportPoint.y <= bottom &&
            viewportPoint.x >= left &&
            viewportPoint.x <= right;
    }

    /**
     * Checks if current cursor position is either inside the gap or one of the controls
     * @param {ViewportPoint} cursorPosition - current cursor position
     * @returns {Boolean}
     */
    function isCursorInSafeZone(cursorPosition) {
        return isInsideElement(gap, cursorPosition) ||
        isInsideElement(gapMoveControl, cursorPosition) ||
        isInsideElement(gapResizeControl, cursorPosition);
    }

    /**
     * Toggles gap size between minGapSize, defaultGapSize and maxGapSize
     * First call will align to nearest greater value, if current gap size is equal maxGapSize
     * it'll reset it to minGapSize
     * Also shifts gap up if there's enough space to avoid moving button away from cursor
     */
    function toggleGapSize() {
        const previousGapBottomPosition = gapYOffset + gapSize;
        let newGapSize;
        if (gapSize < defaultGapSize) {
            newGapSize = defaultGapSize;
        } else if (gapSize >= defaultGapSize && gapSize < maxGapSize) {
            newGapSize = maxGapSize;
        } else {
            newGapSize = minGapSize;
        }
        updateOffsets(newGapSize);
        updateGapOffset(previousGapBottomPosition - newGapSize);
        updateGapSize(newGapSize);
    }

    /**
     * Increases gap size to nearest greater value of defaultGapSize or maxGapSize
     * @param {number} [value=remToPx(5)]
     */
    function increaseGapSize(value = remToPx(5)) {
        updateGapSize(gapSize + value);
    }

    /**
     * Decreases gap size to nearest lower value of defaultGapSize or minGapSize
     * @param {number} [value=remToPx(5)]
     */
    function decreaseGapSize(value = remToPx(5)) {
        updateGapSize(gapSize - value);
    }

    /**
     * Updates gap size to provided value
     * If value is greater than maxGapSize or less than minGapSize - one of these values is set accordingly
     * Also updates offsets to newer maxSafeGapYOffset
     * @param {number} newGapSize
     */
    function updateGapSize(newGapSize) {
        const {
            height: rootHeight
        } = root.getBoundingClientRect();
        const {
            height: controlsHeight
        } = gapControls.getBoundingClientRect();
        if (newGapSize > maxGapSize) {
            gapSize = maxGapSize;
        } else if (newGapSize < minGapSize) {
            gapSize = minGapSize;
        } else {
            gapSize = newGapSize;
        }
        updateOffsets(gapSize);
        if (gapYOffset + newGapSize > rootHeight - controlsHeight) {
            updateGapOffset(gapYOffset);
        }
        dispatchResize(gapSize);
    }

    /**
     * Decreases gap offset by value
     * @param {number} [value=remToPx(3)]
     */
    function decreaseGapOffset(value = remToPx(3)) {
        let newGapYOffset = gapYOffset - value;
        updateGapOffset(newGapYOffset);
    }

    /**
     * Increases gap offset by value
     * @param {number} [value=remToPx(3)]
     */
    function increaseGapOffset(value = remToPx(3)) {
        let newGapYOffset = gapYOffset + value;
        updateGapOffset(newGapYOffset);
    }

    /**
     * @param {CustomEvent} evt
     * @param {Object} evt.detail
     * @param {number} evt.detail.delta
     */
    function moveDragUpListener({ detail: { delta } }) {
        decreaseGapOffset(delta);
    }

    /**
     * @param {CustomEvent} evt
     * @param {Object} evt.detail
     * @param {number} evt.detail.delta
     */
    function moveDragDownListener({ detail: { delta } }) {
        increaseGapOffset(delta);
    }

    /**
     * @param {CustomEvent} evt
     * @param {Object} evt.detail
     * @param {number} evt.detail.delta
     */
    function resizeDragUpListener({ detail: { delta } }) {
        const moveDelta = delta - (gapSize - minGapSize);
        if (moveDelta > 0) {
            decreaseGapOffset(moveDelta);
        }
        decreaseGapSize(delta);
    }

    /**
     * @param {CustomEvent} evt
     * @param {Object} evt.detail
     * @param {number} evt.detail.delta
     */
    function resizeDragDownListener({ detail: { delta } }) {
        const moveDelta = delta - (maxGapSize - gapSize);
        if (moveDelta > 0) {
            increaseGapOffset(moveDelta);
        }
        increaseGapSize(delta);
    }

    /**
     * Top overlay tap handler
     * Moves gap to tap position minus offset (3rem)
     * @param {Event} evt
     * @param {Object} evt.detail
     * @param {number} evt.detail.pageY
     */
    export function handleTopOverlayTap(evt) {
        const { pageY } = evt.detail;
        updateGapOffset(pageY - rootYOffset - remToPx(3));
    }

    /**
     * Bottom overlay tap handler
     * Moves gap to tap position minus gap height and shifts to offset (3rem)
     * @param {Event} evt
     * @param {Object} evt.detail
     * @param {number} evt.detail.pageY
     */
    export function handleBottomOverlayTap(evt) {
        const { pageY } = evt.detail;
        updateGapOffset(pageY - rootYOffset - gapSize + remToPx(3));
    }

    function handleMouseMove(evt) {
        const { clientX, clientY } = evt;
        if (!isCursorInSafeZone({ x: clientX, y: clientY })) {
            const newGapOffset = getNewGapOffset({ x: clientX, y: clientY });
            updateGapOffset(newGapOffset);
        }
    }

    /**
     * Dispatch 'resize' event
     * @param {number} currentGapSize
     */
    function dispatchResize(currentGapSize) {
        dispatch('resize', {
            size: currentGapSize
        });
    }

    /**
     * Dispatch 'move' event
     * @param {number} currentGapYOffset
     */
    function dispatchMove(currentGapYOffset) {
        dispatch('move', {
            offset: currentGapYOffset
        });
    }
</script>

<style>
    :global(.line-reader-moving) {
        cursor: move;
        & :global(*) {
            /* to override selectors with higher specificity */
            cursor: move !important;
        }
    }

    :global(.line-reader-resizing) {
        cursor: ns-resize;
        & :global(*) {
            /* to override selectors with higher specificity */
            cursor: ns-resize;
        }
    }

    .line-reader {
        position: absolute;
        top: var(--testrunner-header-height);
        left: 0;
        height: calc(
            var(--window-height) -
            var(--testrunner-header-height) -
            var(--testrunner-footer-height)
        );
        width: 100%;
        pointer-events: none;
        z-index: var(--layer-3);
        overflow: hidden;
    }

    .line-reader-gap {
        position: relative;
    }

    .gap-overlay {
        position: absolute;
        left: 0;
        width: 100%;
        height: 100vh;
        background-color: hsla(212, 10%, 35%, 85%);

        &.bottom {
            top: 100%;
        }

        &.top {
            bottom: 100%;
        }
    }

    .line-reader-controls {
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        height: 5.5rem;

        &::after {
            content: '';
            display: block;
            height: 5.5rem;
            width: 5.5rem;
        }
    }

    .line-reader-control {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--color-gs-dark);
        color: var(--color-text-inverted);
        pointer-events: all;

        &:hover,
        &:focus {
            background-color: var(--color-gs-dark-secondary);
        }

        &:focus {
            @add-mixin simple-outline var(--color-bg-default), calc(var(--border-medium) * -1);
        }

        &.move {
            width: 8rem;
            cursor: move;
        }

        &.resize {
            width: 5.5rem;
            cursor: ns-resize;
        }
    }
</style>

<svelte:window
    on:resize={handleWindowResize}
    on:mousemove={windowMouseMoveHandler}
    on:touchend={() => {
        enableCursorTracking = false;
    }}
    on:mouseup={() => {
        document.body.classList.remove('line-reader-moving');
        document.body.classList.remove('line-reader-resizing');
        enableCursorTracking = true;
    }}
/>
<div
    class="line-reader not-printable"
    bind:this={root}
>
    <div
        class="line-reader-gap"
        style={`
            height: ${gapSize}px;
            transform: translateY(${gapYOffset}px);
        `}
        bind:this={gap}
    >
        <div class="gap-overlay top"></div>
        <div class="gap-overlay bottom"></div>
        <div class="line-reader-controls" bind:this={gapControls}>
            <!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-static-element-interactions -->
            <div
                class="line-reader-control resize"
                tabindex="0"
                aria-label="{__('Vertical resize cursor icon')}"
                bind:this={gapResizeControl}
                on:mousedown={() => {
                    document.body.classList.add('line-reader-resizing');
                }}
                use:arrowKeys
                on:arrowup={() => decreaseGapSize()}
                on:arrowdown={() => increaseGapSize()}
                use:dragEvents
                on:dragup={resizeDragUpListener}
                on:dragdown={resizeDragDownListener}
                on:dragpress={toggleGapSize}
            >
                <Icon name="cursor-resize-v-16" ariaHidden={true}/>
            </div>
            <!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-static-element-interactions -->
            <div
                class="line-reader-control move"
                tabindex="0"
                aria-label="{__('Draggable element handle icon')}"
                bind:this={gapMoveControl}
                on:mousedown={() => {
                    document.body.classList.add('line-reader-moving');
                }}
                use:arrowKeys
                on:arrowup={() => decreaseGapOffset()}
                on:arrowdown={() => increaseGapOffset()}
                use:dragEvents
                on:dragup={moveDragUpListener}
                on:dragdown={moveDragDownListener}
            >
                <Icon name="draggable-handle-16" ariaHidden={true}/>
            </div>
        </div>
    </div>
</div>
