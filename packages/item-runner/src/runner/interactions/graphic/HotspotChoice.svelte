<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { getActualKey, generateElementId } from '@oat-sa-private/ui-core';
    import CircleHotspotChoice from './CircleHotspotChoice.svelte';
    import EllipseHotspotChoice from './EllipseHotspotChoice.svelte';
    import RectHotspotChoice from './RectHotspotChoice.svelte';
    import PolyHotspotChoice from './PolyHotspotChoice.svelte';

    /**
     * Container component to render hotspot used by graphic implements common styles
     * for hotspots of different shapes and forwards properties to appropriated presentational components
     *
     * @property {string} key hotspot unique key
     * @property {string} shape graphical shape of hotspot
     * @property {boolean} selected selected state of hotspot
     * @property {boolean} disabled disabled state of hotspot
     * @property {number[]} coords array of hotspot's shape coordinates
     * @property {string} label text to be rendered in visual center of hotspot
     * @property {string} ariaLabel aria-label of the choice group
     * @property {boolean} invisible invisible state of hotspot
     * @property {boolean} checkmark show or not checkmark in center of shape
     * @property {boolean} targetable style for elements for which current action can be applied
     * @property {boolean} targeted style when element part of current action
     * @property {boolean} activated style for element which is activated by click/tap
     * @property {boolean} hoverable draw or not hoverable scaling
     * @property {string} instructions - instructions for assistive technology devices
     * @property {string} instructionsLang - the lang of the test taker
     */
    export let key;
    export let shape;
    export let selected = false;
    export let disabled = false;
    export let coords;
    export let label;
    export let ariaLabel;
    export let invisible = false;
    export let checkmark = true;
    export let targetable = false;
    export let targeted = false;
    export let activated = false;
    export let hoverable = true;
    export let classes = '';
    export let instructions;
    export let instructionsLang;

    const instructionsEltId = instructions && generateElementId('hotspot-choice-label');

    const shapeToComponent = Object.freeze({
        circle: CircleHotspotChoice,
        ellipse: EllipseHotspotChoice,
        rect: RectHotspotChoice,
        poly: PolyHotspotChoice
    });

    $: shapeComponent = shapeToComponent[shape];

    const dispatch = createEventDispatcher();

    /**
     * Handle choice click
     * @param {MouseEvent} event
     */
    function handleClick(event) {
        if (disabled) {
            return;
        }
        const eventData = {
            target: event.target,
            type: event.type,
            clientX: event.clientX,
            clientY: event.clientY,
            screenX: event.screenX,
            screenY: event.screenY
        };
        dispatch('change', { key, eventData });
    }

    /**
     * Handle choice keydown
     * @param {KeyboardEvent} event
     */
    function handleKeyUp(event) {
        if (disabled) {
            return;
        }
        const actualKey = getActualKey(event);
        if (actualKey === 'space' || actualKey === 'enter') {
            const eventData = {
                target: event.target,
                type: event.type,
                key: event.key
            };
            dispatch('change', { key, eventData });
            event.preventDefault();
        }
    }
    /**
     * Handle choice center (fired by polygon shape)
     * @param {CustomEvent} event
     */
    function handleCenter(event) {
        dispatch('center', { key, cx: event.detail.cx, cy: event.detail.cy });
    }
</script>

<style>
    .hotspot-choice {
        cursor: pointer;

        &:disabled {
            cursor: not-allowed;
        }
        &.disabled {
            & :global(.shape-inner-border),
            & :global(.shape-checkmark) {
                opacity: 0.5;
            }
        }

        &.targeted {
            & :global(.shape-inner-border),
            & :global(g.selected > .shape-inner-border) {
                stroke-width: 0.5rem;
                stroke: var(--color-brand);
            }
        }

        &.activated {
            & :global(.shape-inner-border),
            & :global(g.selected > .shape-inner-border) {
                stroke-width: 0.5rem;
                stroke: var(--color-brand);
            }
        }

        &.targetable {
            & :global(.shape-inner-border) {
                stroke: var(--color-brand);
            }
            & :global(g.selected > .shape-inner-border) {
                stroke: var(--color-brand);
            }
        }

        & :global(.shape-outer-border) {
            fill: transparent;
            stroke: var(--color-gs-light);
            stroke-width: 0.5rem;
            filter: var(--shadow-filter-url);
        }

        & :global(.shape-inner-border) {
            fill: var(--color-brand);
            fill-opacity: 0.15;
            stroke: var(--color-gs-dark);
            stroke-width: 0.25rem;
        }

        & :global(.shape-dashed-outline) {
            fill: transparent;
            stroke: transparent;
            stroke-width: 0.25rem;
            stroke-dasharray: 2;
        }

        & :global(.shape-checkmark) {
            user-select: none;
            fill: transparent;
        }

        & :global(g.invisible > .shape-outer-border),
        & :global(g.invisible > .shape-inner-border),
        & :global(g.shape.poly.invisible:not(:focus-visible):not(:hover):not(.selected) > .shape-shadow),
        & :global(g.shape.poly.invisible:not(:focus-visible):not(:hover):not(.selected) > .shape-outline-cover) {
            stroke: transparent;
            fill: transparent;
        }

        &:not(.disabled) :global(g:hover > .shape-outer-border) {
            stroke: var(--color-gs-light);
        }

        &:not(.disabled) :global(g:hover > .shape-inner-border) {
            stroke-width: 0.5rem;
            stroke: var(--color-brand);
        }

        & :global(g.selected > .shape-outer-border) {
            fill: transparent;
            stroke: var(--color-gs-light);
        }

        & :global(g.selected > .shape-inner-border) {
            stroke: var(--color-brand);
            fill: var(--color-brand);
            fill-opacity: 0.69;
        }

        & :global(g.selected:hover > .shape-inner-border) {
            stroke: var(--color-brand);
        }

        & :global(g.selected > .shape-checkmark) {
            fill: var(--color-gs-light);
        }

        & :global(g:focus),
        & :global(g:focus-visible) {
            outline: none;
        }

        & :global(g:focus-visible > .shape-outer-border) {
            stroke: var(--color-gs-light);
        }

        &:not(.disabled) :global(g:focus-visible > .shape-inner-border) {
            stroke: var(--color-brand);
        }

        & :global(g:focus-visible > .shape-dashed-outline) {
            stroke: var(--color-brand);
        }

        & :global(g:hover > .shape-dashed-outline) {
            stroke: transparent;
        }
    }
</style>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<g
    data-choice-key={key}
    class="hotspot-choice {classes}"
    class:disabled
    class:targetable
    class:targeted
    class:activated
    on:mouseup
    on:mousedown
    on:touchstart
    on:touchend>
    <svelte:component
        this={shapeComponent}
        {coords}
        {selected}
        {disabled}
        {label}
        {invisible}
        {checkmark}
        {hoverable}
        {ariaLabel}
        ariaLabelledBy={instructionsEltId}
        scale={activated ? 1.25 : 1}
        on:click={handleClick}
        on:center={handleCenter}
        on:mount
        on:keydown
        on:keyup={handleKeyUp} />

    {#if instructions}
        <text id={instructionsEltId} class="hidden" lang={instructionsLang}>{instructions}</text>
    {/if}
</g>
