<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;

    import Rectangle from './shapes/Rectangle.svelte';
    import Ellipse from './shapes/Ellipse.svelte';
    import Line from './shapes/Line.svelte';
    import Path from './shapes/Path.svelte';
    import { createEventDispatcher } from 'svelte';

    /**
     * @typedef Geometry
     * @property {Number} x text container top-left x-axis
     * @property {Number} y text container top-left y-axis
     * @property {Number} width text container width
     * @property {Number} height text container height
     */

    /**
     * @typedef DrawingGeometry
     * @property {Number} drawAreaStartX starting point x-coordinate of drawing related to canvas
     * @property {Number} drawAreaStartY starting point y-coordinate of drawing related to canvas
     * @property {Number} initialPointerX starting point x-coordinate of drawing related to window
     * @property {Number} initialPointerY starting point y-coordinate of drawing related to window
     */

    /**
     * Component is used to display shape of a kind
     * @property {DrawingGeometry} [drawingGeometry=null] details of draw start
     * @property {Geometry} [geometry=null] individual shape props
     * @property {String} type shape type
     * @property {String} key shape key
     * @property {Boolean} [selected=false] selected state of the shape
     * @property {Boolean} [hoverable=false] makes shape react to hover
     * @fires 'finishDraw' when drawing has finished
     */

    const shapeTypes = Object.freeze({
        rectangle: Rectangle,
        oval: Ellipse,
        line: Line,
        brush: Path
    });

    const dispatch = createEventDispatcher();

    //as because specs require drawing of different shapes to rely on different event routines
    //mousedown-mousemove-mouseup for rectangle, oval, brush and click-click for line
    //we have to implement drawing individually inside appropriate shape component
    export let drawingGeometry = null;
    export let geometry = null;
    export let type;
    export let key;
    export let selected = false;
    export let hoverable = false;

    /**
     * Forwards finishDraw event up
     * @param {CustomEvent} e event
     * @fires finishDraw custom event
     */
    function handleFinishDraw(e) {
        dispatch('finishDraw', e.detail);
    }

    /**
     * Forwards finishResizing event up
     * @param {CustomEvent} e event
     * @fires finishResizing custom event
     */
    function handleFinishResizing(e) {
        dispatch('finishResizing', e.detail);
    }
</script>

<style>
    .shape-container {
        & :global(.shape) {
            fill: transparent;
            stroke: var(--color-gs-dark);
            stroke-linecap: round;
        }

        & :global(.shape.too-small) {
            display: none;
        }

        & :global(rect.shape) {
            stroke-width: 0.5rem;
        }

        & :global(ellipse.shape) {
            stroke-width: 0.5rem;
        }

        & :global(line.shape) {
            stroke-width: 0.5rem;
        }

        &.selected {
            & :global(.shape) {
                stroke: var(--color-gs-graphical);
            }

            & :global(.bounding) {
                stroke: var(--color-brand);
                stroke-linecap: round;
            }
        }

        & :global(.line-hitbox) {
            stroke-linecap: square;
            stroke: transparent;
            stroke-width: 2rem;
        }

        & :global(.hitbox) {
            fill: transparent;
            stroke: transparent;
        }

        & :global(.bounding) {
            fill: transparent;
            stroke: transparent;

            stroke-width: 0.25rem;
        }

        & :global(path) {
            stroke-linejoin: round;
        }

        & :global(line.bounding) {
            stroke-width: 0.5rem;
            stroke-linecap: round;
        }

        /* use this mediaquery to disable misleading hover behavior on touch devices */
        @media (hover: hover) and (pointer: fine) {
            &.hoverable {
                & :global(.bounding:hover) {
                    stroke: var(--color-brand);
                }
                & :global(.line-hitbox:hover ~ .bounding) {
                    stroke: var(--color-brand);
                }
                & :global(.hitbox:hover ~ .bounding) {
                    stroke: var(--color-brand);
                }
            }
        }
    }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<g
    class={`shape-container ${type}`}
    class:selected
    class:hoverable
    data-shape-type={type}
    data-shape-key={key}
    on:mousedown
    on:click>
    <svelte:component
        this={shapeTypes[type]}
        {drawingGeometry}
        {geometry}
        {selected}
        {hoverable}
        on:finishDraw={handleFinishDraw}
        on:finishResizing={handleFinishResizing} />
</g>
