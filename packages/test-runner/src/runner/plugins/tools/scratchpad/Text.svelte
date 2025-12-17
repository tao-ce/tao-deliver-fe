<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2024 (original work) Open Assessment Technologies SA ;

    import { createEventDispatcher, onDestroy, tick } from 'svelte';
    import { getDefaultRemSizePx } from '@oat-sa-private/ui-core';

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
     * Component is used to draw/display text in foreignObject
     * @property {string} [key=''] instance key
     * @property {DrawingGeometry} [drawingGeometry=null] details of draw start
     * @property {Geometry} [geometry=null] individual shape props
     * @property {string} [content=''] text content
     * @property {boolean} [selected=false] selected state of the shape
     * @property {boolean} [hoverable=false] selected state of the shape
     * @property {boolean} [editable=true]
     * @fires 'finishEditing' when editing has finished
     * @fires 'editing' when the content has been edited
     */

    const defaultPxInRem = getDefaultRemSizePx();
    const minWidth = 1 * defaultPxInRem;
    const hitboxOffset = 1 * defaultPxInRem;
    const minHeight = 3 * defaultPxInRem;
    const dispatch = createEventDispatcher();

    export let key = '';
    export let content = '';
    export let drawingGeometry = null;
    export let geometry = null;
    export let selected = false;
    export let hoverable = false;
    export let editable = true;

    let x;
    let y;
    let width;
    let height;
    let startX;
    let startY;
    let initialPointerX;
    let initialPointerY;
    let textContainer;
    let wrapperElement;
    let currentContent;
    let windowMouseupListenerAttached = false;

    if (drawingGeometry) {
        startX = drawingGeometry.drawAreaStartX;
        startY = drawingGeometry.drawAreaStartY;
        x = startX;
        y = startY;
        initialPointerX = drawingGeometry.initialPointerX;
        initialPointerY = drawingGeometry.initialPointerY;
        width = minWidth;
        height = minHeight;

        currentContent = content;
        selected = true;
        editable = true;
    } else if (geometry) {
        x = geometry.x;
        y = geometry.y;
        width = geometry.width;
        height = geometry.height;
    }

    $: if (wrapperElement && textContainer) {
        if (selected && editable) {
            if (textContainer.innerText) {
                // Tick needed for Safari to select text on first click
                tick().then(() => {
                    selectText();
                });
            }
            textContainer.focus();
            currentContent = textContainer.innerText;
            //attach mouseup listener
            attachMouseupListener();
        } else {
            //init textContainer content for non-editable
            textContainer.innerText = content;
        }
    }

    /**
     * Handles click outside
     * @param {PointerEvent} e
     */
    function handleWindowMouseup(e) {
        if (wrapperElement && !wrapperElement.contains(e.target)) {
            finishEditing();
        }
    }

    /**
     * Calculates component details based on current size of contenteditable container and content
     */
    function edit() {
        const wrapperRect = wrapperElement.getBoundingClientRect();
        width = Math.ceil(wrapperRect.width); // round up to stop Safari wrapping text lines too early
        height = wrapperRect.height;
        currentContent = textContainer.innerText;

        dispatch('editing', { content: currentContent, geometry: { width, height, x, y }, key, selected });
    }

    /**
     * Click handler
     * @param {PointerEvent} e
     */
    function handleClick(e) {
        if (hoverable) {
            //control should be passed up
            dispatch('click');
        } else {
            selected = true;
            e.stopPropagation();
        }
    }

    /**
     * Handler for pointerdown event to avoid its propagation to container
     * @param {PointerEvent} e
     */
    function handlePointerDown(e) {
        if (selected && editable) {
            e.stopPropagation();
        }
    }

    /**
     * Paste only text into container
     * @param {PasteEvent} e
     */
    function handlePaste(e) {
        let clipboardContent = '';
        const clipboardData = e.clipboardData || window.clipboardData;
        if (clipboardData) {
            clipboardContent = clipboardData.getData('text/plain');
        }
        if (!clipboardContent && window.navigator) {
            window.navigator.clipboard.readText().then(clipText => (clipboardContent = clipText));
        }

        const selection = window.getSelection();
        if (!selection.rangeCount) {
            textContainer.innerText = clipboardContent;
        } else {
            selection.deleteFromDocument();
            selection.getRangeAt(0).insertNode(document.createTextNode(clipboardContent));
            selection.collapseToEnd();
        }
        edit();
    }

    /**
     * Handles the editable container blur
     * @fires finishEditing
     */
    function finishEditing() {
        detachMouseupListener();
        if ((currentContent && currentContent.length) || key) {
            dispatch('finishEditing', {
                geometry: { x, y, width, height },
                content: currentContent,
                key
            });
        } else {
            dispatch('finishEditing', false);
        }
    }

    /**
     * Selects text inside editable
     */
    function selectText() {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textContainer);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Attaches window mouseup listener
     */
    function attachMouseupListener() {
        if (!windowMouseupListenerAttached) {
            window.addEventListener('mouseup', handleWindowMouseup, true);
            window.addEventListener('touchend', handleWindowMouseup, true);
        }
    }

    /**
     * Detaches window mouseup listener
     */
    function detachMouseupListener() {
        window.removeEventListener('mouseup', handleWindowMouseup, true);
        window.removeEventListener('touchend', handleWindowMouseup, true);
    }

    onDestroy(() => {
        detachMouseupListener();
    });
