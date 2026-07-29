<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;
    import { getActualKey, generateElementId, tabFocus } from '@oat-sa-private/ui-core';
    import Prompt from '../../Prompt.svelte';
    import ChoiceFeedbackBlock from '../../feedback/ChoiceFeedbackBlock.svelte';
    import { feedbackTypes } from '../../feedback/choiceFeedbackHelper.js';
    import MiniPins from './MiniPins.svelte';
    import TutorialLayer from './TutorialLayer.svelte';
    import Svg from '../Svg.svelte';
    import Marker from './Marker.svelte';
    import { hitbox } from './resources/pins.js';
    import { getContext, tick } from 'svelte';
    import { isEqual } from 'lodash';
    import { getInteractionStateStore } from '../../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';
    import { calculateScalingFactor, getUsableHeight } from '../util/scaling.js';
    import preventSpaceScroll from '../../util/actions/preventSpaceScroll.js';
    import resizeObserve from '../../util/actions/resizeObserve.js';
    import { DeferredPromise } from '../../util/promise.js';
    import { resolveImage } from '../util/resolveImage.js';

    const qtiClass = 'qti-selectPointInteraction';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let dir;

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // data attributes
    export let dataAttrs = {};
    const qtiMaxChoicesMessage = dataAttrs['data-max-selections-message'];
    const qtiMinChoicesMessage = dataAttrs['data-min-selections-message'];

    // interaction-level QTI attributes:
    export let minChoices = 0;
    export let maxChoices = 0;
    export let disabled = false;
    export let prompt;
    export let classes = '';

    /**
     * @typedef ImgObject - background image of the graphic interaction
     * @property {String} data - equivalent to src
     * @property {Number} width
     * @property {Number} height
     */
    /**
     * @type {ImgObject}
     */
    export let imgObject;

    // response format:
    export let cardinality = maxChoices === 1 ? 'single' : 'multiple';
    const baseType = 'point';

    const imageLoadingPromise = new DeferredPromise();
    const itemContext = getContext(itemIdentifier);
    const imgSrc = resolveImage(itemContext, imgObject.data);

    itemContext.registerLoadingElement(imageLoadingPromise.promise);

    //adjust constraints; invalid constraint means no constraint
    if (minChoices > 0 && maxChoices > 0 && minChoices > maxChoices) {
        minChoices = 0;
        maxChoices = cardinality === 'single' ? 1 : 0;
    }

    /**
     * @typedef {Object} Point - rendered by the Marker component
     * @property {Number[]} coords - [x,y]; top left of SVG is [0,0]
     * @property {String} key - identifier
     */
    /**
     * @type {Point[]} - holds the user's placed marker points
     */
    let points = [];

    let focusedKey; // key of the current focused marker
    let selectedKey; // key of the current focused and selected marker

    let clickDisabledByDrag = false;
    let isInteractionFocused = false; // becomes true when interaction is focused for the first time

    let interactionElement;
    let qtiBlockElement;
    let groupElement;

    let tutorialVisible = false;

    let windowHeight;
    let containerWidth;
    // scaling values:
    let scalingFactor = 1;
    let imgWidth = imgObject.width;
    let imgHeight = imgObject.height;
    // stop the marker coords going too high:
    let maxX = imgWidth - 1;
    let maxY = imgHeight - 1;

    // The bayAttrs are used to provide some space outside the image for pin placement
    // Extra padding is added here to avoid clipping the edges of focused or selected pins
    const padding = {
        horizontal: 4,
        vertical: 4
    };
    const bayAttrs = {
        related: {
            imgExcessWidth: hitbox.width + padding.horizontal * 2,
            imgExcessHeight: hitbox.height + padding.vertical * 2,
            imgOffsetX: hitbox.width / 2 + padding.horizontal,
            imgOffsetY: hitbox.height + padding.vertical
        }
    };

    const showMiniPins = maxChoices >= 2 && maxChoices <= 10;

    $: if (containerWidth && windowHeight) {
        // scaling calculation for image and coords must account for white space around svg
        const availableWidth = Math.max(0, containerWidth - bayAttrs.related.imgExcessWidth);
        const availableHeight = Math.max(0, getUsableHeight(windowHeight) - bayAttrs.related.imgExcessHeight);

        scalingFactor = calculateScalingFactor(imgObject.width, imgObject.height, availableWidth, availableHeight);

        imgWidth = scalingFactor * imgObject.width;
        imgHeight = scalingFactor * imgObject.height;
        maxX = imgWidth - 1;
        maxY = imgHeight - 1;

        // reposition placed pins
        loadResponse();
    }

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    $: disabledBySession = $itemSessionStatusStore && itemSessionStatusStore.isClosed;
    $: disabledByPropOrSession = disabled || disabledBySession;

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        interactionStateStore.merge({ qtiClass });
        storeResponse();
    }

    // load the response when the store changed
    $: if ($interactionStateStore) {
        loadResponse();
    }

    /**
     * Load the interaction response
     * (wrap string response identifier into array of identifiers if cardinality single)
     */
    function loadResponse() {
        let storedResponse = interactionStateStore.getResponseValue();

        if (typeof storedResponse === 'undefined' || storedResponse === null) {
            points = [];
            return;
        }

        if (cardinality === 'single' && storedResponse && storedResponse.length) {
            storedResponse = [storedResponse];
        }

        const scaleSingleCoordinate = coord => Math.round(parseInt(coord, 10) * scalingFactor);

        const formatCoordinatePair = coordinatePair => coordinatePair.map(scaleSingleCoordinate);

        // creates attributes for when a new point is added
        const newPointAttrs = () => ({
            key: generateElementId('point')
        });

        /**
         * @typedef {Number[]} coordinatePair - in the form [x,y]
         */

        if (!points.length) {
            points = storedResponse.map(coordinatePair =>
                Object.assign(
                    {},
                    {
                        coords: formatCoordinatePair(coordinatePair)
                    },
                    newPointAttrs()
                )
            );
        } else {
            //if Marker re-renders while drag is in progress, it will lose its position
            const newPoints = storedResponse.map((coordinatePair, i) =>
                Object.assign({}, points[i], {
                    coords: formatCoordinatePair(coordinatePair)
                })
            );
            if (!isEqual(points, newPoints)) {
                points = newPoints;
            }
        }
    }

    /**
     * Format and store selected value in interactionStateStore
     * (unpack array of identifiers to single string identifier if cardinality single)
     */
    function storeResponse() {
        let value = points.map(point => point.coords.map(coord => Math.round(coord / scalingFactor)));

        if (cardinality === 'single') {
            if (value.length) {
                value = value[0];
            } else {
                value = null;
            }
        }

        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value
            },
            // validity:
            getValidity()
        );
    }

    /**
     * Get the validity of the current state
     * @returns {Boolean}
     */
    function getValidity() {
        if (maxChoices > 0 && points.length > maxChoices) {
            return false;
        }
        if (minChoices > 0 && points.length < minChoices) {
            return false;
        }
        return true;
    }

    /**
     * Gets point by its key
     * @param {String} key
     * @returns {Object}
     */
    function getPointByKey(key) {
        return points.find(point => point.key === key);
    }

    /**
     * Handle keydown events on container
     * - For arrow navigation
     * @param {KeyboardEvent} e
     */
    function handleKeyDown(e) {
        const pressedKey = getActualKey(e);
        const step = e.shiftKey ? 1 : 10;

        if (selectedKey) {
            const selectedPoint = getPointByKey(selectedKey);
            switch (pressedKey) {
                case 'down':
                    selectedPoint.coords[1] = Math.min(maxY, selectedPoint.coords[1] + step);
                    e.preventDefault();
                    storeResponse();
                    break;

                case 'up':
                    selectedPoint.coords[1] = Math.max(0, selectedPoint.coords[1] - step);
                    e.preventDefault();
                    storeResponse();
                    break;

                case 'left':
                    selectedPoint.coords[0] = Math.max(0, selectedPoint.coords[0] - step);
                    e.preventDefault();
                    storeResponse();
                    break;

                case 'right':
                    selectedPoint.coords[0] = Math.min(maxX, selectedPoint.coords[0] + step);
                    e.preventDefault();
                    storeResponse();
                    break;

                case 'esc':
                    selectedKey = null;
                    break;
            }
            points = points;
        }
    }

    /**
     * Handle keyup events on container
     * - For selecting and deselecting marker
     * - To add a new point
     * - For deleting selected marker
     * @param {KeyboardEvent} e
     */
    function handleKeyUp(e) {
        const pressedKey = getActualKey(e);

        switch (pressedKey) {
            case 'space':
            case 'enter':
                if (selectedKey) {
                    selectedKey = null;
                } else if (focusedKey) {
                    selectedKey = focusedKey;
                } else {
                    addNewPoint(Math.round(imgWidth / 2), Math.round(imgHeight / 2), true);
                }
                break;

            case 'backspace':
            case 'delete':
                if (focusedKey) {
                    points = points.filter(point => point.key !== focusedKey);
                    storeResponse();
                    focusedKey = null;
                    selectedKey = null;
                    qtiBlockElement.focus();
                }
                break;
        }
    }

    /**
     * Handle blur event on container
     * Restores components to non-interacting states
     */
    function handleBlur() {
        hideTutorial();
        focusedKey = null;
        selectedKey = null;
    }

    /**
     * @param {CustomEvent} e
     */
    function handleMarkerFocus(e) {
        focusedKey = e.detail.key;
    }

    /**
     * @param {CustomEvent} e
     */
    function handleMarkerBlur(e) {
        if (focusedKey === e.detail.key) {
            focusedKey = null;
        }
        if (selectedKey) {
            selectedKey = null;
        }
    }

    /**
     * @param {CustomEvent} e
     */
    function handleMarkerClick(e) {
        isInteractionFocused = true;
        if (selectedKey) {
            selectedKey = null;
        } else {
            points = points.filter(point => point.key !== e.detail.key);
            storeResponse();
        }
    }

    /**
     * @param {CustomEvent} e
     */
    function handleMarkerDragEnd(e) {
        const foundPoint = points.find(point => point.key === e.detail.key);
        if (foundPoint) {
            foundPoint.coords[0] = parseInt(e.detail.x, 10);
            foundPoint.coords[1] = parseInt(e.detail.y, 10);
        }

        storeResponse();

        points = points;

        //this fixes the firefox behaviour when click event gets fired
        //right after the dragEnd event
        clickDisabledByDrag = true;
        setTimeout(() => {
            clickDisabledByDrag = false;
        }, 0);
    }

    /**
     * Add a new point at (x,y) to the response
     * New Marker will be focused, and optionally selected
     * @param {Number} x
     * @param {Number} y
     * @param {Boolean} [makeSelected=true]
     */
    function addNewPoint(x, y, makeSelected = true) {
        hideTutorial();

        // block going above maxChoices, if set
        if (maxChoices > 0 && points.length >= maxChoices) {
            return;
        }

        const pointKey = generateElementId('point');
        points.push({
            coords: [x, y],
            key: pointKey
        });
        points = points;

        storeResponse();

        // focus and select:
        tick().then(() => {
            const markerElement = groupElement.querySelector(`[data-point-key="${pointKey}"]`);
            //makeSelected is used for keyboard operation, – we make this one selected to enable moving it around
            if (markerElement && makeSelected) {
                markerElement.focus();
                selectedKey = pointKey;
            }
        });
    }

    /**
     * Handler for background image load event
     */
    function handleBackgroundImageLoad() {
        imageLoadingPromise.resolve();
    }

    /**
     * Handler for background image load error
     * @param {CustomEvent} e - {detail: Error}
     */
    function handleBackgroundImageError(e) {
        imageLoadingPromise.reject(e.detail);
    }

    /**
     * Handler for background click
     * @param {MouseEvent} e
     */
    function handleBackgroundClick(e) {
        if (selectedKey) {
            selectedKey = null;
        } else if (!clickDisabledByDrag) {
            // it was really a click
            const x = e.offsetX - bayAttrs.related.imgOffsetX;
            const y = e.offsetY - bayAttrs.related.imgOffsetY;
            // was it within image bounds?
            if (x >= 0 && x < imgWidth && y >= 0 && y < imgHeight) {
                if (maxChoices === 1 && points.length === 1) {
                    // remove an existing point before placing new point
                    points = [];
                }
                addNewPoint(x, y, false);
            }
        }
    }

    /**
     * Flag that focus jumps inside interaction
     */
    function handleInteractionFocusIn() {
        isInteractionFocused = true;
    }

    /**
     * Measure interaction container's width
     * @param {CustomEvent} e
     */
    function handleInteractionResized(e) {
        const { width } = e.detail;
        if (width) {
            containerWidth = width;
        }
    }

    /**
     * Show the tutorial/instructions layer
     */
    function showTutorial() {
        if (points.length === 0) {
            tutorialVisible = true;
        }
    }

    /**
     * Hide the tutorial/instructions layer
     */
    function hideTutorial() {
        tutorialVisible = false;
    }
