<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;

    import { onMount, createEventDispatcher } from 'svelte';
    import { SVG } from '@svgdotjs/svg.js';
    import setupDroparea from './util/actions/setupDroparea.js';
    import CircleHotspotChoice from '../CircleHotspotChoice.svelte';
    import EllipseHotspotChoice from '../EllipseHotspotChoice.svelte';
    import RectHotspotChoice from '../RectHotspotChoice.svelte';
    import PolyHotspotChoice from '../PolyHotspotChoice.svelte';
    import { getActualKey, remToPx, generateElementId } from '@oat-sa-private/ui-core';

    /**
     * Component intended to render gap in answer area
     *
     * @property {string} identifier - gap identifier
     * @property {string} shape - graphical shape of gap
     * @property {number[]} coords - array of gap shape coordinates
     * @property {string} hotspotLabel - the alternative text for this (hot) area of the image
     * @property {object} dropareaRegistry - 'dropAreaRegistryFactory' object shared for this drag group (for interaction)
     * @property {string} ariaLabel - aria-label
     * @property {string} tabindex
     * @property {boolean} targetable - style when element that can be dropped here is being dragged (for click/tap, element is selected)
     * @property {boolean} targeted - style when element that can be dropped here is being dragged over this item (for click/tap, element is selected and item is hovered)
     * @property {boolean} disabled
     * @property {boolean} invisible - make it transparent unless targeted or keyboard-focused
     * @property {string} instructions - instructions for assistive technology devices
     * @property {string} instructionsLang - the lang of the test taker
     *
     * @fires 'dragOver'
     * @fires 'dragOut'
     * @fires 'drop'
     * @fires 'mount'
     * @fires 'center'
     * @fires 'click'
     * @fires 'keySelect'
     * @fires 'hoverOver'
     * @fires 'hoverOut'
     */

    export let identifier;
    export let shape;
    export let coords;
    export let hotspotLabel;
    export let dropareaRegistry;
    export let ariaLabel;
    export let tabindex;
    export let targetable = false;
    export let targeted = false;
    export let disabled = false;
    export let invisible = false;
    export let instructions;
    export let instructionsLang;

    const instructionsEltId = instructions && generateElementId('hotspot-choice-label');

    const dispatch = createEventDispatcher();
    const shapeToComponent = Object.freeze({
        circle: CircleHotspotChoice,
        ellipse: EllipseHotspotChoice,
        rect: RectHotspotChoice,
        poly: PolyHotspotChoice
    });
    const borderDashWidth = remToPx(0.75);
    const borderDotWidth = remToPx(0.25);

    let shapeComponent = shapeToComponent[shape];

    let groupElement;
    // eslint-disable-next-line no-unused-vars
    let svgGroup;

    onMount(() => {
        svgGroup = SVG(groupElement);
    });

    /**
     * Handle choice mouse click
     */
    function handleClick() {
        dispatch('click', { key: identifier });
    }

    /**
     * Handle choice keySelect
     * @param {KeyboardEvent} e
     */
    function handleKeyUp(e) {
        const actualKey = getActualKey(e);
        if (actualKey === 'space' || actualKey === 'enter') {
            dispatch('keySelect', { key: identifier });
            e.preventDefault();
        }
    }

    /**
     * Handle choice mouseenter (hover)
     */
    function handleMouseenter() {
        dispatch('hoverOver', { key: identifier });
    }

    /**
     * Handle choice mouseleave
     */
    function handleMouseleave() {
        dispatch('hoverOut', { key: identifier });
    }

    /**
     * Handle choice mount
     * @param {CustomEvent} e
     */
    function handleMount(e) {
        dispatch('mount', { key: identifier, svgGroup: e.detail.svgGroup });
    }

    /**
     * Handle choice center (fired by polygon shape)
     * @param {CustomEvent} e
     */
    function handleCenter(e) {
        dispatch('center', { key: identifier, cx: e.detail.cx, cy: e.detail.cy });
    }
