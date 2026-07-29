<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2026 (original work) Open Assessment Technologies SA ;

    import { onMount, createEventDispatcher } from 'svelte';
    import { SVG } from '@svgdotjs/svg.js';
    import { minSizePx } from '../util/shapeDefaults';
    import { iconList } from '@oat-sa-private/ui-identity';
    import { remToPx } from '@oat-sa-private/ui-core';

    /**
     * Component intended to render line between two hotspots
     *
     * @property {Number[]} activeLineStart - x and y coordinates of line start
     * @property {Number[]} activeLineEnd - x and y coordinates of line end
     * @property {Boolean} disabled - disabled state of line
     * @property {Boolean} selected - selected state of line
     * @property {String} ariaLabel - aria-label
     * @property {Boolean} removable - draw or not button in center of line
     * @property {String} tabindex
     * @property {Boolean} disablePointerEvents - prevent pointer events on the line container
     * @property {Boolean} isArrow - draw an arrow head at the end of the line
     * @property {Number[]|undefined} arrowStart - custom arrow tail coordinates [x, y]
     * @property {Number[]|undefined} arrowEnd - custom arrow head coordinates [x, y]
     *
     * @fires 'keydown'
     * @fires 'keyup'
     * @fires 'mount'
     * @fires 'remove'
     * @fires 'lineClick'
     */
    export let activeLineStart;
    export let activeLineEnd;
    export let disabled = false;
    export let selected = false;
    export let ariaLabel;
    export let removable = true;
    export let tabindex = -1;
    export let disablePointerEvents = false;
    export let isArrow = false;
    export let arrowStart;
    export let arrowEnd;

    const dispatch = createEventDispatcher();
    const removerIcon = iconList['remove-12'];

    let groupElement;
    let svgGroup;

    // cover all cases for rendering association line by click or while drag or on resize
    $: if (svgGroup && activeLineStart && activeLineEnd) {
        draw(svgGroup);
    }

    onMount(() => {
        svgGroup = SVG(groupElement);
        dispatch('mount', { svgGroup });
    });

    /**
     * Draw (or re-draw) the dynamic elements inside the <g>
     * @param {DOMElement} groupEl
     * @fires draw
     */
    function draw(groupEl) {
        groupEl.clear();
        if (activeLineStart && activeLineStart.length && activeLineEnd && activeLineEnd.length) {
            //coords of bottom left activeLineStart point
            const startPointX = Math.min(activeLineStart[0], activeLineEnd[0]);
            const startPointY = Math.min(activeLineStart[1], activeLineEnd[1]);
            //center of line
            const cx = startPointX + Math.abs(activeLineStart[0] - activeLineEnd[0]) / 2;
            const cy = startPointY + Math.abs(activeLineStart[1] - activeLineEnd[1]) / 2;
            //outer line
            groupEl.line().plot([activeLineStart, activeLineEnd]).addClass('shape-outer-line');
            //line
            groupEl.line().plot([activeLineStart, activeLineEnd]).addClass('shape-line');
            //hover area line should be over other lines
            groupEl.line().plot([activeLineStart, activeLineEnd]).addClass('shape-line-hover');
            if (isArrow) {
                const fromPoint = arrowStart || activeLineStart;
                const toPoint = arrowEnd || activeLineEnd;
                if (fromPoint && toPoint) {
                    drawArrowHead(groupEl, fromPoint, toPoint);
                }
            }
            //remove button
            if (removable) {
                const iconGroup = groupEl
                    .group()
                    .addClass('button-container')
                    .attr({ tabindex, 'aria-label': ariaLabel, 'aria-disabled': disabled });
                // focus outline
                iconGroup.circle(remToPx(4.25)).attr({ cx, cy }).addClass('remove-button-dashed-outline');
                // main button element
                iconGroup.circle(remToPx(3.25)).addClass('remove-button').cx(cx).cy(cy);
                // button icon
                const iconElement = iconGroup
                    .nested()
                    .width(removerIcon.size)
                    .height(removerIcon.size)
                    .x(cx - removerIcon.size / 2)
                    .y(cy - removerIcon.size / 2)
                    .viewbox(0, 0, removerIcon.size, removerIcon.size);
                for (let path of removerIcon.paths) {
                    iconElement.path(path);
                }
                iconElement.front();
                // clickable hitbox
                iconGroup.rect(minSizePx, minSizePx).addClass('remove-button-hitbox').cx(cx).cy(cy);
            }
            dispatch('draw', { svgGroup });
        }
    }

    function drawArrowHead(groupEl, fromPoint, toPoint) {
        const dx = toPoint[0] - fromPoint[0];
        const dy = toPoint[1] - fromPoint[1];
        const length = Math.hypot(dx, dy);
        if (!length) {
            return;
        }
        const arrowLength = remToPx(3);
        const arrowWidth = remToPx(2);
        const ux = dx / length;
        const uy = dy / length;
        const baseX = toPoint[0] - ux * arrowLength;
        const baseY = toPoint[1] - uy * arrowLength;
        const perpX = -uy;
        const perpY = ux;
        const leftX = baseX + perpX * (arrowWidth / 2);
        const leftY = baseY + perpY * (arrowWidth / 2);
        const rightX = baseX - perpX * (arrowWidth / 2);
        const rightY = baseY - perpY * (arrowWidth / 2);
        groupEl
            .polygon([
                [toPoint[0], toPoint[1]],
                [leftX, leftY],
                [rightX, rightY]
            ])
            .addClass('shape-arrow-head');
    }

    /**
     * Handle click/touch on line
     * @param {Event} e
     */
    function handleClick(e) {
        if (disabled) {
            return;
        }
        if (e.target.classList.contains('remove-button-hitbox')) {
            dispatch('remove');
        } else {
            dispatch('lineClick');
        }
        e.stopPropagation();
    }
