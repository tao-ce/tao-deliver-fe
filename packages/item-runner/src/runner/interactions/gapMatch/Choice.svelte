<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;

    // Components
    import { DraggableListItem, DraggableListButton } from '@oat-sa-private/ui-components';
    import ItemBlocks from '../../item/blocks/ItemBlocks.svelte';
    // Utils
    import { createEventDispatcher, getContext } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import { traceInteraction } from './util.js';

    /**
     * Component intended to render choice in list area and in answer area
     * Depends of area html structure is differ
     */
    export let isInChoiceArea = false; // flag to which area choice should be rendered
    export let key;
    export let order = -1; //choice order in list
    export let disabled;
    export let removed;
    export let shadowDraggableGroupKey;
    export let instructionsLang; // user language to read instructions

    const choicesStore = getContext('choicesStore');
    const stateStore = getContext('stateStore');
    const activeElementStore = getContext('activeElementStore');
    const storeMatches = getContext('handleDrop');
    const focusTracker = getContext('focusTracker');
    const interactionElementStore = getContext('interactionElementStore');

    let selectedSnapshot; // snapshot of selectedChoices before last change
    const dispatch = createEventDispatcher();
    const {
        draggableGroupKey,
        ariaDescribedByContainerIdForUnselectedOptions,
        ariaDescribedByContainerIdForMatchedGap
    } = $stateStore;

    let choiceUsedCounter; //how many times choices is linked to gaps at this moment
    let choicesMax; // choices array length
    let renderChoice; // contains info for rendering choice
    let targetable = false;
    let selected = false;

    $: if ($choicesStore) {
        choicesMax = Object.keys($choicesStore).length;
        renderChoice = $choicesStore[key]; // choice which will be rendered to gap
    }
    $: choiceUsedCounter = $stateStore.selectedChoices[key] || 0; //used for correct showing stacked choices
    $: restrictSwap =
        isInChoiceArea &&
        $activeElementStore &&
        $activeElementStore.dropAreaKey === getDropAreaKey($activeElementStore.draggableKey);

    $: if (selected && !$activeElementStore) {
        selected = false;
    }

    /**
     * Remember activated choice in case of set selected choice and move selected choice to the gap
     * @param {CustomEvent} e
     */
    function handleChoiceListClick(e) {
        const { draggableKey } = e.detail;
        selectedSnapshot = $stateStore.selected;
        if ($activeElementStore) {
            //drop to the same position in list
            if (
                $activeElementStore.draggableKey === draggableKey ||
                (isInChoiceArea && $activeElementStore.dropAreaKey === 'choices')
            ) {
                activeElementStore.set(null);
                selected = false;
                dispatchTraceInteraction(e);
                return;
            }
            handleChoiceIndividualDrop();
        } else {
            // start drag from list
            activeElementStore.set({
                draggableKey,
                dropAreaKey: 'choices'
            });
            selected = true;
        }
        dispatchTraceInteraction(e);
    }

    /**
     * Generate key for drop area in choice
     * @param {string} choiceId
     * @returns {string}
     */
    function getDropAreaKey(choiceId) {
        return `${choiceId}-gap`;
    }

    /**
     * Handle key press
     * @param {CustomEvent} e
     */
    function handleChoiceListKeyUp(e) {
        if ($stateStore.gapsNumber === $stateStore.selectedGaps.length) {
            stateStore.setConfirmation(__('Answer area is full. To move to the answer area press Tab.'));
            return;
        }
        handleChoiceListClick(e);
        focusTracker.focusFirstEmptyGap();
        focusTracker.makeAnswerAreaUnfocusable();
        selected = true;
    }

    /**
     * Set active choice
     * Unfortunately we cannot use 'dragStop' event for removing active element, because it fired first in stack of all events from dropping choice
     * In this case all further events don't know anything about active choice
     * @param {CustomEvent} e
     */
    function handleDragStart(e) {
        activeElementStore.set(e.detail);
        stateStore.setDragging(true);
        dispatchTraceInteraction(e);
    }
    /**
     * Handle drag stop
     * @param {CustomEvent} e
     */
    function handleDragStop(e) {
        stateStore.setDragging(false);
        dispatchTraceInteraction(e);
    }

    /**
     * Dispatch removing choice and set correct UX message
     * @param {MouseEvent} event
     */
    function handleRemoveChoiceByClick(event) {
        event.stopPropagation();
        stateStore.setConfirmation(__('%s has been returned to available options.', renderChoice.content));
        selectedSnapshot = $stateStore.selected;
        dispatch('remove', { choiceId: key, pressedKey: event.detail.key });
        selected = true;
        dispatchTraceInteraction(event);
    }

    /**
     * Handle click
     * @param {MouseEvent} e
     */
    function handleAnswerChoiceClick(e) {
        e.stopPropagation();
        dispatch('choiceClick');
        selectedSnapshot = $stateStore.selected;
        selected = true;
        dispatchTraceInteraction(e);
    }

    /**
     * Handle keyup
     * @param {KeyboardEvent} e
     */
    function handleAnswerChoiceClickKeyUp(e) {
        dispatch('choiceKeyup');
        selectedSnapshot = $stateStore.selected;
        selected = true;
        dispatchTraceInteraction(e);
    }

    /**
     * Handle drop
     */
    function handleChoiceIndividualDrop() {
        if ($activeElementStore) {
            //drop to the any choice in list
            if (restrictSwap) {
                activeElementStore.set(null);
                return;
            }
            storeMatches([{
                draggableKey: key,
                dropAreaKey: $activeElementStore.dropAreaKey
            }]);
            activeElementStore.set(null);
        }
    }

    /**
     * Forward dragover event to parent
     */
    function handleChoiceListOver() {
        targetable = true;
        dispatch('dragOver');
    }

    /**
     * Forward dragout event to parent
     */
    function handleChoiceListOut() {
        targetable = false;
        dispatch('dragOut');
    }

    /**
     * Dispatches a trace event
     * @param {CustomEvent} e
     */
    function dispatchTraceInteraction(e) {
        const eventData = traceInteraction(e, $stateStore.selected, selectedSnapshot);
        const interactionEvent = new CustomEvent('interactiontrace', eventData);
        $interactionElementStore.dispatchEvent(interactionEvent);
    }
