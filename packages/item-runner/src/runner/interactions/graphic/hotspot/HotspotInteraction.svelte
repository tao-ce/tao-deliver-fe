<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;
    import Prompt from '../../Prompt.svelte';
    import Svg from '../Svg.svelte';
    import HotspotChoice from '../HotspotChoice.svelte';
    import ChoiceFeedbackBlock from '../../feedback/ChoiceFeedbackBlock.svelte';
    import { feedbackTypes } from '../../feedback/choiceFeedbackHelper.js';
    import { getInteractionStateStore } from '../../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../../itemSessionStatus.js';
    import { hasClass } from '../../util/attributes.js';
    import { calculateScalingFactor, getScaledCoords, getUsableHeight } from '../util/scaling.js';
    import { getChoiceNumericLabel, isRTLElement } from '../util/focusorder.js';
    import extendAriaLabel from './util/ariaLabelGenerator.js';
    import forwardFocusToChoice from '../util/actions/forwardFocusToChoice.js';
    import { arrowKeysFocusLoop } from '@oat-sa-private/ui-core';
    import preventSpaceScroll from '../../util/actions/preventSpaceScroll.js';
    import resizeObserve from '../../util/actions/resizeObserve.js';
    import { DeferredPromise } from '../../util/promise.js';
    import { getContext } from 'svelte';
    import { resolveImage } from '../util/resolveImage.js';

    const qtiClass = 'qti-hotspotInteraction';

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
    export let dataAttrs = {};

    const qtiMaxChoicesMessage = dataAttrs['data-max-selections-message'];
    const qtiMinChoicesMessage = dataAttrs['data-min-selections-message'];

    // interaction-level QTI attributes:
    export let disabled = false;
    export let prompt;
    export let maxChoices = 1;
    export let minChoices = 0;
    export let classes = '';

    const unselectedHidden = hasClass(classes, 'qti-unselected-hidden');

    // response format:
    export let cardinality = maxChoices === 1 ? 'single' : 'multiple';
    const baseType = 'identifier';

    /**
     * @typedef HotspotChoice - mapped from QTI HotspotChoice
     * @property {String} key
     * @property {String} shape
     * @property {String} coords
     * @property {String} hotspotLabel - for SR
     * @property {Object} [svg] - not passed, but set by interaction
     */
    /**
     * @type {HotspotChoice[]} - from itemData choices
     */
    export let choices = [];

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

    //adjust constraints; invalid constraint means no constraint
    if (maxChoices > 1 && maxChoices >= choices.length) {
        maxChoices = 0;
    }
    if (minChoices > choices.length) {
        minChoices = 0;
        maxChoices = cardinality === 'single' ? 1 : 0;
    }
    if (minChoices > 0 && maxChoices > 0 && minChoices > maxChoices) {
        minChoices = 0;
        maxChoices = cardinality === 'single' ? 1 : 0;
    }

    /**
     * @type {String[]} a new list of the choiceKeys, ordered into tabbing order
     * Initially undefined, but set once only, after all the bounding boxes are known
     */
    let choiceKeysInTabOrder;

    let hasFocus = false;
    let lastFocusedChoiceKey;

    let interactionElement;
    $: isRTL = interactionElement && isRTLElement(interactionElement);

    let windowHeight;
    let containerWidth;
    let imgWidth = imgObject.width;
    let imgHeight = imgObject.height;

    // scaling factor which should be applied to all SVG children
    let scalingFactor = 1;

    //image loading
    const imageLoadingPromise = new DeferredPromise();
    const itemContext = getContext(itemIdentifier);
    const instructionsLang = itemContext && itemContext.getInstructionsLang();
    const imgSrc = resolveImage(itemContext, imgObject.data);
    itemContext.registerLoadingElement(imageLoadingPromise.promise);

    /**
     * Calculate the SVG scaling factor based on document dimensions, and set scaled image dimensions.
     * Must only be run with non-zero containerWidth and windowHeight.
     */
    $: if (containerWidth && windowHeight) {
        const usableHeight = getUsableHeight(windowHeight);
        scalingFactor = calculateScalingFactor(imgObject.width, imgObject.height, containerWidth, usableHeight);
        imgWidth = scalingFactor * imgObject.width;
        imgHeight = scalingFactor * imgObject.height;
    }

    /**
     * selected choice list
     * @type {Set} - initially empty
     */
    let selected = new Set();

    let isInteractionFocused = false; // becomes true when interaction is focused for the first time

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    $: disabledBySession = $itemSessionStatusStore === itemSessionStatus.closed;

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

        if (cardinality === 'single' && storedResponse && storedResponse.length) {
            storedResponse = [storedResponse];
        }

        if (typeof storedResponse === 'undefined' || storedResponse === null) {
            storedResponse = [];
        }
        selected = new Set(storedResponse);
    }

    /**
     * Format and store selected value in interactionStateStore
     * (unpack array of identifiers to single string identifier if cardinality single)
     */
    function storeResponse() {
        let value = Array.from(selected);

        if (cardinality === 'single' && value.length) {
            value = value[0];
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
        if (maxChoices > 0 && selected.size > maxChoices) {
            return false;
        }
        if (minChoices > 0 && selected.size < minChoices) {
            return false;
        }
        return true;
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
     * Toggles the presence of the actioned choice within the `selected` set
     * Enforces the maxChoices limit only if maxChoices is 1
     * @param {Event} event
     */
    function handleChoiceChange(event) {
        const choiceKey = event.detail.key;

        hasFocus = focusChoiceWithKey(choiceKey);

        if (selected.has(choiceKey)) {
            selected.delete(choiceKey);
        } else {
            if (cardinality === 'single' && selected.size === 1) {
                // must not exceed 1 choice in single cardinality: replace set
                selected = new Set([choiceKey]);
            } else {
                selected.add(choiceKey);
            }
        }
        selected = selected;
        storeResponse();

        dispatchTraceInteraction(event.detail);
    }

    /**
     * Flag that focus jumps inside interaction
     */
    function handleInteractionFocusIn() {
        isInteractionFocused = true;
    }

    /**
     * Measure interaction container's width
     * @param {CustomEvent} event
     */
    function handleInteractionResized(event) {
        const { width } = event.detail;
        if (width) {
            containerWidth = width;
        }
    }

    /**
     * Focuses a choice and sets it as the last focused choice
     * Also arranges it to the front
     * @param {String} choiceKey
     * @returns {Boolean} true if focused
     */
    export function focusChoiceWithKey(choiceKey) {
        const thisChoice = choices.find(choice => choice.key === choiceKey);
        if (thisChoice && thisChoice.svg) {
            if (thisChoice.svg.parent) {
                thisChoice.svg.parent('.hotspot-choice').front();
            }
            thisChoice.svg.node.focus();
            return true;
        }
        return false;
    }

    /**
     * Dispatches a trace event
     * @param {Object} eventDetail
     */
    function dispatchTraceInteraction(eventDetail) {
        const eventDetailData = eventDetail.eventData;
        let position, pressedKey;
        if (eventDetailData.type === 'click') {
            position = {
                clientX: eventDetailData.clientX,
                clientY: eventDetailData.clientY,
                screenX: eventDetailData.screenX,
                screenY: eventDetailData.screenY
            };
        } else {
            pressedKey = eventDetailData.key;
        }
        const eventData = {
            detail: {
                target: eventDetailData.target,
                domEventType: eventDetailData.type,
                qtiChoiceIdentifier: eventDetail.key,
                newResponse: [interactionStateStore.getResponseValue()],
                ...(position && { position }),
                ...(pressedKey && { pressedKey })
            }
        };

        const interactionEvent = new CustomEvent('interactiontrace', eventData);
        interactionElement.dispatchEvent(interactionEvent);
    }
</script>

<style>
    .qti-flow-container {
        &:focus {
            outline: none;
        }
        &:focus-visible {
            @add-mixin simple-outline;
        }
    }
</style>

<svelte:window bind:innerHeight={windowHeight} />

<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    lang={language}
    bind:this={interactionElement}
    use:resizeObserve={handleInteractionResized}
    on:focusin|once={handleInteractionFocusIn}
    {id}
    {dir}
    {role}
    aria-disabled={disabled || disabledBySession}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}

    <ChoiceFeedbackBlock
        {maxChoices}
        {minChoices}
        type={feedbackTypes.selectChoices}
        {qtiMaxChoicesMessage}
        {qtiMinChoicesMessage}
        {isInteractionFocused}
        {interactionElement}
        selectedNumber={selected.size}
        lang={itemContext && itemContext.getInstructionsLang()} />

    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <div class="qti-flow-container" tabindex={hasFocus ? '0' : '-1'}>
        <!-- The inner tabstop takes you inside, and the outer tabstop is for getting back out -->
        <div
            class="qti-block"
            tabindex={hasFocus ? '-1' : '0'}
            use:forwardFocusToChoice={{
                choices,
                choiceKeysInTabOrder,
                lastFocusedChoiceKey,
                focusChoiceWithKey,
                hasFocus,
                isRTL
            }}
            on:setHasFocus={e => (hasFocus = e.detail)}
            on:setChoiceKeysTabOrder|once={e => (choiceKeysInTabOrder = e.detail)}
            on:setLastFocusedChoiceKey={e => (lastFocusedChoiceKey = e.detail)}
            on:focus|once={() => (isInteractionFocused = true)}>
            <Svg
                {itemIdentifier}
                {imgWidth}
                {imgHeight}
                {imgSrc}
                on:backgroundImageLoad={handleBackgroundImageLoad}
                on:backgroundImageError={handleBackgroundImageError}>
                <g
                    slot="content"
                    tabindex="-1"
                    use:arrowKeysFocusLoop={{
                        focusByKey: focusChoiceWithKey,
                        keysInTabOrder: choiceKeysInTabOrder,
                        lastFocusedKey: lastFocusedChoiceKey,
                        isRTL
                    }}
                    use:preventSpaceScroll
                    on:setLastFocusedKey={e => (lastFocusedChoiceKey = e.detail)}>
                    {#each choices as choice (choice.key)}
                        <HotspotChoice
                            key={choice.key}
                            shape={choice.shape}
                            coords={getScaledCoords(choice.coords, scalingFactor)}
                            instructions={`${getChoiceNumericLabel(choice, choiceKeysInTabOrder)}, ${extendAriaLabel(
                                disabled,
                                selected.has(choice.key)
                            )}`}
                            {instructionsLang}
                            invisible={unselectedHidden}
                            selected={selected.has(choice.key)}
                            disabled={disabled || disabledBySession}
                            on:mount|once={event => (choice.svg = event.detail.svgGroup)}
                            on:change={handleChoiceChange} />
                    {/each}
                </g>
            </Svg>
        </div>
    </div>
</div>