</script>

<style>
    .association-line {
        &.disable-pointer-events {
            pointer-events: none;
        }
        &:hover {
            cursor: pointer;
        }
        & :global(.shape-line-hover) {
            fill: transparent;
            stroke: var(--color-gs-light);
            opacity: 0;
            stroke-width: 3.5rem;
            stroke-linecap: round;
        }
        & :global(.remove-button-hitbox) {
            fill: transparent;
        }
        &:not(.selected) {
            & :global(.button-container) {
                visibility: hidden;
            }
        }
        & :global(.remove-button) {
            fill: var(--color-gs-light-hover-bg);
            stroke-width: 0.25rem;
            stroke: var(--color-gs-dark);
        }
        & :global(.button-container svg) {
            color: var(--color-gs-dark);
        }
        & :global(.shape-outer-line) {
            fill: transparent;
            stroke-width: 1rem;
            stroke: var(--color-gs-light);
            stroke-linecap: round;
            filter: var(--shadow-filter-url);
        }
        & :global(.shape-line) {
            fill: transparent;
            stroke-width: 0.25rem;
            stroke: var(--color-brand-hover);
            stroke-linecap: round;
        }
        & :global(.shape-arrow-head) {
            fill: var(--color-brand-hover);
            stroke: var(--color-gs-light);
            stroke-width: 0.5rem;
            stroke-linejoin: round;
        }
        & :global(.remove-button-dashed-outline) {
            fill: transparent;
            stroke: transparent;
            stroke-width: 0.25rem;
            stroke-dasharray: 2;
        }
        & :global(.button-container:focus-visible) {
            & :global(.remove-button-dashed-outline) {
                stroke: var(--color-brand);
            }
        }
        & :global(g:focus),
        & :global(g:focus-visible) {
            outline: none;
        }
    }
</style>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<g
    class="association-line"
    class:selected
    class:disabled
    class:disable-pointer-events={disablePointerEvents}
    bind:this={groupElement}
    on:click={handleClick}
    on:keydown
    on:keyup />