</script>

<style>
    .info-area {
        display: flex;

        & :global(.feedback) {
            margin: 0;
            width: auto;
        }
        &.with-pins {
            & :global(.feedback) {
                text-align: start;
            }
        }
        /* feedback and minipins share row space at larger sizes */
        & :global(.qti-instruction-container) {
            flex-grow: 1;
            margin: 0;
        }
        & :global(.qti-instruction-container:empty) {
            display: none;
        }
        & :global(.mini-pins) {
            flex-grow: 0;
            max-width: 50%;
            margin: 0;
        }
    }

    .qti-interaction.no-pins {
        & :global(.qti-prompt) {
            margin-block-end: 0.2rem;
        }
    }

    /* Prevent from showing the instructions and the constraints */
    :global(.qti-item.remove-instructions) .qti-interaction.qti-selectPointInteraction .info-area {
        display: none;
    }

    /* feedback and minipins should wrap on small screens */
    @media screen and (--mq-maxwidth-medium) {
        .info-area {
            flex-direction: column;

            &.with-pins {
                & :global(.qti-instruction-container) {
                    margin-bottom: 0;
                }

                & :global(.feedback) {
                    text-align: center;
                }
            }
            & :global(.mini-pins) {
                flex-grow: 1;
                max-width: 100%;
            }
        }
    }

    .qti-block {
        /* qti-block needs to tightly wrap SVG, so TutorialLayer aligns correctly */
        display: inline-block;
        position: relative;

        &:focus {
            outline: none;
        }
        &:focus-visible {
            @add-mixin simple-outline var(--color-border-focus), var(--space-quarter);
        }

        & :global(.tutorial-layer) {
            position: absolute;
        }
    }
