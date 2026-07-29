<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;

    import ItemBlocks from '../../item/blocks/ItemBlocks.svelte';
    import { DraggableList, DraggableListItem } from '@oat-sa-private/ui-components';
    import { __, generateElementId, getActualKey } from '@oat-sa-private/ui-core';
    import SortableList from './SortableList.svelte';
    import Prompt from '../Prompt.svelte';
    import { extractFromClasses } from '../util/attributes.js';
    import {
        areas,
        getAreasOrder,
        getOrientation,
        getPositioning,
        orientations,
        orders
    } from '../util/sharedVocabulary.js';
    import ChoiceFeedbackBlock from '../feedback/ChoiceFeedbackBlock.svelte';
    import { tick, getContext } from 'svelte';
    import { isEqual, cloneDeep } from 'lodash';
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import { getReadableContent } from '../util/aria.js';
    import AtomicAriaLive from '../AtomicAriaLive.svelte';

    // Utils
    import { traceInteraction } from './util.js';
    import shuffleChoiceOptions from '../util/shuffleChoices.js';

    const qtiClass = 'qti-orderInteraction';

    export let cardinality = 'ordered';
    export let baseType = 'identifier';
    export let itemIdentifier;
    export let responseIdentifier;
    export let language;
    export let id;
    export let classes = '';
    export let dir;
    export let role;
    export let ariaAttrs = {};
    export let dataAttrs = {};
    export let choices;
    export let prompt;

    // interaction-level QTI attributes:
    export let shuffle = false;
    export let order = dataAttrs['data-order'] || orders.sort;
    export let minChoices = 0;
    export let maxChoices = 0;
    export let orientation = orientations.vertical; // can be overwritten by qti-orientation-* class

    const qtiMinChoicesMessage = dataAttrs['data-min-selections-message'];
    const qtiMaxChoicesMessage = dataAttrs['data-max-selections-message'];

    const itemContext = getContext(itemIdentifier);
    const testContext = itemContext?.getTestContext();
    const isMinChoicesUnspecified = minChoices <= 0;

    if (isMinChoicesUnspecified) {
        minChoices = choices.length;
        maxChoices = minChoices;
    }

    const isSingleOrder = order === orders.single;
    const shouldHideFeedback = isSingleOrder || (isMinChoicesUnspecified && !testContext?.validateResponses);

    //shared responsibility between OrderInteraction & SortableList; better use context store instead of two-way-bound props & events, or move all control to parent
    let draggingChoice = false; //if something is being dragged in choice list; use to show 'active' placeholders
    let draggingAnswer = false; //if something is being dragged in answer list; use to show 'active' placeholders
    let selectedSnapshot; //before starting any cancellable operation, save value which can be restored on cancel
    let suggestedKey; //state of item has not taken its place i.e. keyboard-navigated
    let selected;
    let selectedKeys = [];

    let ariaLiveAnnouncement;
    let ariaLiveContainerId = generateElementId('live');
    let choiceKeyboardInfoId = generateElementId('kb-info');

    let choiceLabel;
    let choiceLabelId = generateElementId('choice');
    let interactionElement;

    let listsContainer;

    let draggableGroupKey = generateElementId('dgroup');
    let itemWidth;
    let itemHeight;
    let choiceListTabbable;
    let choiceListDroppable;

    const itemLabelTypes = Object.freeze({
        none: 'none',
        decimal: 'decimal',
        'lower-alpha': 'lowerAlpha',
        'upper-alpha': 'upperAlpha'
    });
    const itemLabelSuffixes = Object.freeze({
        parenthesis: ')',
        period: '.',
        none: ''
    });
    const itemLabel = extractFromClasses(classes, 'qti-labels-', val => itemLabelTypes[val]);
    const itemLabelSuffix = extractFromClasses(
        classes,
        'qti-label-suffix-',
        val => itemLabelSuffixes[val],
        itemLabelSuffixes.period
    );
    const sortableListMax = maxChoices > 0 && maxChoices <= choices.length ? maxChoices : choices.length;

    let isInteractionFocused = false; // becomes true when interaction is focused for the first time

    const instructionsLang = itemContext && itemContext.getInstructionsLang();
    const itemLang = itemContext && itemContext.getItemLang();
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    $: disabled = $itemSessionStatusStore === itemSessionStatus.closed;

    //choices and response initialization
    let choiceMap;
    let formattedChoices;

    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
    $: if ($interactionStateStore) {
        loadResponse();
    }

    if (!interactionStateStore.get().qtiClass) {
        interactionStateStore.merge({ qtiClass });
    }

    if (choices) {
        formattedChoices = shuffle ? shuffleChoiceOptions(choices, interactionStateStore) : [...choices];

        formattedChoices.forEach(choice => {
            choice.removed = false;
            choice.plainText = getReadableContent(choice.label || (choice.image && choice.image.alt) || '');
        });
        choiceMap = formattedChoices.reduce((acc, current) => {
            acc[current.key] = current;
            return acc;
        }, {});
        if (isSingleOrder && !selected) {
            selected = cloneDeep(formattedChoices).map(choice => ({ key: choice.key }));
        }
    }

    //update store and choices on value change; also will do initial response definition
    $: if (selected) {
        if (selected && !validateResponse()) {
            console.error('invalid response detected:', selected);
            selected = selected.map(s => {
                if (s?.key === 'undefined') {
                    return null;
                }
                return s;
            });
        } else {
            selectedKeys = selected.filter(s => s && s.key).map(s => s.key);
            updateChoices();
            saveResponse();
        }
    }

    // presentation information from the shared vocabulary
    $: qtiOrientation = getOrientation(classes, orientation);
    $: qtiPosition = getPositioning(classes);

    // set in which order the choices and answers areas are displayed
    $: areasOrder = getAreasOrder(qtiPosition);

    function validateResponse() {
        return !selected.find(s => s?.key === 'undefined');
    }

    /**
     * Load the saved interaction response (if any)
     */
    function loadResponse() {
        // retrieve stored JSON object response and decode it
        let storedResponse = interactionStateStore.getResponseValue();
        const interactionState = interactionStateStore.get();

        if (storedResponse) {
            if (formattedChoices && interactionState.choiceKeys) {
                formattedChoices = interactionState.choiceKeys.map(choiceKey => choiceMap[choiceKey]);
            }
            if (interactionState.selectedKeysGaps) {
                const selectedKeysGaps = selected ? selected.map(s => s?.key || null) : null;
                //should happen only on initial setState, not because of user interaction
                if (!isEqual(interactionState.selectedKeysGaps, selectedKeysGaps)) {
                    selected = interactionState.selectedKeysGaps.map(s => {
                        if (s !== null) {
                            return { key: s };
                        }
                        return null;
                    });
                }
            } else {
                let nulls = [];
                if (storedResponse.length < sortableListMax) {
                    nulls = Array(sortableListMax - storedResponse.length).fill(null);
                }
                selected = [
                    ...storedResponse.map(key => ({
                        key
                    })),
                    ...nulls
                ];
            }
        }
    }

    /**
     * Save the latest interaction response
     */
    function saveResponse() {
        const choiceKeys = formattedChoices.map(c => c.key);
        const selectedKeysGaps = selected.map(s => s?.key || null); //do not include 'pending' property
        interactionStateStore.merge({ selectedKeysGaps, choiceKeys });
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

    /**
     * Handler for choice list drag-over event
     */
    function handleChoiceListDragOver() {
        choiceListDroppable = true;
    }

    /**
     * Handler for choice list drag-out event
     */
    function handleChoiceListDragOut() {
        choiceListDroppable = false;
    }

    /**
     * Handler for choice list drop event
     * @param {CustomEvent} e
     */
    function handleChoiceListDrop(e) {
        removeFromSelected(e.detail.draggableKey);
        choiceListDroppable = false;
        tick().then(() => dispatchTraceInteraction(e));
    }

    /**
     * Handler for choice click event
     * @param {CustomEvent} e
     */
    function handleChoiceClick(e) {
        if (e.detail.draggableKey === suggestedKey) {
            suggestedKey = null;
        } else {
            suggestedKey = e.detail.draggableKey;
            selectedSnapshot = cloneDeep(selected);
        }
        tick().then(() => dispatchTraceInteraction(e));
    }

    /**
     * Handler for choice `keySelect` event
     * @param {CustomEvent} e
     */
    function handleChoiceKeySelect(e) {
        let selectedEmptyIndex = findSelectedEmptyIndex();

        if (selectedEmptyIndex >= 0) {
            selectedSnapshot = cloneDeep(selected);
            suggestedKey = e.detail.draggableKey;
            dispatchTraceInteraction(e);
            addToSelected(suggestedKey, selectedEmptyIndex);

            //wait before focusing for new item to appea in SortableList
            tick().then(() => {
                focusAnswerAtIndex(selectedEmptyIndex);
            });
        } else {
            liveAnnounce(__('Answer area is full. To move to the answer area, press Tab.'));
        }
    }

    /**
     * Handler for choice dragStart event
     * @param {CustomEvent} e
     */
    function handleChoiceDragStart(e) {
        draggingChoice = true;
        cancelSuggestedState();
        selectedSnapshot = cloneDeep(selected);
        //delay event log until changes are ready
        tick().then(() => dispatchTraceInteraction(e));
    }

    /**
     * Handler for choice dragStop event
     * @param {CustomEvent} e
     */
    function handleChoiceDragStop(e) {
        draggingChoice = false;
        tick().then(() => dispatchTraceInteraction(e));
    }

    /**
     * Handle window click to cancel suggested choice
     */
    function handleWindowClick() {
        if (isChoiceSuggested()) {
            cancelSuggestedState();
        }
    }

    /**
     * Handle keypress on container to cancel suggested state
     * @param {KeyboardEvent} event
     */
    function handleContainerKeyDown(event) {
        if (disabled) {
            return;
        }
        const key = getActualKey(event);
        switch (key) {
            case 'tab': //= on:focusOutside, but not with mouse click
            case 'esc': {
                if (isChoiceSuggested()) {
                    cancelSuggestedState();
                }
            }
        }
    }

    /**
     * Reset variables that control suggested state
     */
    function cancelSuggestedState() {
        suggestedKey = null;
    }
    /**
     * Get single item height for sortable list item
     * @returns {String}
     */
    function getSingleItemHeight() {
        return orientation === orientations.vertical ? '100%' : 'auto';
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
    }

    /**
     * Adds choice to selected array
     * @param {String} choiceKey key of choice to be added to selected array
     * @param {Number} index index to put new member to
     */
    function addToSelected(choiceKey, index) {
        index = index || findSelectedEmptyIndex();
        selected[index] = { key: choiceKey };
        selected = selected;
    }

    /**
     * Update choices for DraggableList after answers have changed
     */
    function updateChoices() {
        const restored = [];
        formattedChoices.forEach(choice => {
            const removed = selected.some(s => s && s.key === choice.key);
            if (choice.removed && !removed) {
                restored.push(choice);
            }
            choice.removed = removed;
        });
        const present = formattedChoices.filter(choice => !choice.removed && !restored.includes(choice));
        const removed = formattedChoices.filter(choice => choice.removed);
        formattedChoices = present.concat(restored).concat(removed);
    }

    /**
     * Check if choice, and not answer, is suggested
     * @returns {Boolean}
     */
    function isChoiceSuggested() {
        return suggestedKey && !selected.some(item => item && item.key === suggestedKey);
    }

    /**
     * Finds choice by index
     * @param {Object} choice
     * @returns {Number}
     */
    function getChoiceIndex(choice) {
        return formattedChoices.indexOf(choice) + 1;
    }

    /**
     * Finds index of first empty selected
     * @returns {Number}
     */
    function findSelectedEmptyIndex() {
        return selected.findIndex(item => !item);
    }

    /**
     * Focus some item in answer list
     * @param {Number} index of item's element among other list elements
     */
    function focusAnswerAtIndex(index) {
        const elements = Array.from(listsContainer.querySelectorAll('.sortable-list .item-btn'));
        if (elements.length > 0) {
            const safeIndex = index > 0 && index < elements.length ? index : 0;
            elements[safeIndex].focus();
        }
    }

    /**
     * Focus some item in choice list
     * @param {Number} index of item's element among other list elements
     */
    function focusChoiceAtIndex(index) {
        const elements = Array.from(listsContainer.querySelectorAll('.draggable-list .item-btn'));
        if (elements.length > 0) {
            const safeIndex = index > 0 && index < elements.length ? index : 0;
            elements[safeIndex].focus();
        }
    }

    /**
     * Handler for SortableList update
     * @param {CustomEvent} e
     */
    function handleSortableListUpdate(e) {
        const controlFocus = e.detail.controlFocus;
        const focusKey = e.detail.focusKey;
        suggestedKey = null;

        if (controlFocus) {
            //wait before focusing for new item to appear in DraggableList
            tick().then(() => {
                if (formattedChoices.findIndex(choice => !choice.removed) >= 0) {
                    const index = focusKey ? formattedChoices.findIndex(choice => choice.key === focusKey) : null;
                    focusChoiceAtIndex(index);
                }
            });
        }
    }

    /**
     * Handler for SortableList `cancel` event
     */
    function handleSortableListItemCancel() {
        liveAnnounce(__('cancelled'));
    }

    /**
     * Handler for SortableList `placeDown` event
     * @param {CustomEvent} e
     */
    function handleSortableListItemPlaceDown(e) {
        const { key } = e.detail;
        liveAnnounce(__('%lb has been placed down'), choiceMap[key].plainText);
    }

    /**
     * Handler for SortableList `move` event
     * @param {CustomEvent} e
     */
    function handleSortableListSuggestedItemMove(e) {
        const { key, index } = e.detail;
        liveAnnounce(__('%lb moved to position %d', index + 1), choiceMap[key].plainText);
    }

    /**
     * Flag that focus jump inside interaction
     */
    function handleInteractionFocusIn() {
        isInteractionFocused = true;
    }

    /**
     * Announce a text through a live region
     * @param {string} text - the main text to announce
     * @param {string} [choiceLabelText] - text of choice label, added in labelled-by to have the itemLang
     */
    function liveAnnounce(text, choiceLabelText) {
        if (choiceLabelText) {
            ariaLiveAnnouncement = {
                text,
                labelledByParams: [choiceLabelId]
            };
            choiceLabel = choiceLabelText;
        } else {
            ariaLiveAnnouncement = {
                text
            };
            choiceLabel = false;
        }
    }

    /**
     * Dispatches a trace event
     * @param {CustomEvent} e
     */
    function dispatchTraceInteraction(e) {
        const eventData = traceInteraction(e, selected, selectedSnapshot);
        const interactionEvent = new CustomEvent('interactiontrace', eventData);
        interactionElement.dispatchEvent(interactionEvent);
    }
</script>

<style>
    .lists-container {
        cursor: unset; /*pointer comes from [aria-controls] style*/
        display: flex;
        justify-content: flex-start;
        & > :global(ol) {
            flex: 1 0 14.75rem;
        }
        &.order-single > :global(ol) {
            flex-grow: 0.5;
            margin-inline-start: 0;
        }
        &.order-single > :global(ol:not(.orientation-horizontal)) {
            display: grid;
            grid-auto-rows: 1fr;
        }
        &:global(.order-single .drop-area) {
            height: 100%;
        }
        &.order-single.orientation-horizontal > :global(ol) {
            flex-grow: 1;
            & > :global(li) {
                height: 100%;
            }
        }

        &.orientation-horizontal > :global(ol) {
            & :global(.label-container) {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }

        & > :global(div) {
            flex: 1 0 0;
        }
        &.position-top,
        &.position-bottom {
            align-items: stretch;
            flex-direction: column;
        }
        &.position-left,
        &.position-right {
            align-items: flex-start;
            flex-direction: row;
        }

        & :global(.targetable .draggable-list) {
            padding-bottom: 0;
        }
    }
</style>

<svelte:window on:click={handleWindowClick} />
<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    on:focusin|once={handleInteractionFocusIn}
    bind:this={interactionElement}
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}

    {#if !shouldHideFeedback}
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
    {/if}

    <AtomicAriaLive id={ariaLiveContainerId} announcement={ariaLiveAnnouncement} lang={instructionsLang} />

    <p id={choiceKeyboardInfoId} class="hidden" lang={instructionsLang}>
        {__(
            'Press enter or space to grab and place in the answer area. To move to next available option, use the arrow keys.'
        )}
    </p>

    {#if ariaLiveAnnouncement && ariaLiveAnnouncement.labelledByParams && choiceLabel}
        <p id={choiceLabelId} class="hidden" lang={itemLang}>
            {choiceLabel}
        </p>
    {/if}

    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="lists-container orientation-{qtiOrientation} position-{qtiPosition} order-{order}"
        aria-controls={ariaLiveContainerId}
        bind:this={listsContainer}
        on:keydown={handleContainerKeyDown}>
        {#each areasOrder as area (area)}
            {#if area === areas.choices && !isSingleOrder}
                <DraggableList
                    {draggableGroupKey}
                    ariaLabel={__('Unordered options')}
                    {disabled}
                    presentItemsCount={formattedChoices.filter(choice => !choice.removed).length}
                    targetable={draggingAnswer}
                    targeted={choiceListDroppable}
                    isListVertical={orientations.vertical === qtiOrientation}
                    mode={orientations.vertical === qtiOrientation ? 'grid' : 'flex'}
                    on:dragOver={handleChoiceListDragOver}
                    on:dragOut={handleChoiceListDragOut}
                    on:drop={handleChoiceListDrop}
                    bind:itemWidth
                    bind:itemHeight
                    bind:tabbable={choiceListTabbable}>
                    {#each formattedChoices as choice, index (choice.key)}
                        <DraggableListItem
                            key={choice.key}
                            {draggableGroupKey}
                            removed={choice.removed}
                            selected={choice.key === suggestedKey}
                            ariaDescribedBy={choiceKeyboardInfoId}
                            {disabled}
                            tabbable={choiceListTabbable && index === 0}
                            on:dragStart={handleChoiceDragStart}
                            on:dragStop={handleChoiceDragStop}
                            on:click={handleChoiceClick}
                            on:keySelect={handleChoiceKeySelect}>
                            {#if choice.blockTree}
                                <ItemBlocks blockTree={choice.blockTree} />
                            {:else}{choice.label}{/if}
                            <p class="visually-hidden" lang={instructionsLang}>
                                {__('Option %d.', getChoiceIndex(choice))}
                            </p>
                        </DraggableListItem>
                    {/each}
                </DraggableList>
            {:else if area === areas.answers}
                <SortableList
                    {draggingChoice}
                    bind:selectedSnapshot
                    selectedKeysLength={selectedKeys.length}
                    {draggableGroupKey}
                    bind:selected
                    bind:suggestedKey
                    bind:draggingAnswer
                    bind:interactionElement
                    {disabled}
                    orientation={qtiOrientation}
                    position={qtiPosition}
                    {order}
                    max={sortableListMax}
                    itemLabel={itemLabel ? itemLabel : void 0}
                    {itemLabelSuffix}
                    {itemIdentifier}
                    let:item
                    itemWidth={isSingleOrder ? null : itemWidth}
                    itemHeight={isSingleOrder ? getSingleItemHeight() : itemHeight}
                    itemRemovable={!isSingleOrder}
                    on:update={handleSortableListUpdate}
                    on:cancel={handleSortableListItemCancel}
                    on:move={handleSortableListSuggestedItemMove}
                    on:placeDown={handleSortableListItemPlaceDown}>
                    {#if choiceMap[item.key].blockTree}
                        <ItemBlocks blockTree={choiceMap[item.key].blockTree} />
                    {:else}{choiceMap[item.key].label}{/if}
                </SortableList>
            {/if}
        {/each}
    </div>
</div>
