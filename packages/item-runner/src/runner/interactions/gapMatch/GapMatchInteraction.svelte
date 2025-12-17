<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { onMount, setContext, getContext } from 'svelte';
    // Store and Session
    import { writable } from 'svelte/store';
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import createChoicesStore from './stores/choices.js';
    import createStateStore from './stores/state.js';
    // Helpers
    import { __, generateElementId, getActualKey, remToPx } from '@oat-sa-private/ui-core';
    import { breakpoints } from '@oat-sa-private/ui-identity';
    import { DraggableList } from '@oat-sa-private/ui-components';
    import FocusHandler from './focus.js';
    // Components
    import Prompt from '../Prompt.svelte';
    import Choice from './Choice.svelte';
    import ItemBlocks from '../../item/blocks/ItemBlocks.svelte';
    import ChoiceFeedbackBlock from '../feedback/ChoiceFeedbackBlock.svelte';
    // Utils
    import preventSpaceScroll from '../util/actions/preventSpaceScroll.js';
    import resizeObserve from '../util/actions/resizeObserve.js';
    import { traceInteraction } from './util.js';
    import shuffleChoiceOptions from '../util/shuffleChoices.js';
    import { areas, getAreasOrder, getPositioning, isVerticalPosition } from '../util/sharedVocabulary.js';

    const qtiClass = 'qti-gapMatchInteraction';

    // response format
    export let cardinality = 'multiple';
    export let baseType = 'directedPair';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    // inherited item-level QTI attributes:
    export let id;
    export let classes = '';
    export let language;
    export let dir;

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // interaction-level QTI attributes:
    export let minAssociations = 0;
    export let maxAssociations = 0; //QTI 2.2 specification contains this attribute, but QTI 2.1 doesn't, so 0 value set for supporting tests based on both the specifications
    export let prompt;
    export let choices = [];
    export let shuffle = false;

    // data attributes
    export let dataAttrs = {};

    // the parsed item body:
    export let blockTree = [];
    export let gaps = [];

    const choiceIdentifiers = choices.map(choice => choice.identifier);
    const gapIdentifiers = gaps.map(gap => gap.identifier);

    const itemContext = getContext(itemIdentifier);
    const instructionsLang = itemContext && itemContext.getInstructionsLang();

    const interactionElementStore = writable(null);
    setContext('interactionElementStore', interactionElementStore);

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    let choiceOptions = choices;
    if (shuffle) {
        /* eslint-disable indent */
        choiceOptions = Array.isArray(choices)
            ? shuffleChoiceOptions(choices, interactionStateStore)
            : shuffleChoiceOptions(Object.keys(choices), interactionStateStore).reduce(
                  (accumulator, key) => ({
                      ...accumulator,
                      [key]: choices[key]
                  }),
                  {}
              );
        /* eslint-enable indent */
    }

    const choicesStore = createChoicesStore();
    choicesStore.init(choiceOptions);
    setContext('choicesStore', choicesStore);

    const activeElementStore = writable(null);
    setContext('activeElementStore', activeElementStore);

    const maxSelectionMessage = dataAttrs['data-max-selections-message'];
    const minSelectionMessage = dataAttrs['data-min-selections-message'];
    const choicesMaxWidthAttr = dataAttrs['data-choices-container-width'];

    // presentation information from the shared vocabulary
    $: qtiPosition = getPositioning(classes);

    // set in which order the choices and answers areas are displayed
    $: areasOrder = getAreasOrder(qtiPosition);

    // interaction-level QTI attributes derived from classes:
    $: isTopChoicesFromClasses = isVerticalPosition(qtiPosition);

    let choicesToRender = choiceOptions;

    // area elements
    let choiceArea;
    // unfortunately we don't have way to understand which gap will be rendered first, to set him tabindex=0
    // so this element will handle focusing flow for gaps
    let answerArea;
    let focusRouterElement; // route focus from answer area to gaps/placeholders
    let interactionElement;

    let itemWidth = remToPx(25); // choice width in list
    let itemHeight = remToPx(4.25); // choice height in list
    let itemWidthTop; //top choices
    let itemHeightTop;
    let itemMaxWidthTop;
    let containerWidthTop;
    let windowWidth = window.innerWidth;
    let keepRowBelowTop = false;
    const choiceMargin = remToPx(2);
    const removeButtonWidth = remToPx(6.25);
    const gapMargin = remToPx(0.5);

    $: isTopChoices = isTopChoicesFromClasses || windowWidth <= breakpoints.width.large;
    $: choiceColumns =
        isTopChoices && containerWidthTop && itemWidthTop
            ? Math.floor((containerWidthTop + choiceMargin) / (itemWidthTop + choiceMargin))
            : 1;

    let selectedChoices; // list of choices which already moved to gaps
    let selectedSnapshot; // snapshot of selectedChoices before last change
    let disabledBySession;
    let focusTracker = null; // handle focus flow
    let isAnswerAreaApplication = false;
    let isInteractionFocused = false; // becomes true when interaction is focused for the first time
    let choicesCount = 0; // number on choices in list which can be matched
    let choiceAreaDroppable = false;
    let availableGaps = 0;

    const answerAreaLabelId = generateElementId('answer-area-label');

    const stateStore = createStateStore();
    setContext('stateStore', stateStore);
    stateStore.init();

    $: cssStyle = [
        `--list-width:${$stateStore.isDragging ? `${$stateStore.gapDimensions.width}px` : 'initial'}`,
        `--item-width-top:${itemWidthTop ? `${itemWidthTop}px` : 'auto'}`,
        `--item-height-top:${itemHeightTop ? `${itemHeightTop}px` : 'auto'}`,
        `--container-width-top: ${containerWidthTop ? `${containerWidthTop}px` : '40rem'}`,
        `--item-max-width-top: ${itemMaxWidthTop ? `${itemMaxWidthTop}` : '33%'}`,
        `--item-max-width-left: ${choicesMaxWidthAttr ? `${choicesMaxWidthAttr}px` : '33%'}`
    ].join(';');

    $: {
        disabledBySession = $itemSessionStatusStore === itemSessionStatus.closed;
        stateStore.setDisabledState(disabledBySession);
    }
    $: if ($interactionStateStore) {
        stateStore.setSelected(loadResponse()); //sync 'stateStore' by values from '$interactionStateStore'
    }
    $: if ($stateStore) {
        selectedSnapshot = $stateStore.selected;
        selectedChoices = $stateStore.selectedChoices;
        choicesToRender = getChoiceToRender(choicesToRender);
        choicesCount = choicesToRender.filter(choice => !choice.removed).length;
        availableGaps = $stateStore.gapsNumber - $stateStore.selectedGaps.length;
    }
    $: if ($activeElementStore) {
        isAnswerAreaApplication = true;
    }
    //when zooming, itemWidth and itemWidthTop can get a bit different in fractions (170.416 vs 170.425)
    $: stateStore.setGapDimensions(
        isTopChoices ? Math.max(itemWidth, itemWidthTop || 0) : itemWidth,
        isTopChoices ? Math.max(itemHeight, itemHeightTop || 0) : itemHeight
    );

    const {
        draggableGroupKey,
        ariaDescribedByContainerIdForUnselectedOptions,
        ariaDescribedByContainerIdForEmptyGap,
        ariaDescribedByContainerIdForMatchedGap
    } = $stateStore;

    const shadowDraggableGroupKey = generateElementId('shadow');
    const ariaLiveContainerId = generateElementId('ariaDescribedBy');

    focusTracker = new FocusHandler();
    setContext('focusTracker', focusTracker); //allow using in any children component

    /**
     * Handle drop to gap
     */
    setContext('handleDrop', function (pairs) {
        const dropAreaKeys = pairs.map(({ dropAreaKey }) => dropAreaKey);
        const newValue = filterResponseByGap(dropAreaKeys);
        pairs.forEach(({ draggableKey, dropAreaKey }) => {
            // if draggableKey is null it means we dont want to add new element to response. Other words - remove pair for 'dropAreaKey'
            if (draggableKey) {
                newValue.push([draggableKey, dropAreaKey]);
            }
        });
        saveResponse(newValue);
        // if all gaps filled - focus answer area
        const filledGaps = loadResponse();
        if (filledGaps.length === $stateStore.gapsNumber) {
            focusTracker.focusAnswerArea();
        }
    });

    onMount(() => {
        // do initial response definition
        // do it here, because 'required' state of gaps can be used only after gap rendering
        if (!interactionStateStore.hasResponse()) {
            interactionStateStore.merge({ qtiClass });
            const response = {
                cardinality,
                baseType,
                value: null
            };
            interactionStateStore.setResponseValue(response, getValidity([]));
        }
        focusTracker.initAreas(choiceArea, answerArea, focusRouterElement);
        interactionElementStore.set(interactionElement);
    });

    /**
     * Check if choice ids and gap ids in response pairs are all valid ids
     * so that response can be discarded if it was corrupted somehow
     * @param {string[][]} responsePairs - formatted for multiple cardinality
     * @returns {Boolean}
     */
    function validateResponsePairs(responsePairs) {
        return responsePairs?.every(pair => choiceIdentifiers.includes(pair[0]) && gapIdentifiers.includes(pair[1]));
    }

    /**
     * Load the interaction response
     * @returns {array}
     */
    function loadResponse() {
        let storedResponse = interactionStateStore.getResponseValue();

        if (typeof storedResponse === 'undefined' || storedResponse === null) {
            storedResponse = [];
        }
        if (cardinality === 'single') {
            storedResponse = [storedResponse];
        }
        if (!validateResponsePairs(storedResponse)) {
            storedResponse = [];
        }

        return storedResponse;
    }

    /**
     * Format and store selected value in interactionStateStore
     * @param {array} value - array of gap and matched choice
     */
    function saveResponse(value) {
        if (!validateResponsePairs(value)) {
            console.error('invalid response detected:', value); // eslint-disable-line no-console
            return;
        }
        const validity = getValidity(value);

        if (value.length === 0) {
            value = null;
        } else {
            value = cardinality === 'single' ? value[0] : value;
        }
        const response = {
            cardinality,
            baseType,
            value
        };
        interactionStateStore.setResponseValue(response, validity);
    }

    /**
     * Get the validity of the current state
     * @param {array} matches - gap and matched choice
     * @returns {Boolean}
     */
    function getValidity(matches) {
        const matchesCount = matches.length;
        let validity = true;

        // validate minAssociations and maxAssociations properties of choices
        if (
            (minAssociations !== 0 && matchesCount < minAssociations) ||
            (maxAssociations !== 0 && matchesCount > maxAssociations)
        ) {
            validity = false;
        }

        if (validity) {
            //pre saved updating selectedChoices only for validation goals. After successful save we also have to call this method
            stateStore.setSelected(matches);
            // validate matchMin and matchMax properties of choices
            validity = Object.entries($choicesStore).every(([choiceId, choice]) => {
                const choiceUsageCount = $stateStore.selectedChoices ? $stateStore.selectedChoices[choiceId] || 0 : 0;
                if (
                    (choice.matchMin !== 0 && choiceUsageCount < choice.matchMin) ||
                    (choice.matchMax !== 0 && choiceUsageCount > choice.matchMax)
                ) {
                    return false;
                }
                return true;
            });
        }
        // check that each required gap has pair in 'matchedGaps'
        if (validity) {
            const matchedGaps = matches.map(pair => pair[1]);
            validity = Object.entries($stateStore.gapRequiredAttribute).every(
                ([gap, required]) => (required && matchedGaps.includes(gap)) || !required
            );
        }

        return validity;
    }

    /**
     * Update choices list and set/remove 'removed' flag
     * @param {array} choicesList - full list of choices
     * @returns {array} - list of modified choices prepared for rendering
     */
    function getChoiceToRender(choicesList) {
        const choicesWithRemovedState = [];
        const choicesWithoutRemovedState = [];
        choicesList.forEach(choice => {
            // choice dropped elsewhere and doesn't belong the list anymore, so we do not render choice, but empty space
            if (
                $stateStore.selectedChoices[choice.identifier] &&
                !(parseInt(choice.matchMax, 10) - $stateStore.selectedChoices[choice.identifier])
            ) {
                choice.removed = true;
                choicesWithRemovedState.push(choice);
                return;
            }
            //choice a part of the list, so we render it
            if (choice.removed) {
                choice.removed = false;
            }
            choicesWithoutRemovedState.push(choice);
        });

        //add 1 dummy row for targetable style
        keepRowBelowTop =
            isTopChoices &&
            choicesWithRemovedState.length > 0 &&
            choicesWithoutRemovedState.length % choiceColumns === 0;

        return [...choicesWithoutRemovedState, ...choicesWithRemovedState];
    }

    /**
     * Return current response without pairs which contains pointed gaps
     * @param {array} gapIds - array of gap identifier ids
     * @returns {array}
     */
    function filterResponseByGap(gapIds) {
        const response = loadResponse();
        // cardinality 'single'
        if (typeof response[0] === 'string') {
            // always empty
            return [];
        }
        return response.filter(pair => !gapIds.includes(pair[1]));
    }

    /**
     * Handle drop in list
     * @param {CustomEvent} e
     */
    function handleDropToList(e) {
        selectedSnapshot = $stateStore.selected;
        const { dropAreaKey } = $activeElementStore;
        const newValue = filterResponseByGap([dropAreaKey]);
        saveResponse(newValue);
        activeElementStore.set(null);
        choiceAreaDroppable = false;
        dispatchTraceInteraction(e);
    }

    /**
     * Focus first element into answer area
     */
    function handleFocus() {
        // focus gap possible only if choice activated
        if (!focusTracker.focusChoiceInFirstGap() && $activeElementStore) {
            focusTracker.focusFirstEmptyGap();
        }
        focusTracker.makeAnswerAreaUnfocusable();
        isAnswerAreaApplication = true;
    }

    /**
     * Handle focus on answer area
     */
    function handleFocusAnswerArea() {
        // if answer area is focused by any way, than focusRouterElement must be focusable
        focusTracker.makeAnswerAreaFocusable();
        isAnswerAreaApplication = false;
    }

    /**
     * Focus previous/next gap
     * @param {CustomEvent} e
     * @returns {Boolean|void}
     */
    function handleKeyDown(e) {
        const keys = {
            left: 'left',
            up: 'up',
            right: 'right',
            down: 'down',
            tab: 'tab'
        };
        const pressedKey = getActualKey(e);

        if (pressedKey === keys.tab) {
            activeElementStore.set(null);
            return true;
        }

        if (!keys[pressedKey]) {
            return false;
        }
        const focusableElements = $activeElementStore
            ? focusTracker.getAllFocusableGaps()
            : focusTracker.getAllFocusableChoicesInGaps();
        const handler = focusTracker.moveFocus(focusableElements);

        if (!handler) {
            return false;
        }
        const isRTL = window.getComputedStyle(e.target).getPropertyValue('direction') === 'rtl';

        switch (pressedKey) {
            case keys.left:
                isRTL ? handler.focusNext() : handler.focusPrevious();
                e.stopPropagation();
                break;
            case keys.up:
                handler.focusPrevious();
                e.stopPropagation();
                break;
            case keys.right:
                isRTL ? handler.focusPrevious() : handler.focusNext();
                e.stopPropagation();
                break;
            case keys.down:
                handler.focusNext();
                e.stopPropagation();
                break;
        }
        dispatchTraceInteraction(e);
    }

    /**
     * Clear activated choice if 'esc' button was pressed
     * @param {KeyboardEvent} e
     */
    const resetActivatedState = function (e) {
        const pressedKey = getActualKey(e);
        if (pressedKey === 'esc' && activeElementStore) {
            const { draggableKey } = $activeElementStore;
            // calculate right message for announcing
            let content = '';
            choiceOptions.some(choice => {
                if (choice.identifier === draggableKey) {
                    content = choice.content;
                    return true;
                }
                return false;
            });

            activeElementStore.set(null);
            stateStore.setConfirmation(__('%s has not been placed.', content));
            focusTracker.focusChoiceListArea();
        }
    };

    /**
     * Clear activated choice if mouse click was out of list and out of gap
     */
    function clearActivatedChoice() {
        activeElementStore.set(null);
        //if we loosing 'tab focus' by mouse click, so we always should restore focusability of answerArea
        focusTracker.makeAnswerAreaFocusable();
    }

    /**
     * Flag that focus jump inside interaction
     */
    function handleInteractionFocusIn() {
        isInteractionFocused = true;
    }

    /**
     * Add 'droppable' styles
     */
    function handleDragOver() {
        choiceAreaDroppable = true;
    }

    /**
     * Remove 'droppable' styles
     */
    function handleDragOut() {
        choiceAreaDroppable = false;
    }

    /**
     * Measure interaction container's width
     * @param {CustomEvent} event
     */
    function handleInteractionResized(event) {
        const { width: interactionWidth } = event.detail;
        if (interactionWidth) {
            if (choicesMaxWidthAttr) {
                containerWidthTop = Math.min(interactionWidth, choicesMaxWidthAttr);
            } else {
                containerWidthTop = interactionWidth;
            }

            if (containerWidthTop < breakpoints.width.medium) {
                if (choicesMaxWidthAttr && interactionWidth > choicesMaxWidthAttr + removeButtonWidth + gapMargin) {
                    itemMaxWidthTop = '100%';
                } else {
                    //gaps/choices in answer-area shouldn't get wider than interaction
                    itemMaxWidthTop = `calc(100% - ${removeButtonWidth + gapMargin}px)`;
                }
            } else if (containerWidthTop < breakpoints.width.large) {
                itemMaxWidthTop = `calc(50% - ${choiceMargin + 1}px)`;
            } else {
                itemMaxWidthTop = `calc(33% - ${choiceMargin + 1}px)`;
            }
        }
    }

    /**
     * Dispatches a trace event
     * @param {CustomEvent} e
     */
    function dispatchTraceInteraction(e) {
        const eventData = traceInteraction(e, $stateStore.selected, selectedSnapshot);
        const interactionEvent = new CustomEvent('interactiontrace', eventData);
        interactionElement.dispatchEvent(interactionEvent);
    }