</style>

<svelte:window bind:innerHeight={windowHeight} />

<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    class:no-pins={!showMiniPins}
    bind:this={interactionElement}
    use:resizeObserve={handleInteractionResized}
    on:focusin|once={handleInteractionFocusIn}
    lang={language}
    {id}
    {dir}
    {role}
    aria-disabled={disabledByPropOrSession}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}

    <div class="info-area" class:with-pins={showMiniPins}>
        <ChoiceFeedbackBlock
            {maxChoices}
            {minChoices}
            type={feedbackTypes.placeAnswers}
            {qtiMaxChoicesMessage}
            {qtiMinChoicesMessage}
            {isInteractionFocused}
            {interactionElement}
            selectedNumber={points.length}
            lang={itemContext && itemContext.getInstructionsLang()} />
        {#if showMiniPins}
            <MiniPins used={points.length} unused={Math.max(0, maxChoices - points.length)} />
        {/if}
    </div>

    <div class="qti-flow-container">
        <!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-static-element-interactions -->
        <div
            class="qti-block"
            tabindex="0"
            bind:this={qtiBlockElement}
            use:tabFocus
            on:tabfocus={!disabledByPropOrSession && showTutorial}
            on:blur={!disabledByPropOrSession && handleBlur}
            on:keydown={!disabledByPropOrSession && handleKeyDown}
            on:keyup={!disabledByPropOrSession && handleKeyUp}>
            {#if tutorialVisible}
                <TutorialLayer />
            {/if}
            <Svg
                {itemIdentifier}
                {imgWidth}
                {imgHeight}
                {imgSrc}
                {bayAttrs}
                on:click={!disabledByPropOrSession && handleBackgroundClick}
                on:backgroundImageLoad={handleBackgroundImageLoad}
                on:backgroundImageError={handleBackgroundImageError}>
                <g slot="content" bind:this={groupElement} use:preventSpaceScroll>
                    {#each points as point (point)}
                        <Marker
                            coords={point.coords}
                            key={point.key}
                            disabled={disabledByPropOrSession}
                            selected={point.key === selectedKey}
                            {maxX}
                            {maxY}
                            on:click={handleMarkerClick}
                            on:dragEnd={handleMarkerDragEnd}
                            on:focus={handleMarkerFocus}
                            on:blur={handleMarkerBlur} />
                    {/each}
                </g>
            </Svg>
        </div>
    </div>
</div>
