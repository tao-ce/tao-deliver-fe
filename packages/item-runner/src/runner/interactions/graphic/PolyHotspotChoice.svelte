<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { SVG } from '@svgdotjs/svg.js';
    import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
    import { fixCoordinates, getVertexCoords, getIsThin, getInvertedClipPathCoords } from './util/polygon.js';
    import polylabel from 'polylabel';
    import { checkmarkRadius } from './util/shapeDefaults.js';
    import { remToPx } from '@oat-sa-private/ui-core';

    const dispatch = createEventDispatcher();

    /**
     * Presentational component to render circle hotspot
     *
     * @property {number[]} coords array of hotspot's shape coordinates
     * @property {string} label text to be rendered in visual center of hotspot
     * @property {string} ariaLabel aria-label of hotspot for screen readers
     * @property {string} ariaLabelledBy id of the element that contains the label
     * @property {boolean} selected selected state of hotspot
     * @property {boolean} disabled disabled state of hotspot
     * @property {boolean} invisible invisible state of hotspot
     * @property {boolean} checkmark draw or not circle/label in the center of element
     * @property {number} scale scale shape
     */
    export let coords;
    export let label;
    export let ariaLabel;
    export let ariaLabelledBy;
    export let selected;
    export let disabled;
    export let invisible;
    export let checkmark = true;
    export let scale = 1;

    let groupElement;
    let svgGroup;
    let cx = null;
    let cy = null;
    let isThinPoly = false;
    let clipPathEl;

    $: if (svgGroup && cx !== null && cy !== null) {
        dispatch('center', { cx, cy });
    }

    /**
     * Draw (or re-draw) the dynamic elements inside the <g>
     * @param {import('@svgdotjs/svg.js').Element} groupEl
     */
    function draw(groupEl) {
        groupEl.clear();
        clipPathEl?.remove();

        if (coords && coords.length) {
            const polyCoords = getVertexCoords(coords);
            const strCoords = polyCoords.map(coordinates => coordinates.join(',')).join(' ');

            clipPathEl = groupEl.root().defs().clip();
            clipPathEl.polygon(strCoords);

            const shadowEl = groupEl.polygon(strCoords).addClass('shape-shadow');
            const innerBorderEl = groupEl.polygon(strCoords).addClass('shape-inner-border').clipWith(clipPathEl);
            groupEl.polygon(strCoords).addClass('shape-outer-border').clipWith(clipPathEl);
            groupEl.polygon(strCoords).addClass('shape-dashed-outline').clipWith(clipPathEl);
            groupEl.polygon(strCoords).addClass('shape-outline-cover').clipWith(clipPathEl);

            [cx, cy] = polylabel([polyCoords]);

            // enough to show black/blue inner border and a little bit of background. If smaller, white outer border will cover them.
            const thinCheckerSize = remToPx(2 * (0.5 + 0.25) + 0.5);
            // if "thin", then change styles: let the stroke go outside the borders, invert clip-path to cut inner half of the stroke
            isThinPoly = getIsThin(groupEl, cx, cy, thinCheckerSize);
            if (isThinPoly) {
                innerBorderEl.unclip().forward().forward().forward();
                shadowEl.remove();

                const invertedClipCoords = getInvertedClipPathCoords(polyCoords, groupEl);
                const invertedClipStrCoords = invertedClipCoords.map(coordinates => coordinates.join(',')).join(' ');

                clipPathEl.clear().polygon(invertedClipStrCoords);
            }

            if (checkmark) {
                if (label) {
                    groupEl.text(label).cx(cx).cy(cy).addClass('shape-checkmark');
                } else {
                    groupEl.circle(checkmarkRadius).attr({ cx, cy }).addClass('shape-checkmark');
                }
            }

            if (scale !== 1) {
                groupEl.each(function () {
                    this.scale(scale);
                });
            }
        }
    }

    onMount(() => {
        svgGroup = SVG(groupElement);
        dispatch('mount', { svgGroup });
    });

    afterUpdate(() => {
        // SVG shape elements must be drawn:
        // 1. right after mount
        // 2. when 'coords' prop changes (due to resize)
        // 3. when 'selected' changes (due to user action)
        // 4. potentially other props, but not expected
        coords = fixCoordinates(coords);
        draw(svgGroup);
    });
</script>

<style>
    g.shape:not(.thin-poly) {
        & :global(.shape-shadow) {
            filter: blur(1px);
            fill: transparent;
            stroke: rgba(0, 0, 0, 0.4);
            stroke-width: 2px;
        }
        & :global(.shape-inner-border) {
            stroke-width: 1.5rem;
        }
        & :global(.shape-outer-border) {
            stroke-width: 1rem;
            filter: none;
        }
        & :global(.shape-dashed-outline) {
            stroke-width: 0.75rem;
        }
        & :global(.shape-outline-cover) {
            stroke: var(--color-gs-light);
            stroke-width: 0.25rem;
            fill: transparent;
        }

        &:hover:not([aria-disabled='true']) {
            & :global(.shape-outer-border.shape-outer-border) {
                stroke-width: 0.75rem;
            }
            & :global(.shape-inner-border.shape-inner-border) {
                stroke-width: 1.75rem;
            }
        }

        &:focus-visible {
            & :global(.shape-outer-border.shape-outer-border) {
                stroke-width: 1rem;
            }
            & :global(.shape-inner-border.shape-inner-border) {
                stroke-width: 1.5rem;
            }
        }
    }

    g.shape.thin-poly {
        & :global(.shape-inner-border) {
            stroke-width: 0.25rem;
        }
        & :global(.shape-outer-border) {
            stroke-width: 1.25rem;
        }
        & :global(.shape-dashed-outline) {
            stroke-width: 1rem;
        }
        & :global(.shape-outline-cover) {
            stroke: var(--color-gs-light);
            stroke-width: 0.5rem;
            fill: transparent;
        }

        &.with-label.selected :global(.shape-checkmark) {
            stroke: var(--color-brand);
            stroke-width: 4;
            paint-order: stroke fill;
        }

        &:hover:not([aria-disabled='true']) {
            & :global(.shape-outer-border.shape-outer-border) {
                stroke-width: 1.25rem;
            }
            & :global(.shape-inner-border.shape-inner-border) {
                stroke-width: 0.5rem;
            }
        }

        &:focus-visible {
            & :global(.shape-outer-border.shape-outer-border) {
                stroke-width: 1.25rem;
            }
            & :global(.shape-inner-border.shape-inner-border) {
                stroke-width: 0.25rem;
            }
        }
    }
</style>

<g
    tabindex="-1"
    role="button"
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    aria-disabled={!!disabled}
    bind:this={groupElement}
    class="shape poly"
    class:invisible
    class:selected
    class:thin-poly={isThinPoly}
    class:with-label={!!label}
    on:click
    on:keydown
    on:keyup />