</script>

{#if isInChoiceArea}
    <DraggableListItem
        {key}
        dropAreaKey={getDropAreaKey(key)}
        draggableGroupKey={shadowDraggableGroupKey || draggableGroupKey}
        amount={parseInt(renderChoice.matchMax) === 0 ? -1 : parseInt(renderChoice.matchMax) - choiceUsedCounter}
        {selected}
        {disabled}
        {removed}
        {instructionsLang}
        tabbable={order === 1}
        dropArea
        targetable={$activeElementStore && $activeElementStore.draggableKey !== key && !restrictSwap}
        notHoverable={$activeElementStore && $activeElementStore.draggableKey === key && !restrictSwap}
        ariaDescribedBy={ariaDescribedByContainerIdForUnselectedOptions}
        on:dragOver={handleChoiceListOver}
        on:dragOut={handleChoiceListOut}
        on:drop={handleChoiceIndividualDrop}
        on:dragStart={!disabled && handleDragStart}
        on:dragStop={!disabled && handleDragStop}
        on:click={!disabled && handleChoiceListClick}
        on:keySelect={!disabled && handleChoiceListKeyUp}>
        <div class="blocks" class:complex={renderChoice.isComplexContent}>
            {#if renderChoice.blockTree}
                <ItemBlocks blockTree={renderChoice.blockTree} />
            {:else}{renderChoice.content}{/if}
        </div>
        <span class="visually-hidden" lang={instructionsLang}>{__('Option %d.', order)}</span>
    </DraggableListItem>
{:else}
    <DraggableListButton
        {key}
        dropArea={key}
        {draggableGroupKey}
        {disabled}
        {instructionsLang}
        tabbable={$stateStore.firstChoice === key}
        ariaDescribedBy={ariaDescribedByContainerIdForMatchedGap}
        {selected}
        placed={true}
        removable={true}
        targetable={$activeElementStore && $activeElementStore.draggableKey !== key}
        notHoverable={$activeElementStore && $activeElementStore.draggableKey === key}
        on:click={!disabled && handleAnswerChoiceClick}
        on:keySelect={!disabled && handleAnswerChoiceClickKeyUp}
        on:remove={!disabled && handleRemoveChoiceByClick}
        on:dragStart={!disabled && handleDragStart}
        on:dragStop={!disabled && handleDragStop}>
        <div class="blocks" class:complex={renderChoice.isComplexContent}>
            {#if renderChoice.blockTree}
                {#key renderChoice.blockTree}
                    <ItemBlocks blockTree={renderChoice.blockTree} />
                {/key}
            {:else}{renderChoice.content}{/if}
        </div>
        <div slot="remover-aria-label">
            <span lang={instructionsLang}>
                {__('Return %s to the available options.').split('%s')[0]}
            </span>
            <p>{@html renderChoice.content}</p>
            <span lang={instructionsLang}>
                {__('Return %s to the available options.').split('%s')[1]}
            </span>
        </div>
    </DraggableListButton>
{/if}
