<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2024 (original work) Open Assessment Technologies SA ;

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

    /**
     * Handle click/touch on line
     * @param {Event} e
     */
    function handleClick(e) {
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

<g
    class="association-line"
    class:selected
    class:disabled
    class:disable-pointer-events={disablePointerEvents}
    bind:this={groupElement}
    on:click={!disabled && handleClick}
    on:keydown
    on:keyup />