</script>

<style>
    .qti-gapMatchInteraction {
        --gap-between: 4rem;
        --gap-outer: 1rem;
        --gap-inner: 2.5rem;
        --fontsize-gapmatch: calc(var(--fontsize-body) * 1.25);
        font-size: var(--fontsize-gapmatch);
    }
    .answer-area {
        position: relative;
        color: var(--color-text-default);
        outline: none;
        /* multiplier makes minimal dynamic line-height (1.5) match 5.5rem height of gaps */
        line-height: calc(var(--line-height-default) * 3.67rem);

        &:focus-visible {
            @add-mixin outline-focus-after;
            &::after {
                border-radius: var(--radius-large);
                pointer-events: none;
            }
        }
    }

    .qti-block {
        display: flex;

        & :global(.icon) {
            height: var(--fontsize-gapmatch);
        }
        &.qti-flow-container {
            & :global(.item-btn-container .item-btn) {
                min-height: initial;
                width: auto;
            }
            & :global-nested(.item-btn-container .item-btn .label-container) {
                padding-bottom: 0.25rem;
                padding-top: 0.25rem;
                line-height: 1.2;

                & > .blocks {
                    align-items: center;

                    &.complex {
                        padding: 0.5rem 0;
                    }
                }

                & img {
                    max-width: 10rem;
                    max-height: 10rem;
                    margin: 0 var(--space-1x);
                }
            }
        }
        &[aria-controls] {
            cursor: auto;
        }
    }

    .choices-left {
        & .choices-area {
            max-width: var(--item-max-width-left);
            flex: 0 0 auto;
            width: var(--list-width);

            & :global(.height-keeper) {
                width: var(--list-width);
            }
        }
        & .position-left .choices-area {
            margin-inline-end: var(--gap-between);
        }
        & .position-right .choices-area {
            margin-inline-start: var(--gap-between);
        }
    }

    .choices-top {
        & .qti-block {
            flex-flow: column nowrap;
        }

        & .shadow-choices-container {
            width: 1px;
            height: 1px;
            overflow: hidden;
        }
        & .shadow-choices-area {
            width: var(--container-width-top);
            display: flex; /* size choices by content if it's < 33% */

            & :global(.height-keeper) {
                max-width: var(--item-max-width-top);
            }
        }

        & .qti-block .choices-area {
            max-width: var(--container-width-top);
            width: 100%;
            align-self: flex-start;

            & :global(.targetable .draggable-list) {
                padding-bottom: 0;
            }
            & :global(.item-btn-container .item-btn) {
                width: var(--item-width-top);
                height: var(--item-height-top);
            }
            & :global(.height-keeper .draggable-list li) {
                margin-bottom: 1.5rem;
                margin-top: 0.5rem;
            }
            &.keep-row-below-top :global(li.removed ~ li.removed) {
                display: none;
            }
            &:not(.keep-row-below-top) :global(li.removed) {
                display: none;
            }
        }

        & .position-top .choices-area {
            margin-top: var(--gap-outer);
            margin-bottom: var(--gap-inner);
        }
        & .position-bottom .choices-area {
            margin-top: var(--gap-inner);
            margin-bottom: var(--gap-outer);
        }
    }
