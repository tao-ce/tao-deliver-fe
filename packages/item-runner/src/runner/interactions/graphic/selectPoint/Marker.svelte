<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-21 (original work) Open Assessment Technologies SA ;
    /* eslint-disable svelte/valid-compile */ // because of CSS mixin

    import { onMount, createEventDispatcher } from 'svelte';
    import { SVG } from '@svgdotjs/svg.js';
    import '@svgdotjs/svg.draggable.js';
    import '@svgdotjs/svg.filter.js';
    import { defaultPin, selectedPin, hitbox } from './resources/pins.js';

    /**
     * Marker component is used to place pins on svg background image
     * @property {Number[]} coords pin coordinates
     * @property {String} key unique key of instance
     * @property {Boolean} [selected=false] selected flag of the marker
     * @property {Boolean} [disabled=false] disabled flag of the marker
     * @property {Number} maxX background image width
     * @property {Number} maxY background image height
     * @fires mount when component is initially rendered
     * @fires click when hitbox of component is clicked
     * @fires dragEnd after drag operation ended
     * @fires focus when component receives focus
     * @fires blur when component looses focus
     */

    export let coords;
    export let key;
    export let selected = false;
    export let disabled = false;
    export let maxX;
    export let maxY;

    //main group element binding variable
    let groupElement;
    //instance of svg.js g
    let svgGroup;

    //dragging vars
    let dragStartX;
    let dragStartY;
    let moveX;
    let moveY;

    let dragging = false;
    let clickDisabledByDrag = false;
    let dragStarted = false;
    const dragStartThresholdMs = 20;

    const dispatch = createEventDispatcher();

    //passing selected arg to draw function just for reactive binding
    $: svgGroup && coords && draw(selected);

    /**
     * Main function that adds pin svg image and hitbox to svgGroup
     */
    function draw() {
        svgGroup.clear();
        const pinGroup = svgGroup.group();

        //add the appropriate pin images
        pinGroup.svg(selectedPin);
        pinGroup.svg(defaultPin);
        const raisedPinElement = pinGroup.children()[0];
        const defaultPinElement = pinGroup.children()[1];

        raisedPinElement.filterWith(function (add) {
            var blur = add.offset(0, 0).in(add.$sourceAlpha).gaussianBlur(1.5);
            add.blend(add.$source, blur);
        });

        //add the hitbox
        const rect = svgGroup
            .rect(hitbox.width, hitbox.height)
            .x(coords[0] - hitbox.width / 2)
            .y(coords[1] - hitbox.height)
            .attr({ stroke: 'transparent', fill: 'transparent' })
            .addClass('hitbox');

        let pin, pinHeight;

        /**
         * Toggles visibility of pin1 and pin2 depending on current state
         */
        function togglePin() {
            const raised = selected || dragging;
            if (raised) {
                raisedPinElement.show();
                defaultPinElement.hide();
                pin = raisedPinElement;
            } else {
                defaultPinElement.show();
                raisedPinElement.hide();
                pin = defaultPinElement;
            }
            pinHeight = parseInt(pin.height(), 10);
            pin.cx(coords[0]).y(coords[1] - pinHeight);
        }
        togglePin();

        //attach draggable events to pin
        rect.draggable()
            .on('beforedrag', e => {
                if (disabled) {
                    e.preventDefault();
                }
                //same with click event handling it's better to manage
                //the situation when hitbox of one pin is over other pin
                svgGroup.front();

                //we need to add threshold to handle the case when user moves a bit during click
                dragStarted = false;
                setTimeout(() => {
                    dragStarted = true;
                }, dragStartThresholdMs);
            })
            .on('dragstart', e => {
                dragStartX = e.detail.box.x;
                dragStartY = e.detail.box.y;
                dragging = true;
                togglePin();
            })
            .on('dragmove', e => {
                //we need to respect maxX & maxY constraints, thus cancelling the default behaviour
                e.preventDefault();

                moveX = e.detail.box.x - dragStartX;
                moveY = e.detail.box.y - dragStartY;
                const { x, y } = calculateNewCoords(moveX, moveY);
                pin.cx(x).y(y - pinHeight);
            })
            .on('dragend', () => {
                //if no movement happened - it was a click
                //actual click event doesn't fire because draggable plugin
                //captures mousedown event
                dragging = false;
                togglePin();

                if ((!moveX && !moveY) || !dragStarted) {
                    handleClick();
                } else {
                    const { x, y } = calculateNewCoords(moveX, moveY);
                    dispatch('dragEnd', {
                        key,
                        x,
                        y
                    });
                    //this fixes the firefox behaviour when click event gets fired
                    //right after the dragEnd event
                    clickDisabledByDrag = true;
                    setTimeout(() => {
                        clickDisabledByDrag = false;
                    }, 0);
                }
            });
    }

    /**
     * Calculating new coordinates based on move delta and constraints
     * @param {Number} deltaX intended position change on x-axis
     * @param {Number} deltaY intended position change on y-axis
     * @returns {Object} {x, y} - new position coordinates object
     */
    function calculateNewCoords(deltaX, deltaY) {
        let x = coords[0] + deltaX;
        let y = coords[1] + deltaY;
        if (x > maxX) {
            x = maxX;
        }
        if (x < 0) {
            x = 0;
        }
        if (y > maxY) {
            y = maxY;
        }
        if (y < 0) {
            y = 0;
        }
        return { x, y };
    }

    onMount(() => {
        svgGroup = SVG(groupElement);
        dispatch('mount', { key, svgGroup });
    });

    //Event handlers
    /**
     * Focus handler
     * @fires focus
     */
    function handleFocus() {
        if (!disabled) {
            dispatch('focus', { key });
        }
    }

    /**
     * Blur handler
     * @fires blur
     */
    function handleBlur() {
        if (!disabled) {
            dispatch('blur', { key });
        }
    }

    /**
     * Click handler
     * @fires click
     */
    function handleClick() {
        //the case when hitbox of one marker is over other marker should be handled on interaction side
        if (!disabled && !clickDisabledByDrag) {
            dispatch('click', { key });
        }
    }
</script>

<style>
    /*need to wrap :focus-visible and .hitbox into :global
    as because they are not specified in <styles> and markup of a component explicitly*/

    @define-mixin marker-hovered {
        & :global(.outer-line) {
            fill: var(--color-brand);
        }
        & :global(.large-circle) {
            fill: var(--color-brand);
        }
        & :global(.small-circle) {
            fill: transparent;
        }
    }
    .marker {
        outline: none;
        cursor: grab;
        & > :global(*) {
            outline: none;
        }
        & :global(.outer-line),
        & :global(.small-circle) {
            fill: var(--color-brand-hover);
        }

        & :global(.large-circle) {
            fill: transparent;
        }

        &.disabled {
            cursor: not-allowed;
        }

        &.dragging {
            cursor: grabbing;
            @add-mixin marker-hovered;
        }

        &.selected {
            & > :global(.hitbox) {
                outline: none;
            }
        }

        &:hover {
            &:not(.disabled) {
                @add-mixin marker-hovered;
            }
        }
    }
    :global(.marker:not(.dragging):not(.selected):not(.disabled):focus-visible) {
        outline: none;

        @add-mixin marker-hovered;

        & > :global(.hitbox) {
            @add-mixin simple-outline var(--color-brand), 0;
        }
    }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-tabindex -->
<g
    class="marker"
    class:dragging
    class:selected
    class:disabled
    bind:this={groupElement}
    tabindex="0"
    data-point-key={key}
    on:click={handleClick}
    on:focus={handleFocus}
    on:blur={handleBlur} />
