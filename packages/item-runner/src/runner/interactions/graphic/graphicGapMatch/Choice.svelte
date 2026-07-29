<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;

    import { createEventDispatcher, onMount } from 'svelte';
    import { remToPx, getActualKey, dragAndDropAction, getPointerEventCoords } from '@oat-sa-private/ui-core';
    import { Icon } from '@oat-sa-private/ui-elements';
    import setupDroparea from './util/actions/setupDroparea.js';
    import { calculateScalingFactor } from '../util/scaling.js';

    /**
     * Component intended to render choice (draggable image) in choice area and in answer area
     *
     * @property {String} key - choice identifier
     * @property {String} gapKey - for answer area, gap identifier in addition to 'key'
     * @property {Object} dropareaRegistry - 'dropAreaRegistryFactory' object shared for this drag group (for interaction)
     * @property {Number} x - top-left x coordinate, relative to container svg
     * @property {Number} y - top-left y coordinate, relative to container svg
     * @property {Number} width
     * @property {Number} height
     * @property {String} imgSrc - image src url
     * @property {String} ariaLabel - aria-label and image alt text
     * @property {String} ariaDescribedBy - aria-describedby
     * @property {String} removerAriaLabel - aria-label for remove button
     * @property {String} tabindex
     * @property {Boolean} placed - style item in answer area (includes remove button)
     * @property {Boolean} amount - stack that much amount from this item
     * @property {Boolean} selected - 'elevated' style for click/tap pattern
     * @property {Boolean} targetable - style when element that can be dropped here is being dragged (for click/tap, element is selected)
     * @property {Boolean} targeted - style when element that can be dropped here is being dragged over this item (for click/tap, element is selected and item is hovered)
     * @property {Boolean} disabled
     *
     * @fires 'click'
     * @fires 'keySelect'
     * @fires 'clickRemove'
     * @fires 'keyRemove'
     * @fires 'dragStart'
     * @fires 'dragStop'
     * @fires 'drop'
     * @fires 'dragOver'
     * @fires 'dragOut'
     * @fires 'hoverOver'
     * @fires 'hoverOut'
     */
    export let key;
    export let gapKey;
    export let dropareaRegistry;
    export let draggableGroupKey;
    export let x;
    export let y;
    export let width;
    export let height;
    export let imgSrc;
    export let ariaLabel;
    export let ariaDescribedBy;
    export let removerAriaLabel;
    export let tabindex;
    export let placed;
    export let amount = 1;
    export let selected;
    export let targetable;
    export let targeted;
    export let disabled;

    const dispatch = createEventDispatcher();
    const selectedSizeIncrement = remToPx(1.5);

    let containerElement;
    let dragging = false;
    let hovered = false; //if we use :hover style, on iOS and remains after swap/drop until you click on free space (not nice ux)

    $: selectedScale = width && height ? getSelectedScale() : 1;
    $: cssStyle = width && height ? getStyle(selectedScale, x, y) : void 0;

    let src;

    /**
     * Get scale for 'selected' state
     * @returns {Number}
     */
    function getSelectedScale() {
        return calculateScalingFactor(
            width,
            height,
            width + selectedSizeIncrement * 2,
            height + selectedSizeIncrement * 2
        );
    }

    /**
     * Get css variables to put in style attribute
     * @returns {String}
     */
    function getStyle() {
        let style = `--draw-x: ${x}px;`;
        style += `--draw-y: ${y}px;`;
        style += `--draw-width: ${width}px;`;
        style += `--draw-height: ${height}px;`;
        style += `--draw-selected-scale: ${selectedScale};`;

        return style;
    }

    /**
     * Handle choice mouse click
     */
    function handleClick() {
        dispatch('click', { key, gapKey });
    }

    /**
     * Handle choice keyup
     * @param {KeyboardEvent} e
     */
    function handleKeyup(e) {
        const pressedKey = getActualKey(e);
        if (pressedKey === 'space' || pressedKey === 'enter') {
            dispatch('keySelect', { key, gapKey });
            e.preventDefault();
        }
    }

    /**
     * Handle choice and remover keydown, to prevent 'click' from firing instead of 'keyup'
     * @param {KeyboardEvent} e
     * @returns {?Boolean} - to prevent browser default
     */
    function handleKeydown(e) {
        const pressedKey = getActualKey(e);
        switch (pressedKey) {
            case 'enter':
            case 'space': {
                e.preventDefault();
                return false;
            }
        }
    }

    /**
     * Handle remover mouse click
     */
    function handleRemoverClick() {
        dispatch('clickRemove', { key, gapKey });
    }

    /**
     * Handle remover keyup
     * @param {KeyboardEvent} e
     */
    function handleRemoverKeyup(e) {
        const pressedKey = getActualKey(e);
        if (pressedKey === 'space' || pressedKey === 'enter') {
            dispatch('keyRemove', { key, gapKey });
            e.preventDefault();
            e.stopPropagation();
        }
    }

    /**
     * Handle choice mouseenter (hover)
     */
    function handleMouseenter() {
        dispatch('hoverOver', { key, gapKey });
        hovered = true;
    }

    /**
     * Handle choice mouseleave
     */
    function handleMouseleave() {
        hovered = false;
        dispatch('hoverOut', { key, gapKey });
    }

    /**
     * Handle choice dragStart
     */
    function handleDragStart() {
        dispatch('dragStart', { key, gapKey });
        dropareaRegistry.handleDragStart();
        dragging = true;
    }

    /**
     * Handle choice dragMove
     * @param {CustomEvent} e
     */
    function handleDragMove(e) {
        const pointerCoords = getPointerEventCoords(e.detail.originalEvent);
        dropareaRegistry.handleDragMove(key, gapKey, pointerCoords.x, pointerCoords.y);
    }

    /**
     * Handle choice dragStop
     */
    function handleDragStop() {
        dispatch('dragStop', { key, gapKey });
        dropareaRegistry.handleDragStop(key, gapKey);
        dragging = false;
    }

    /**
     * Handle choice dragOver
     * @param {CustomEvent} e
     */
    function handleDragOver(e) {
        dispatch('dragOver', {
            key: e.detail.key,
            gapKey: e.detail.areaKey,
            dropareaKey: e.detail.dropareaKey,
            dropareaGapKey: e.detail.dropareaAreaKey
        });
    }

    /**
     * Handle choice dragOut
     * @param {CustomEvent} e
     */
    function handleDragOut(e) {
        dispatch('dragOut', {
            key: e.detail.key,
            gapKey: e.detail.areaKey,
            dropareaKey: e.detail.dropareaKey,
            dropareaGapKey: e.detail.dropareaAreaKey
        });
    }

    /**
     * Handle choice drop
     * @param {CustomEvent} e
     */
    function handleDrop(e) {
        dispatch('drop', {
            key: e.detail.key,
            gapKey: e.detail.areaKey,
            dropareaKey: e.detail.dropareaKey,
            dropareaGapKey: e.detail.dropareaAreaKey
        });
    }

    /**
     * Handle choice mousedown
     * Because of 'dragScrollable' used by interaction: draggable-mirror that ui-core drag-drop creates gets misplaced because there's drag delay.
     * So we need to prevent dragScroll if mouse is on Choice - make sure mousedown event doesn't reach it
     * @param {MouseEvent} e
     */
    function handleMousedown(e) {
        e.stopPropagation();
    }

    //need to postpone setting src because in Safari `load` fires too quick
    //if loaded from cache
    onMount(() => {
        src = imgSrc;
    });