</style>

<svelte:window bind:innerWidth={windowWidth} on:click={clearActivatedChoice} on:keydown={resetActivatedState} />

<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    class:choices-top={isTopChoices}
    class:choices-left={!isTopChoices}
    on:focusin|once={handleInteractionFocusIn}
    use:preventSpaceScroll
    bind:this={interactionElement}
    aria-disabled={disabledBySession}
    style={cssStyle}
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}

    <ChoiceFeedbackBlock
        maxChoices={maxAssociations}
        minChoices={minAssociations}
        type="associations"
        qtiMaxChoicesMessage={maxSelectionMessage}
        qtiMinChoicesMessage={minSelectionMessage}
        {isInteractionFocused}
        {interactionElement}
        selectedNumber={$stateStore.selected.length}
        lang={instructionsLang} />

    <div aria-live="assertive" class="hidden" id={ariaLiveContainerId} lang={instructionsLang}>
        {@html $stateStore.confirmation}
    </div>
    <div id={ariaDescribedByContainerIdForUnselectedOptions} class="hidden" lang={instructionsLang}>
        {__('Press enter or space to grab and browse the answer area.')}
        {#if choicesCount > 1}{__('To move to next available option, use the arrow keys.')}{/if}
    </div>
    <div id={ariaDescribedByContainerIdForEmptyGap} class="hidden" lang={instructionsLang}>
        {__('Press enter or space to place down.')}
        {#if availableGaps > 1}{__('To browse other gaps use the arrow keys.')}{/if}
        {__('Press escape to cancel.')}
    </div>
    <div id={ariaDescribedByContainerIdForMatchedGap} class="hidden" lang={instructionsLang}>
        {__('Press enter or space to grab.')}
        {#if $stateStore.selected.length > 1}{__('To move to next available answer, use the arrow keys.')}{/if}
        {__('Double press shift+tab to return to choices.')}
    </div>
    <div
        class="qti-flow-container qti-block position-{qtiPosition}"
        aria-controls={ariaLiveContainerId}
        use:resizeObserve={handleInteractionResized}>
        {#if isTopChoices}
            <div class="shadow-choices-container" aria-hidden="true">
                <div class="shadow-choices-area">
                    <DraggableList
                        disabled={true}
                        bind:itemWidth={itemWidthTop}
                        bind:itemHeight={itemHeightTop}
                        {instructionsLang}>
                        {#each choiceOptions as choice (choice.identifier)}
                            <Choice
                                isInChoiceArea={true}
                                key={choice.identifier}
                                disabled={true}
                                {shadowDraggableGroupKey} />
                        {/each}
                    </DraggableList>
                </div>
            </div>
        {/if}
        {#each areasOrder as area (area)}
            {#if area === areas.choices}
                <div class="choices-area" class:keep-row-below-top={keepRowBelowTop} bind:this={choiceArea}>
                    <DraggableList
                        {draggableGroupKey}
                        dropAreaKey="choices"
                        disabled={disabledBySession}
                        targetable={$activeElementStore && $stateStore.isDragging}
                        targeted={choiceAreaDroppable}
                        isListVertical={!isTopChoices}
                        mode={isTopChoices ? 'flex' : void 0}
                        bind:itemWidth
                        bind:itemHeight
                        ariaLabel={__('Available options')}
                        presentItemsCount={choicesCount}
                        {instructionsLang}
                        on:dragOver={handleDragOver}
                        on:dragOut={handleDragOut}
                        on:drop={!disabledBySession && handleDropToList}>
                        {#each choicesToRender as choice, i (choice.identifier)}
                            <Choice
                                isInChoiceArea={true}
                                key={choice.identifier}
                                order={i + 1}
                                disabled={disabledBySession}
                                removed={choice.removed} />
                        {/each}
                    </DraggableList>
                </div>
            {:else if area === areas.answers}
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <div
                    class="answer-area"
                    tabindex="0"
                    bind:this={answerArea}
                    role={isAnswerAreaApplication ? 'application' : 'article'}
                    aria-labelledby={!isAnswerAreaApplication ? answerAreaLabelId : void 0}
                    on:focus={!disabledBySession && handleFocusAnswerArea}
                    on:keydown={!disabledBySession && handleKeyDown}>
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <div
                        bind:this={focusRouterElement}
                        class="visually-hidden"
                        tabindex="0"
                        on:focus={!disabledBySession && handleFocus} />
                    <ItemBlocks {blockTree} />
                    {#if isAnswerAreaApplication}
                        <span id={answerAreaLabelId} class="hidden" lang={instructionsLang}>
                            {__('Text Passage. To read use the arrow keys.')}
                        </span>
                    {/if}
                </div>
            {/if}
        {/each}
    </div>
</div>
