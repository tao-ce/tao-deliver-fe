<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2024 (original work) Open Assessment Technologies SA ;
    import { DraggableModal } from '@oat-sa-private/ui-components';
    import ScratchpadTools from './ScratchpadTools.svelte';
    import { __, getPointerEventCoords, generateElementId, getDefaultRemSizePx } from '@oat-sa-private/ui-core';
    import { move, getShapePositionDelta, getShapeBBoxDelta } from './util/geometry.js';
    import { createEventDispatcher } from 'svelte';
    import { cloneDeep } from 'lodash';
    import Shape from './Shape.svelte';
    import Text from './Text.svelte';

    /**
     * Component is used to display scratchpad tools and drawings inside the DraggableModal
     * @property {Number} top top offset of the containing DraggableModal (px)
     * @property {Number} left left offset of the containing DraggableModal (px)
     * @property {Number} width width of DraggableModal (rem)
     * @property {Number} height height of DraggableModal (rem)
     * @property {Object[]} [shapes] to be displayed in svg container
     * @property {Object[]} [texts] to be displayed in svg container
     * @property {Object[]} [tools] tools state
     * @property {Number} [canvasStateStackLength=0] - current canvas states number
     * @property {Number} [canvasStateIndex=0] - current canvas state index
     * @property {Boolean} [enableStateActions=false] - determines if state actions are enabled
     * @property {Object} [canvasViewBox] the viewbox size of the canvas
     * @fires 'close' when container modal is closed
     * @fires 'resize' when container modal is resized
     * @fires 'move' when container modal is moved
     * @fires 'undo' when undo action button is clicked
     * @fires 'redo' when redo action button is clicked
     * @fires 'toolSelect' when scratchpad tool is selected
     * @fires 'change' when shapes state have changed
     * @fires 'updateState' when new canvas state should be added
     */

    const creativeTools = ['rectangle', 'oval', 'line', 'brush'];

    export let top;
    export let left;
    export let width;
    export let height;
    export let shapes = [];
    export let tools;
    export let canvasStateStackLength = 0;
    export let canvasStateIndex = 0;
    export let enableStateActions = false;

    const canvasViewBox = {
        x: 0,
        y: 0,
        width: 3840,
        height: 2160
    };

    //minimum height of the DraggableModal = options height + header height
    let minHeight;

    const dispatch = createEventDispatcher();

    //keep some information while moving shapes
    const movement = {
        moving: false,
        key: false,
        viewBox: { x: 0, y: 0 },
        delta: { x: 0, y: 0 }
    };

    let drewShape;
    let drawArea;
    let shapeContainer;
    let currentTool;
    $: stateActions = enableStateActions ? getStateActions(canvasStateStackLength, canvasStateIndex) : [];
    $: onCurrentToolChange(currentTool);

    /**
     * Handler for Tool selection event
     * @param {CustomEvent} e
     */
    function handleToolSelection(e) {
        tools = e.detail.tools;
        dispatch('toolSelect', { tools });
        currentTool = getCurrentTool();
    }

    /**
     * Current active tool watcher
     * @param {Object} activeTool - current active tool
     */
    function onCurrentToolChange(activeTool) {
        if (!activeTool) {
            return;
        }
        shapes.forEach(shape => {
            if (shape.type === 'text') {
                shape.editable = activeTool.type === 'text';
            }
            shape.hoverable = ['eraser', 'select'].includes(activeTool.type);
            shape.selected = false;
        });
        redrawShapes();
        triggerChange();
    }

    /**
     * Handler for drawing area mousedown event
     * @param {MouseEvent} e event
     */
    function handlePointerDown(e) {
        //act only if tool selected or drawing is not in progress
        if (currentTool && !drewShape) {
            //if we attempting to draw something
            if (creativeTools.includes(currentTool.type)) {
                unselectShapes();
                //check we are operating with left mouse button or single touch
                if (e.buttons === 1 || (e.changedTouches && e.changedTouches.length === 1)) {
                    const drawingGeometry = getDrawingGeometry(e, drawArea);
                    if (currentTool.options && currentTool.options.size) {
                        drawingGeometry.size = currentTool.options.size;
                    }
                    drewShape = new Shape({
                        target: drawArea,
                        props: {
                            drawingGeometry,
                            type: currentTool.type
                        }
                    });
                    // FIXME: 'finishDraw' is firing even there's nothing has been drawn
                    drewShape.$on('finishDraw', finishDrawEvt => {
                        if (finishDrawEvt.detail) {
                            shapes.push(
                                Object.assign(finishDrawEvt.detail, {
                                    key: generateElementId(currentTool.type),
                                    selected: true
                                })
                            );
                        }
                        redrawShapes();
                        triggerUpdate();
                        triggerChange();
                        drewShape.$destroy();
                        drewShape = null;
                    });
                }
            }
        }
    }

    /**
     * Gets the initial coordinates from event and drawing area
     * @param {PointerEvent} e pointer event
     * @param {DOMElement} area draw area
     * @returns {Object} drawingGeometry object
     */
    function getDrawingGeometry(e, area) {
        const { x, y } = getPointerEventCoords(e);
        const { x: drawAreaX, y: drawAreaY } = area.getBoundingClientRect();
        const startX = x - drawAreaX;
        const startY = y - drawAreaY;
        return {
            drawAreaStartX: startX,
            drawAreaStartY: startY,
            initialPointerX: x,
            initialPointerY: y
        };
    }

    /**
     * Handles click on drawing area
     * @param {PointerEvent} e event
     */
    function handleClick(e) {
        if (currentTool) {
            if (currentTool.type === 'text') {
                const drawingGeometry = getDrawingGeometry(e, drawArea);
                const key = generateElementId('text');
                const currentText = new Text({
                    target: drawArea,
                    props: { key, drawingGeometry }
                });

                currentText.$on('finishEditing', ev => {
                    shapes.push({ key, type: 'text' });
                    currentText.$destroy();
                    handleFinishEditing(ev);
                });
                currentText.$on('editing', handleTextEditing);
            } else if (currentTool.type === 'select' && e.target.closest('.shape-container') === null) {
                unselectShapes();
            }
        }
    }

    /**
     * Handler for `finishEditing` event
     * @param {CustomEvent} e event from Text component
     */
    function handleFinishEditing(e) {
        if (e.detail.key) {
            const editedText = findShapeByKey(e.detail.key);
            if (typeof e.detail.content !== 'undefined') {
                editedText.content = e.detail.content;
                editedText.geometry = e.detail.geometry;
            }

            shapes.forEach(shape => (shape.selected = false));
            shapes = shapes.filter(shape => shape.type !== 'text' || (shape.content && shape.content.length));
            triggerUpdate();
            triggerChange();
        }
    }

    /**
     * Used to fire change while editing text
     * @param {CustomEvent} e
     * @fires change
     */
    function handleTextEditing(e) {
        if (e.detail.key) {
            const editedText = findShapeByKey(e.detail.key);
            if (e.detail.content) {
                if (editedText) {
                    Object.assign(editedText, e.detail);
                    triggerChange();
                } else {
                    //while editing the manually created component, we don't change the reference of 'shapes'
                    dispatch('change', {
                        shapes: [...shapes, Object.assign({}, e.detail, { type: 'text' })]
                    });
                }
            }
        }
    }

    /**
     * Finds selected tool in tools
     * @returns {Object}
     */
    function getCurrentTool() {
        if (tools) {
            return tools.find(tool => tool.selected);
        } else {
            return null;
        }
    }

    /**
     * Sets select prop to false to all shapes
     */
    function unselectShapes() {
        shapes.forEach(shape => {
            shape.selected = false;
        });
        redrawShapes();
        triggerChange();
    }

    /**
     * Handler for undo header action button
     */
    function handleUndo() {
        dispatch('undo');
    }

    /**
     * Handler for redo header action button
     */
    function handleRedo() {
        dispatch('redo');
    }

    /**
     * Handler for DraggabelModal resize event
     * @param {CustomEvent} e event
     */
    function handleResize(e) {
        if (e.detail) {
            width = e.detail.width;
            height = e.detail.height;
            top = e.detail.top;
            left = e.detail.left;
            dispatch('resize', { width, height, top, left });
        }
    }

    /**
     * @param {CustomEvent} e finishResizing event
     * @param {Object} shape shape had being resized
     */
    function handleShapeFinishResizing(e, shape) {
        shape.geometry = e.detail.geometry;
        redrawShapes();
        triggerUpdate();
        triggerChange();
    }

    /**
     * Handler for DraggabelModal move event
     * @param {CustomEvent} e event
     */
    function handleMove(e) {
        dispatch('move', { top: e.detail.top, left: e.detail.left });
    }

    /**
     * Handler for close button
     */
    function handleClose() {
        dispatch('close');
    }

    /**
     * Handles header action
     * @param {CustomEvent} e
     */
    function handleModalAction(e) {
        const { key } = e.detail;
        switch (key) {
            case 'undo':
                handleUndo();
                break;

            case 'redo':
                handleRedo();
                break;
        }
    }

    /**
     * Handles ScratchpadTools mount
     * @param {Event} e
     */
    function handleToolsMount(e) {
        const defaultPxInRem = getDefaultRemSizePx();
        const minHeightRem = e.detail.tools.length * (5.5 + 0.125) + 6.5;
        minHeight = minHeightRem * defaultPxInRem;
        currentTool = getCurrentTool();
    }

    /**
     * Trigger reactive redraw of shapes
     */
    function redrawShapes() {
        shapes = shapes;
    }

    /**
     * Triggers the change event with the current shapes without selected, editable and hoverable properties
     */
    function triggerUpdate() {
        /* eslint-disable no-unused-vars */
        dispatch('updateState', {
            shapes: shapes.map(
                ({
                    selected,
                    editable,
                    hoverable,
                    drawingGeometry,
                    ...rest
                    // we have to make a clone of rest properties to unlink geometry property inside
                    // otherwise movement can affect previous states
                }) => cloneDeep(rest)
            )
        });
        /* eslint-enable no-unused-vars */
    }

    /**
     * Triggers the update event with the current shapes
     */
    function triggerChange() {
        dispatch('change', {
            shapes
        });
    }

    /**
     * Handles shape click
     * @param {Object} shape
     * @param {string} shape.key - the key of the clicked shape
     */
    function handleShapeClick({ key } = {}) {
        if (currentTool && currentTool.type === 'eraser') {
            shapes = shapes.filter(shape => shape.key !== key);
            triggerUpdate();
            triggerChange();
        }
    }

    /**
     * Mouse down on a shape
     * @param {MouseEvent} e
     * @param {Object} shape - the targeted shape
     * @param {string} shape.key - the key of the shape
     * @param {string} shape.type - the shape type
     * @param {Object} shape.geometry - the geometry of the shape
     */
    function handleShapeMouseDown(e, { key, type, geometry } = {}) {
        if (currentTool && currentTool.type === 'select') {
            // FIXME: this results in registering movement in handleMouseRelease even if shape wasn't moved
            if (!movement.moving) {
                movement.moving = true;
                movement.key = key;

                //the delta between the mouse and the shape coords
                const { x: deltaX, y: deltaY } = getShapePositionDelta(geometry, e.clientX, e.clientY);
                movement.delta = {
                    x: deltaX,
                    y: deltaY
                };

                //get the delta between the shape and it's bbox (a few pixels due to border or stroke size)
                let shapeBBox = {};
                if (type === 'text') {
                    const containerBbox = shapeContainer.getBoundingClientRect();
                    const bbox = e.target.getBoundingClientRect();
                    shapeBBox.x = bbox.x - containerBbox.x;
                    shapeBBox.y = bbox.y - containerBbox.y;
                } else {
                    let boundingElt = e.target;
                    if (!boundingElt.classList.contains('bounding')) {
                        boundingElt = boundingElt.closest('.shape-container').querySelector('.bounding');
                    }
                    if (boundingElt) {
                        shapeBBox = boundingElt.getBBox();
                    }
                }

                //apply the gap to the viewBox to constraints
                const { x: gapX, y: gapY } = getShapeBBoxDelta(geometry, shapeBBox.x, shapeBBox.y);
                movement.viewBox = {
                    x: canvasViewBox.x - gapX,
                    y: canvasViewBox.y - gapY,
                    width: canvasViewBox.width + gapX,
                    height: canvasViewBox.height + gapY
                };

                shapes.forEach(shape => {
                    if (shape.key === key) {
                        shape.selected = true;
                    } else {
                        shape.selected = false;
                        shape.hoverable = false;
                    }
                });
                redrawShapes();
                triggerChange();
            }
        }
    }

    /**
     * Release the mouse after a move
     */
    function handleMouseRelease() {
        if (movement.moving) {
            movement.moving = false;
            movement.key = false;
            shapes.forEach(shape => {
                shape.hoverable = false;
            });
            redrawShapes();
            triggerUpdate();
            triggerChange();
        }
    }

    /**
     * Moving shapes
     * @param {MouseEvent} e
     */
    function handleMouseMove(e) {
        if (movement.moving !== false) {
            e.preventDefault();
            e.stopPropagation();
            shapes.forEach(shape => {
                if (shape.key === movement.key) {
                    shape.geometry = move(
                        shape.type,
                        shape.geometry,
                        e.clientX - movement.delta.x,
                        e.clientY - movement.delta.y,
                        movement.viewBox
                    );
                    shape.selected = true;
                    if (shape.type === 'text') {
                        shape.editable = false;
                    }
                }
            });
            redrawShapes();
            triggerChange();
        }
    }

    /**
     * Returns state actions based on current canvas state stack length and index of current canvas state
     * @param {Number} currentCanvasStateStackLength
     * @param {Number} currentCanvasStateIndex
     * @returns {Object[]}
     */
    function getStateActions(currentCanvasStateStackLength, currentCanvasStateIndex) {
        const undoAction = {
            key: 'undo',
            label: __('undo'),
            ariaLabel: __('undo'),
            icon: 'revert-16',
            disabled: false
        };
        const redoAction = { key: 'redo', label: __('redo'), ariaLabel: __('redo'), icon: 'redo-16', disabled: false };
        if (currentCanvasStateIndex === 0) {
            undoAction.disabled = true;
        }
        if (currentCanvasStateIndex + 1 === currentCanvasStateStackLength) {
            redoAction.disabled = true;
        }

        return [undoAction, redoAction];
    }

    /**
     * Searches shape with the given key
     * @param {string} key shape key
     * @returns {object} shape (graphic shape or text)
     */
    function findShapeByKey(key) {
        return shapes.find(shape => shape.key === key);
    }