</script>

<style>
    .choice {
        @define-mixin offset-rectangle $offset {
            content: '';
            position: absolute;
            top: $offset;
            left: $offset;
            right: $offset;
            bottom: $offset;
        }

        --placed-border-size: 0.75rem;
        --thin-border-size: var(--border-medium);
        --overlay-fix-size: 1px; /* let thin black border cover 1px of image on each side: because of zooming/rounding, there can be empty space between them */

        position: absolute;
        top: calc(var(--draw-y) + var(--overlay-fix-size));
        left: calc(var(--draw-x) + var(--overlay-fix-size));
        width: calc(var(--draw-width) - 2 * var(--overlay-fix-size));
        height: calc(var(--draw-height) - 2 * var(--overlay-fix-size));
        pointer-events: auto;
        overflow: visible;
        cursor: pointer;

        & .drag-anchor {
            width: 100%;
            height: 100%;
            position: relative;

            /* on iOS, disable contextmenu if longpress on image - it conflicts with drag-start longpress
               (though this is not necessary as long as `.drag-anchor-content:after` hitbox which overlays image exists)  */
            -webkit-touch-callout: none;
        }

        & .drag-anchor-content {
            width: 100%;
            height: 100%;

            &:after {
                /* thin black border */
                @add-mixin offset-rectangle 0;
                border: var(--thin-border-size) solid var(--color-border-default);
            }
        }

        & .outline-container {
            width: 100%;
            height: 100%;
            position: relative;
            padding: calc(var(--thin-border-size) - var(--overlay-fix-size));
        }

        & .image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            background-color: var(--color-gs-light-hover-bg);
        }
    }

    .choice.disabled {
        cursor: not-allowed;
        & .remover {
            cursor: not-allowed;
        }
    }

    .choice.hovered {
        /* global not to override .draggable-mirror style */
        & :global(.drag-anchor),
        & :global(.remover) {
            z-index: var(--layer-1);
        }
    }

    .choice.placed {
        & .drag-anchor-content:before {
            /* thick white placed-border */
            @add-mixin offset-rectangle calc(-1 * var(--placed-border-size));
            background-color: var(--color-bg-default);
            box-shadow: 0 0 0.5rem rgba(0, 0, 0, 50%);
        }
    }

    .choice.selected {
        & .remover {
            display: none;
        }
        & :global(.drag-anchor) {
            z-index: calc(var(--layer-1) - 1);
        }
    }

    .choice.selected :global(.drag-anchor),
    .choice :global(.draggable-mirror.drag-anchor) {
        & :global(.drag-anchor-content) {
            position: relative;
            top: calc((100% * (1 - var(--draw-selected-scale))) / 2 + var(--overlay-fix-size));
            left: calc((100% * (1 - var(--draw-selected-scale))) / 2 + var(--overlay-fix-size));
            width: calc(100% * var(--draw-selected-scale) - 2 * var(--overlay-fix-size));
            height: calc(100% * var(--draw-selected-scale) - 2 * var(--overlay-fix-size));
        }
        & :global(.drag-anchor-content):after {
            /* thin black border */
            border: var(--border-thick) solid var(--color-brand);
        }
        & :global(.drag-anchor-content):before {
            /* thick white placed-border */
            content: none;
        }
        & :global(.outline-container) {
            padding: calc(var(--border-thick) - var(--overlay-fix-size));
        }
    }

    .choice.targetable {
        & .remover {
            display: none;
        }
        & .drag-anchor-content:after {
            /* thin black border */
            border: var(--thin-border-size) solid var(--color-brand);
        }
    }

    .choice.targeted {
        & .remover {
            display: none;
        }
        & .outline-container:before {
            /* dashed outline */
            @add-mixin offset-rectangle calc(-2 * var(--border-medium));
            border: var(--border-medium) dashed var(--color-brand-hover);
        }
    }

    .choice .drag-anchor:focus {
        outline: none;
    }
    .choice :global(.drag-anchor:focus-visible) {
        outline: none;

        & :global(.outline-container:before) {
            /* dashed outline */
            content: none;
        }
        & :global(.outline-container) {
            @add-mixin outline-focus-after calc(-2 * var(--border-medium));
        }
    }
    .choice :global(.drag-anchor:focus-visible),
    .choice :global(.drag-anchor:focus-visible ~ .remover) {
        z-index: var(--layer-1);
    }

    /* Drag styles */

    .choice :global(.draggable-mirror.drag-anchor) {
        pointer-events: none; /* ensure droparea will work (it uses document.elementFromPoint) */
        z-index: var(--layer-3);

        & :global(.outline-container:before) {
            /* dashed outline */
            content: none;
        }
        & :global(.outline-container:after) {
            /* focus-visible outline */
            content: none;
        }
        & :global(.image) {
            opacity: 0.6;
        }
    }
    .choice.dragging {
        pointer-events: none; /* ensure hover/dragOver events won't be fired when pointer on hidden original if '.choice.last' */

        & .remover {
            display: none;
        }
    }
    .choice.last :global(.draggable-source--is-dragging) {
        visibility: hidden;
    }
    .choice.last:not(.placed) {
        /* gray placeholder which will become visible when dragging */
        background-color: var(--color-bg-actionable-subtle-hover);
        border-radius: var(--radius-large);
    }

    /* Remover styles */
    :where(.choice) :global(.remover) {
        @add-mixin outline-focus var(--border-medium); /* adds position: relative */
    }
    .remover {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 0;
        right: 0;
        max-width: 4rem;
        min-width: 2rem;
        width: calc(var(--draw-height) / 2 + var(--border-medium));
        max-height: 4rem;
        min-height: 2rem;
        height: calc(var(--draw-height) / 2 + var(--border-medium));
        background-color: var(--color-bg-actionable-secondary);
        border: var(--border-medium) solid var(--color-border-default);
        color: inherit;
        cursor: pointer;
        padding: 1px;
        @add-mixin flex-center-center;

        &:before {
            /* hitbox */
            @add-mixin offset-rectangle calc(-1 * (var(--placed-border-size) + var(--border-medium)));
        }

        & > .icon-wrapper {
            position: absolute;
            height: 100%;
            width: 100%;
            border: var(--border-medium) solid var(--color-bg-default);
        }
    }
