<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { SVG } from '@svgdotjs/svg.js';
    import { remToPx } from '@oat-sa-private/ui-core';
    import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
    import { minSizePx, checkmarkRadius } from './util/shapeDefaults.js';

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
     * @property {boolean} hoverable draw or not hoverable scaling
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
    export let hoverable = true;
    export let scale = 1;

    let groupElement;
    let svgGroup;
    let hovered;
    let cx = null;
    let cy = null;

    $: if (svgGroup && cx !== null && cy !== null) {
        dispatch('center', { cx, cy });
    }

    /**
     * Draw (or re-draw) the dynamic elements inside the <g>
     * @param {DOMElement} groupEl
     */
    function draw(groupEl) {
        groupEl.clear();

        if (coords && coords.length) {
            cx = coords[0];
            cy = coords[1];
            let radiusX = coords[2];
            let radiusY = coords[3];

            const outerRadiusOffset = remToPx(0.375);
            const innerRadiusOffset = hovered && hoverable ? remToPx(0.75) : remToPx(0.875);

            // apply minSize if needed (to each radius independently)
            // include offets into comparison to avoid negative values when rendered
            const minRadiusPx = minSizePx / 2;
            radiusX = Math.max(minRadiusPx, radiusX, outerRadiusOffset, innerRadiusOffset);
            radiusY = Math.max(minRadiusPx, radiusY, outerRadiusOffset, innerRadiusOffset);

            //outer white ellipse
            groupEl
                .ellipse((radiusX - outerRadiusOffset) * 2, (radiusY - outerRadiusOffset) * 2)
                .attr({ cx, cy })
                .addClass('shape-outer-border');
            //inner black ellipse
            groupEl
                .ellipse((radiusX - innerRadiusOffset) * 2, (radiusY - innerRadiusOffset) * 2)
                .attr({ cx, cy })
                .addClass('shape-inner-border');

            //focus-outline
            groupEl
                .ellipse((radiusX - outerRadiusOffset) * 2, (radiusY - outerRadiusOffset) * 2)
                .attr({ cx, cy })
                .addClass('shape-dashed-outline');

            if (checkmark) {
                if (label) {
                    groupEl.text(label).cx(coords[0]).cy(coords[1]).addClass('shape-checkmark');
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
        draw(svgGroup);
    });

    function handleMouseEnter() {
        if (!hovered) {
            hovered = true;
            draw(svgGroup);
        }
    }

    function handleMouseLeave() {
        if (hovered) {
            hovered = false;
            draw(svgGroup);
        }
    }
</script>

<g
    tabindex="-1"
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    aria-disabled={disabled}
    bind:this={groupElement}
    class="shape"
    class:invisible
    class:selected
    on:click
    on:keydown
    on:keyup
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave} />