</script>

<style>
    .text-tool {
        cursor: text;
    }
    .eraser-tool {
        /*
                custom cursor is svg of eraser icon urlencoded with width and height set,
                two digits following url are cursor actual position on the image, `pointer` is fallback cursor type
            */
        cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' class='icon medium svelte-1xsi500' width='16' height='16' viewBox='0 0 16 16' aria-hidden='false'%3E%3Ctitle%3EEraser icon%3C/title%3E%3Cpath d='M14.73 5l-3.54-3.57a2 2 0 00-2.83 0L.59 9.21a2 2 0 000 2.79l3 3h11.07v-1H8.52l6.21-6.21a2 2 0 000-2.79zM14 7.09l-3.53 3.53-4.93-4.95 3.53-3.53a1 1 0 011.42 0L14 5.67a1 1 0 010 1.42z'%3E%3C/path%3E%3C/svg%3E")
                4 16,
            pointer;
    }
    .moving {
        cursor: move;
    }
    .scratchpad-container {
        /* typing in "contenteditable" element forcibly scroll svg by browser */
        /* "left", "top", "margins", "offset" or any other properties do not help */
        /* should be remove after autosroll implementation */
        overflow: clip;
        height: 100%;
        /* disable drag guestures for touch devices */
        touch-action: none;
    }

    svg {
        transform-origin: top left;
    }