</style>

<!-- ui-core drag-drop requires draggable to be wrapped into droparea, so 2 dragAndDropAction hooks -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="choice"
    class:placed
    class:selected
    class:targetable
    class:targeted
    class:dragging
    class:last={amount === 1}
    class:disabled
    class:hovered
    style={cssStyle}
    bind:this={containerElement}
    use:setupDroparea={{ dropareaRegistry, areaKey: gapKey, key: !disabled ? key : void 0 }}
    use:dragAndDropAction={{
        draggableGroupKey,
        dropArea: true,
        key: `da_${gapKey || 'choice'}_${draggableGroupKey}_${key}`,
        disabled
    }}
    on:mouseenter={!disabled ? handleMouseenter : void 0}
    on:mouseleave={!disabled ? handleMouseleave : void 0}
    on:mousedown={!disabled ? handleMousedown : void 0}
    on:dragOver={!disabled ? handleDragOver : void 0}
    on:dragOut={!disabled ? handleDragOut : void 0}
    on:drop={!disabled ? handleDrop : void 0}>
    <div
        class="drag-anchor"
        {tabindex}
        role="button"
        aria-label="{ariaLabel}, {ariaDescribedBy}"
        aria-grabbed={false}
        aria-disabled={disabled ? true : void 0}
        on:keyup={!disabled ? handleKeyup : void 0}
        on:keydown={!disabled ? handleKeydown : void 0}
        on:click|stopPropagation={!disabled ? handleClick : void 0}
        use:dragAndDropAction={{
            draggableGroupKey,
            draggable: true,
            key: `${gapKey || 'choice'}__${draggableGroupKey}__${key}`,
            disabled
        }}
        on:dragStart={!disabled ? handleDragStart : void 0}
        on:dragStop={!disabled ? handleDragStop : void 0}
        on:dragMove={!disabled ? handleDragMove : void 0}>
        <div class="drag-anchor-content">
            <div class="outline-container">
                <img class="image" alt={ariaLabel} {src} aria-hidden={true} on:load on:error />
            </div>
        </div>
    </div>
    {#if placed}
        <button
            class="remover"
            tabindex="-1"
            aria-label={removerAriaLabel}
            aria-disabled={disabled ? true : void 0}
            on:click|stopPropagation={!disabled ? handleRemoverClick : void 0}
            on:keydown={!disabled ? handleKeydown : void 0}
            on:keyup={!disabled ? handleRemoverKeyup : void 0}>
            <div class="icon-wrapper"></div>
            <Icon name="remove-12" aria-hidden={true} />
        </button>
    {/if}
</div>
