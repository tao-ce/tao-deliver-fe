<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;
    import { __, generateElementId } from '@oat-sa-private/ui-core';
    import Image from './Image.svelte';
    import { createEventDispatcher } from 'svelte';
    import RenderingError from 'core/error/RenderingError';

    /**
     * Renders an inline <svg> element, with integrated background and optional bay space,
     * and exposes 2 slots for different content groups
     *
     * @property {?String} svgId internal string for prefixing ids
     * @property {String} itemIdentifier for getting item context, for asset resolver
     * @property {String} label element label
     */
    export let svgId = generateElementId('svg');
    export let itemIdentifier;
    export let label = __('graphic interaction');

    /**
     * Background image
     * @property {String} imgSrc path or url to background image
     * @property {Number} imgWidth
     * @property {Number} imgHeight
     */
    export let imgSrc;
    export let imgWidth = 0;
    export let imgHeight = 0;

    /**
     * Optional bay coords (pre-scaled):
     * @property {Object} bayAttrs coordinates of space to be left blank
     * @property {Object} [bayAttrs.related]
     * @property {?Number} [bayAttrs.related.imgExcessWidth] additional width for svg due to bay
     * @property {?Number} [bayAttrs.related.imgExcessHeight] additional height for svg due to bay
     * @property {?Number} [bayAttrs.related.imgOffsetX] coordinate of image left edge
     * @property {?Number} [bayAttrs.related.imgOffsetY] coordinate of image top edge
     */
    export let bayAttrs = { related: {} };

    const dispatch = createEventDispatcher();

    let svgElement;
    let labelId = label ? generateElementId('desc') : void 0;

    let imgOffsetX = 0;
    let imgOffsetY = 0;
    let svgWidth = imgWidth;
    let svgHeight = imgHeight;
    $: {
        imgOffsetX = (bayAttrs.related && bayAttrs.related.imgOffsetX) || 0;
        imgOffsetY = (bayAttrs.related && bayAttrs.related.imgOffsetY) || 0;
        svgWidth = imgWidth + ((bayAttrs.related && bayAttrs.related.imgExcessWidth) || 0);
        svgHeight = imgHeight + ((bayAttrs.related && bayAttrs.related.imgExcessHeight) || 0);
    }

    $: if (svgElement) {
        dispatch('mount', { svgElement });
    }

    $: currentLang = getCurrentLanguage(svgElement);

    /**
     * Background load handler
     */
    function handleLoad() {
        dispatch('backgroundImageLoad');
    }

    /**
     * Background load error handler
     */
    function handleError() {
        const err = new RenderingError(`background image "${imgSrc}" could not be loaded`, true);
        dispatch('backgroundImageError', err);
    }

    /**
     * Gets current item language (if parent section with lang attribute is presented)
     * If parent section doesn't have lang attribute - uses application locale instead
     * @param {HtmlElement|undefined} svgRoot - root svg element
     * @returns {String|void}
     */
    function getCurrentLanguage(svgRoot) {
        if (!svgRoot) {
            return;
        }
        const parentSection = svgRoot.closest('section[lang]');
        if (!parentSection) {
            return __.getLocale();
        }
        return parentSection.getAttribute('lang');
    }
</script>

<style>
    svg {
        display: block;
    }
</style>

{#if svgWidth && svgHeight}
    <!-- svelte-ignore a11y-no-static-element-interactions a11y_click_events_have_key_events -->
    <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        xmlns:svgjs="http://svgjs.com/svgjs"
        lang={currentLang}
        width={svgWidth}
        height={svgHeight}
        viewBox="0 0 {svgWidth} {svgHeight}"
        aria-labelledby={labelId}
        style={`--shadow-filter-url: url(#${svgId}-filter-shadow)`}
        bind:this={svgElement}
        on:mousemove
        on:touchmove|nonpassive
        on:click>
        {#if label}
            <desc id={labelId}>{label}</desc>
        {/if}
        <defs>
            <filter id="{svgId}-filter-shadow" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="black" />
            </filter>
        </defs>
        <slot name="bay" />
        <g class="image" transform="translate({imgOffsetX}, {imgOffsetY})">
            <Image
                {itemIdentifier}
                src={imgSrc}
                width={imgWidth}
                height={imgHeight}
                on:load={handleLoad}
                on:error={handleError} />
            <slot name="content" />
        </g>
    </svg>
{/if}