</script>

<style>
    .foreign {
        --rem: 8px;
        line-height: 1.5; /* fixes shifting when defult line-height changes */

        & .editable-wrapper {
            position: relative;
            display: inline-block;
            padding: var(--rem);

            /* do not inherit font styles, otherwise width/height would need to be recalculated when default font changes */
            /* defining styles here, not on `span`, somewhat fixes shifting when big rem scale */
            font-size: calc(2 * var(--rem));
            line-height: 1.5;
            font-family: var(--default-font-ui);
            letter-spacing: normal;
            word-spacing: normal;

            & > span {
                user-select: none;
                pointer-events: auto;
                background-color: transparent;
                min-width: var(--rem);
                min-height: calc(3 * var(--rem));
                border: calc(0.25 * var(--rem)) solid transparent;
                padding: 0 calc(0.25 * var(--rem)) 0 0;
                display: inline-block;
                white-space: pre-wrap;

                font-size: inherit;
                line-height: inherit;
                font-family: inherit;
                letter-spacing: inherit;
                word-spacing: inherit;

                &:focus {
                    outline: none;
                }
            }
            & .resize-anchor {
                display: none;
                position: absolute;
                right: calc(0.75 * var(--rem));
                top: calc(50% - (0.3125rem * var(--rem)));
                width: calc(0.625 * var(--rem));
                height: calc(0.625 * var(--rem));
                z-index: var(--layer-1);
                border: calc(0.125 * var(--rem)) solid var(--color-border-default);
                background-color: var(--color-bg-default);
            }
        }
        &.selected {
            pointer-events: none;
            user-select: none;
            width: 100%;
            height: 100%;
            & .editable-wrapper {
                & > span {
                    border: calc(0.25 * var(--rem)) solid var(--color-brand);
                }
                & .editable {
                    user-select: text;
                }
                & .resize-anchor {
                    display: block;
                }
            }
        }
        /* use this mediaquery to disable misleading hover behavior on touch devices */
        @media (hover: hover) and (pointer: fine) {
            &.hoverable .editable-wrapper:hover > span {
                border: calc(0.25 * var(--rem)) solid var(--color-brand-hover);
            }
        }
    }
</style>

<foreignObject
    class="shape foreign"
    class:selected
    class:hoverable
    x={(selected ? 0 : x) - hitboxOffset}
    y={(selected ? 0 : y) - hitboxOffset}
    width={selected ? '100%' : width + hitboxOffset}
    height={selected ? '100%' : height + hitboxOffset}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="editable-wrapper"
        style={`margin-left: ${selected ? x : 0}px; margin-top: ${selected ? y : 0}px; --rem: ${defaultPxInRem}px;`}
        bind:this={wrapperElement}
        on:click={handleClick}
        on:mousedown>
        <span
            xmlns="http://www.w3.org/1999/xhtml"
            class:editable
            contenteditable={selected && editable}
            bind:this={textContainer}
            on:input={edit}
            on:mousedown={handlePointerDown}
            on:touchdown={handlePointerDown}
            on:paste|preventDefault={handlePaste}
            on:drop|preventDefault
            on:dragend|preventDefault
            tabindex="-1">{content}</span>
        <div class="resize-anchor" />
    </div>
</foreignObject>
