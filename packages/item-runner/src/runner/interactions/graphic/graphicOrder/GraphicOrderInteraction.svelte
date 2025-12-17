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
    import choiceFeedbackFactory from '../../feedback/choiceFeedbackHelper.js';
    import AtomicAriaLive from '../../AtomicAriaLive.svelte';
    import { getInteractionStateStore } from '../../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../../itemSessionStatus.js';
    import { hasClass } from '../../util/attributes.js';
    import { calculateScalingFactor, getScaledCoords, getUsableHeight } from '../util/scaling.js';
    import { isRTLElement } from '../util/focusorder.js';
    import ariaHelperFactory from './util/ariaHelper.js';
    import forwardFocusToChoice from '../util/actions/forwardFocusToChoice.js';
    import arrowKeysFocusLoop from '../util/actions/arrowKeysFocusLoop.js';
    import preventSpaceScroll from '../../util/actions/preventSpaceScroll.js';
    import resizeObserve from '../../util/actions/resizeObserve.js';
    import { DeferredPromise } from '../../util/promise.js';
    import { getContext, onMount } from 'svelte';
    import { resolveImage } from '../util/resolveImage.js';

    const qtiClass = 'qti-graphicOrderInteraction';

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
    export let maxChoices = 0;
    export let minChoices = 0;
    export let classes = '';

    const unselectedHidden = hasClass(classes, 'qti-unselected-hidden');

    // response format:
    const cardinality = 'ordered';
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

    // QTI GraphicOrder spec: if minChoices is unspecified,
    // all of the choices must be ordered and maxChoices is ignored
    if (minChoices <= 0) {
        minChoices = choices.length;
        maxChoices = minChoices;
    }
    if (maxChoices > 0 && maxChoices < minChoices) {
        maxChoices = minChoices;
    }

    const hasValidMax = maxChoices > 0 && maxChoices <= choices.length;
    const sortableListMax = hasValidMax ? maxChoices : choices.length;

    /**
     * Fixed-size ordered list of choices
     * Missing values are represented by null
     * @type {Object[]} - objects of form { 'key': {String} }
     */
    let selected = Array(sortableListMax).fill(null);
    let selectedKeys = [];
    Object.seal(selected); // prevents changing array length

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

    const itemContext = getContext(itemIdentifier);

    //lang
    const instructionsLang = itemContext && itemContext.getInstructionsLang();

    //image loading
    const imageLoadingPromise = new DeferredPromise();
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

    let isInteractionFocused = false; // becomes true when interaction is focused for the first time

    // aria
    const ariaHelper = ariaHelperFactory();
    let announcement;

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    $: disabledBySession = $itemSessionStatusStore === itemSessionStatus.closed;
    $: isMaximumSelected = maxChoices > 0 && selectedKeys.length === maxChoices;

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
     * Regenerate 'selectedKeys' from 'selected' - necessary for rendering
     */
    function updateSelectedKeys() {
        selectedKeys = selected.filter(s => s && s.key).map(s => s.key);
    }

    /**
     * Sets up the 'selected' data holder in the correct format with a provided value or empty
     * @param {String[]} response - ordered list of choice identifiers, as in response
     */
    function setUpSelected(response = []) {
        // prepare nulls to be added at end of list, if needed
        let nulls = [];
        if (response.length < sortableListMax) {
            nulls = Array(sortableListMax - response.length).fill(null);
        }
        selected = [
            ...response.map(key => ({
                key
            })),
            ...nulls
        ];
        Object.seal(selected);
        updateSelectedKeys();
    }

    /**
     * Removes choice from selected array
     * @param {String} choiceKey - key of choice to remove from selected array
     */
    function removeFromSelected(choiceKey) {
        selected = selected.map(item => {
            if (item && item.key === choiceKey) {
                return null;
            }
            return item;
        });
        updateSelectedKeys();

        announcement = ariaHelper.announceRemoved(choiceKey, choices, choiceKeysInTabOrder);
    }

    /**
     * Adds choice to selected array
     * @param {String} choiceKey key of choice to be added to selected array
     * @param {Number} index index to put new member to
     */
    function addToSelected(choiceKey, index) {
        index = index || findSelectedEmptyIndex();
        if (index !== -1) {
            selected[index] = { key: choiceKey };
            selected = selected;
            updateSelectedKeys();

            announcement = ariaHelper.announceAdded(choiceKey, choices, choiceKeysInTabOrder, index + 1);
        } else if (selectedKeys.length === sortableListMax) {
            announcement = ariaHelper.announceMaximum();
        }
    }

    /**
     * Gets the number to display for selected choice
     * @param {Object} choice
     * @returns {Number} - starts at 1
     */
    function getSelectedChoiceIndex(choice) {
        return selected.findIndex(item => item && item.key === choice.key) + 1;
    }

    /**
     * Finds index of first null value in 'selected'
     * @returns {Number}
     */
    function findSelectedEmptyIndex() {
        return selected.findIndex(item => !item);
    }

    /**
     * Load the interaction response
     */
    function loadResponse() {
        // retrieve stored JSON object response and decode it
        let storedResponse = interactionStateStore.getResponseValue();

        const interactionState = interactionStateStore.get();
        if (storedResponse) {
            if (interactionState.selected) {
                selected = interactionState.selected;
                updateSelectedKeys();
            } else {
                setUpSelected(storedResponse);
            }
        }
    }

    /**
     * Format and store selected value in interactionStateStore
     */
    function storeResponse() {
        interactionStateStore.update({ selected });
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: selectedKeys
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
        if (maxChoices > 0 && selectedKeys.length > maxChoices) {
            return false;
        }
        if (minChoices > 0 && selectedKeys.length < minChoices) {
            return false;
        }
        return true;
    }

    // instantiate feedback helper:
    const setConstraintsFeedback = choiceFeedbackFactory(
        maxChoices,
        minChoices,
        qtiMaxChoicesMessage,
        qtiMinChoicesMessage
    );
    $: ({ maxChoicesFeedback, minChoicesFeedback } = setConstraintsFeedback(selectedKeys.length));

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
     * Adds or removes the actioned choice from the 'selected' list
     * @param {Event} event
     */
    function handleChoiceChange(event) {
        const choiceKey = event.detail.key;

        hasFocus = focusChoiceWithKey(choiceKey);

        if (selectedKeys.includes(choiceKey)) {
            removeFromSelected(choiceKey);
        } else {
            addToSelected(choiceKey);
        }
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
     * Gets from a helper the full aria label for a choice
     * @param {Object} choice
     * @returns {String|void}
     */
    function getChoiceAriaLabel(choice) {
        if (!choiceKeysInTabOrder) {
            return;
        }
        return ariaHelper.getChoiceAriaLabel({
            choice,
            choiceKeysInTabOrder,
            choiceOrder: getSelectedChoiceIndex(choice),
            nextIndex: findSelectedEmptyIndex(),
            selectable: selectedKeys.length < maxChoices,
            isSelected: selectedKeys.includes(choice.key),
            disabled: disabled || disabledBySession
        });
    }

    onMount(() => {
        updateSelectedKeys();
    });

    /**
     * Dispatches a trace event
     * @param {Object} eventDetail
     */
    function dispatchTraceInteraction(eventDetail) {
        const { target, type, key, clientX, clientY, screenX, screenY } = eventDetail.eventData;
        let position, pressedKey;
        if (type === 'click') {
            position = { clientX, clientY, screenX, screenY };
        } else {
            pressedKey = key;
        }
        const detail = {
            target,
            domEventType: type,
            qtiChoiceIdentifier: eventDetail.key,
            newResponse: interactionStateStore.getResponseValue(),
            ...(position && { position }),
            ...(pressedKey && { pressedKey })
        };

        const interactionEvent = new CustomEvent('interactiontrace', { detail });
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
        type="choices"
        {qtiMaxChoicesMessage}
        {qtiMinChoicesMessage}
        {isInteractionFocused}
        {interactionElement}
        selectedNumber={selectedKeys.length}
        lang={instructionsLang} />

    <AtomicAriaLive {announcement} lang={instructionsLang} />

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
                    use:arrowKeysFocusLoop={{ focusChoiceWithKey, choiceKeysInTabOrder, lastFocusedChoiceKey, isRTL }}
                    use:preventSpaceScroll
                    on:setHasFocus
                    on:setLastFocusedChoiceKey>
                    {#each choices as choice (choice.key)}
                        <HotspotChoice
                            key={choice.key}
                            shape={choice.shape}
                            coords={getScaledCoords(choice.coords, scalingFactor)}
                            label={`${getSelectedChoiceIndex(choice, selected)}`}
                            instructions={getChoiceAriaLabel(choice, selected, disabledBySession, choiceKeysInTabOrder)}
                            {instructionsLang}
                            invisible={unselectedHidden}
                            selected={selectedKeys.includes(choice.key)}
                            disabled={disabled ||
                                disabledBySession ||
                                (isMaximumSelected && !selectedKeys.includes(choice.key))}
                            on:mount|once={event => (choice.svg = event.detail.svgGroup)}
                            on:change={handleChoiceChange} />
                    {/each}
                </g>
            </Svg>
        </div>
    </div>
</div>