</style>

<svelte:window on:mouseup={handleMouseRelease} on:mousemove={handleMouseMove} />

<DraggableModal
    title={__('Scratchpad')}
    {top}
    {left}
    {width}
    {height}
    {minHeight}
    noRemScaling={true}
    actions={stateActions}
    on:close={handleClose}
    on:action={handleModalAction}
    on:resize={handleResize}
    on:move={handleMove}
    let:transformScale>
    <div class="scratchpad-container" bind:this={shapeContainer}>
        <ScratchpadTools on:select={handleToolSelection} on:mount={handleToolsMount} {tools} />
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            xmlns:svgjs="http://svgjs.com/svgjs"
            width={canvasViewBox.width}
            height={canvasViewBox.height}
            viewBox="{canvasViewBox.x} {canvasViewBox.y} {canvasViewBox.width} {canvasViewBox.height}"
            class:text-tool={currentTool && currentTool.type === 'text'}
            class:eraser-tool={currentTool && currentTool.type === 'eraser'}
            class:moving={movement.moving}
            style={transformScale !== 1 ? `transform: scale(${1 / transformScale});` : ''}
            bind:this={drawArea}
            on:mousedown={handlePointerDown}
            on:click={handleClick}
            on:touchstart={handlePointerDown}>
            {#each shapes as shape (shape)}
                {#key JSON.stringify(shape.geometry)}
                    {#if shape.type === 'text'}
                        <Text
                            {...shape}
                            on:finishEditing={handleFinishEditing}
                            on:editing={handleTextEditing}
                            on:mousedown={e => handleShapeMouseDown(e, shape)}
                            on:click={() => handleShapeClick(shape)} />
                    {:else}
                        <Shape
                            {...shape}
                            on:mousedown={e => handleShapeMouseDown(e, shape)}
                            on:click={() => handleShapeClick(shape)}
                            on:finishResizing={e => handleShapeFinishResizing(e, shape)} />
                    {/if}
                {/key}
            {/each}
        </svg>
    </div>
</DraggableModal>