</script>

<style>
    .associable-hotspot {
        --outer-frame-border-width: 0.5rem;
        --frame-border-width: 0.25rem;

        /**** default state styles *****/
        outline: none;

        &:disabled {
            cursor: not-allowed;
        }

        & :global(.shape) {
            outline: none;
        }

        & :global(.shape-outer-border) {
            fill: transparent;
            stroke: var(--color-bg-default);
            stroke-width: var(--outer-frame-border-width);
            filter: var(--shadow-filter-url);
        }

        & :global(.shape-inner-border) {
            fill: var(--color-brand);
            fill-opacity: 0.15;
            stroke: var(--color-gs-dark);
            stroke-width: var(--frame-border-width);
        }

        & :global(.shape-dashed-outline) {
            fill: transparent;
            stroke: transparent;
            stroke-width: var(--frame-border-width);
            stroke-dasharray: var(--dash-width) var(--draw-focus-dasharray);
            stroke-linejoin: round;
        }

        /**** polygon hotspot styles *****/

        & :global(g.shape.poly:not(.thin-poly):hover),
        &:focus-visible :global(g.shape.poly:not(.thin-poly)) {
            & :global(.shape-outer-border.shape-outer-border) {
                stroke-width: 1rem;
            }
            & :global(.shape-inner-border.shape-inner-border) {
                stroke-width: 1.5rem;
            }
        }
        & :global(g.shape.thin-poly:hover),
        &:focus-visible :global(g.shape.thin-poly) {
            & :global(.shape-outer-border.shape-outer-border) {
                stroke-width: 1.25rem;
            }
            & :global(.shape-inner-border.shape-inner-border) {
                stroke-width: 0.25rem;
            }
        }

        /****** active state styles *******/
        &.targetable {
            cursor: pointer;
        }
        &.targetable :global(.shape-inner-border) {
            stroke: var(--color-brand);
        }

        /****** targeted state styles *******/
        &.targeted :global(.shape-dashed-outline) {
            stroke: var(--color-brand-hover);
        }
    }

    /****** focus styles *******/
    :global(.associable-hotspot:focus-visible) {
        & :global(.shape-dashed-outline) {
            stroke: var(--color-brand-hover);
            stroke-dasharray: var(--draw-focus-dasharray);
        }
    }

    /****** invisible styles *******/
    :global(.associable-hotspot.invisible:not(.targeted):not(:focus-visible)) {
        & :global(.shape-outer-border),
        & :global(.shape-inner-border),
        & :global(.shape-outline-cover),
        & :global(.shape-shadow) {
            stroke: transparent;
            fill: transparent;
        }
    }
</style>

<!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-static-element-interactions -->
<g
    key={identifier}
    class="associable-hotspot"
    style={`--draw-focus-dasharray:${borderDotWidth}px;--dash-width:${borderDashWidth}px;`}
    class:targetable
    class:targeted
    class:invisible
    tabindex={!disabled ? tabindex : void 0}
    bind:this={groupElement}
    use:setupDroparea={{ dropareaRegistry, key: identifier }}
    on:mouseenter={!disabled ? handleMouseenter : void 0}
    on:mouseleave={!disabled ? handleMouseleave : void 0}
    on:keyup={!disabled ? handleKeyUp : void 0}
    on:dragOver
    on:dragOut
    on:drop>
    <svelte:component
        this={shapeComponent}
        {coords}
        {disabled}
        label={hotspotLabel}
        {invisible}
        {targeted}
        {ariaLabel}
        ariaLabelledBy={instructionsEltId}
        selected={false}
        hoverable={false}
        checkmark={false}
        on:mount={handleMount}
        on:center={handleCenter}
        on:click={!disabled ? handleClick : void 0} />
    {#if instructions}
        <text id={instructionsEltId} class="hidden" lang={instructionsLang}>{instructions}</text>
    {/if}
</g>
