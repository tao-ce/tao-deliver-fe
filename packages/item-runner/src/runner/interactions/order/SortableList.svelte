<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;

    /**
     * SelectedItem
     * @typedef {Object} SelectedItem
     * @property {String} key key of corresponding choice
     * @property {Boolean} pending state of item currently dragged, so its place can be taken by reordering
     */

    /**
     * Component is used as a target area for OrderInteraction
     * @property {Number} max - mandatory property - the amount of choice placeholders to render
     * @property {SelectedItem[]} selected - actual state of items in the list
     * @property {Number} [itemWidth=400] - width of items in pixels
     * @property {Number} [itemHeight=44] - height of items in pixels
     * @property {Boolean} [dragging=false] - drag operation is in progress
     * @property {Boolean} [disabled=false] - disabled state of the component
     * @property {String} [itemLabel='decimal'] - numbering style of selected items
     * @property {String} [itemLabelSuffix=''] - suffix added to selected items numbers
     * @property {String} draggableGroupKey - key of draggableGroup is used by component dropAreas
     * @property {String} [ariaLabel='answer list'] - list SR announcement text
     * @property {String} [orientation='vertical'] - The orientation for the interaction (either 'vertical' or 'horizontal')
     * @property {String} [position='left'] - The position of the list (either 'top', 'left', 'bottom', or 'right')
     * @fires update {CustomEvent} custom event fired list is updated
     * @fires cancel {CustomEvent} custom event fired when keyboard operation is cancelled by 'esc' key
     * @fires move {CustomEvent} custom event fired when suggested item is moved in the list by keyboard or drag
     * @fires placeDown {CustomEvent} custom event fired when suggested item is put on the list by keyboard or drag
     */
    import { tick, createEventDispatcher, getContext } from 'svelte';
    import { cloneDeep, findLastIndex } from 'lodash';
    import { DropArea, DraggableListButton } from '@oat-sa-private/ui-components';
    import { __, getActualKey, generateElementId, remToPx } from '@oat-sa-private/ui-core';
    import { traceInteraction } from './util.js';
    import { orientations, positions, orders } from '../util/sharedVocabulary.js';
    import { convertDimensionToCss } from '../util/responseType.js';
    import resizeObserve from '../util/actions/resizeObserve.js';

    export let max;
    export let itemWidth = remToPx(25);
    export let itemHeight = remToPx(2.75);
    export let itemRemovable = true;
    export let disabled = false;
    export let itemLabel = 'decimal';
    export let itemLabelSuffix = '.';
    export let draggableGroupKey;
    export let ariaLabel = __('answer list');

    //shared responsibility between OrderInteraction & SortableList; better use context store instead of two-way-bound props & events, or move all control to parent
    export let selected;
    export let interactionElement;
    export let selectedKeysLength = 0;
    export let draggingChoice = false; //if something is being dragged in choice list; use to show 'active' placeholders
    export let draggingAnswer = false; //if something is being dragged in answer list; use to show 'active' placeholders
    export let selectedSnapshot; //before starting any cancellable operation, save value which can be restored on cancel
    export let suggestedKey; //state of item has not taken its place i.e. keyboard-navigated
    export let itemIdentifier; //item selected received in order to getContext and its language
    export let orientation = orientations.vertical; // either horizontal or vertical
    export let position = positions.left; // position of the list
    export let order; // either single or sort

    let container;
    const itemsDimensions = {};

    const itemContext = getContext(itemIdentifier);
    const instructionsLang = itemContext && itemContext.getInstructionsLang();
    const itemLang = itemContext && itemContext.getItemLang();

    let tabbable = true;
    let selectedSnapshotAfterDragStart = null;
    let currentDropAreaKey = null;
    let initialDropAreaKey = null;
    let dropAreaArray = Array(max).fill(null);
    let dragOperation = false;

    const dispatch = createEventDispatcher();

    const keyboardInfoDefaultElementId = generateElementId('keyboard-info-def');
    const keyboardInfoSortingElementId = generateElementId('keyboard-info-sort');
    const keyboardInfoDefault = __(
        'Press enter or space to grab. To move to next available answer, use the arrow keys'
    );
    const keyboardInfoSorting = __(
        'Press enter or space to place down. To reorder use the arrow keys. Press escape to cancel'
    );

    $: {
        //selected array initialization
        selected = selected || Array(max).fill(null);
        if (max && selected.length < max) {
            selected = [...selected, ...Array(max - selected.length).fill(null)];
        }
    }
    $: isAnswerSuggested = suggestedKey && selected.some(item => item && item.key === suggestedKey); //suggestedKey may also be in choices
    $: firstAnswerIndex = selected.findIndex(item => !!item);

    $: cssStyle = [
        `--item-width:${itemWidth ? `${itemWidth}px` : 'auto'}`,
        `--item-height:${convertDimensionToCss(itemHeight)}`
    ].join(';');

    /**
     * Resetting draggable variables to default state
     */
    function resetDraggingState() {
        draggingAnswer = false;
        initialDropAreaKey = null;
        currentDropAreaKey = null;
        selectedSnapshotAfterDragStart = null;
        dragOperation = false;
    }

    /**
     * Applies the height and width of items in the list for the single order
     * @param {Boolean} resetToInitial - if true, resets the dimensions to initial values
     * @returns {void}
     */
    function adjustSingleOrderItemsDimensions(resetToInitial = false) {
        if (order !== orders.single) {
            return;
        }
        Object.keys(itemsDimensions).forEach(index => {
            const element = container.querySelector(`[data-index="${index}"]`);
            element.style.height = convertDimensionToCss(resetToInitial ? itemHeight : itemsDimensions[index].height);
            element.style.width = convertDimensionToCss(resetToInitial ? itemWidth : itemsDimensions[index].width);
        });
    }

    /**
     * Returns the item number label by index
     * @param {Number} index
     * @returns {String}
     */
    function getBullet(index) {
        switch (itemLabel) {
            case 'none':
                return '';
            case 'decimal':
                return `${index + 1}${itemLabelSuffix}`;
            case 'lowerAlpha':
                return index >= 0 && index <= 25 ? `${String.fromCharCode(index + 97)}${itemLabelSuffix}` : '';
            case 'upperAlpha':
                return index >= 0 && index <= 25 ? `${String.fromCharCode(index + 65)}${itemLabelSuffix}` : '';
            default:
                return `${index + 1}${itemLabelSuffix}`;
        }
    }

    /**
     * Handles dragOut dropArea event
     */
    function handleDragOut() {
        dragOperation = true;

        currentDropAreaKey = null;

        if (selectedSnapshotAfterDragStart) {
            selected = cloneDeep(selectedSnapshotAfterDragStart);
        } else {
            selected = cloneDeep(selectedSnapshot);
        }
        selected = selected;
    }

    /**
     * Handles dragOver dropArea event
     * @param {CustomEvent} e
     */
    function handleDragOver(e) {
        dragOperation = true;
        currentDropAreaKey = e.detail.dropAreaKey;

        //if dragging over some occupied area, shift items and free the area
        if (selected[currentDropAreaKey] && !selected[currentDropAreaKey].pending) {
            shiftItemsFrom(parseInt(currentDropAreaKey));
        }
    }

    /**
     * Handles dragStart draggable event
     * @param {CustomEvent} e
     */
    function handleDragStart(e) {
        adjustSingleOrderItemsDimensions();
        draggingAnswer = true;

        //if we happened to be dragging in suggested state, let's cancel it first
        suggestedKey = null;

        initialDropAreaKey = e.detail.dropAreaKey;
        currentDropAreaKey = e.detail.dropAreaKey;

        selectedSnapshot = cloneDeep(selected);

        //if we just nullify the item in position the dragStop event will never fire
        //as because original item will be removed
        selected[e.detail.dropAreaKey].pending = true;
        selectedSnapshotAfterDragStart = cloneDeep(selected);
        selected = selected;
        dispatch('dragStart', e);
        tick().then(() => {
            dispatchTraceInteraction(e);
        });
    }

    /**
     * Handles dragStop draggable event
     * @param {CustomEvent} e
     */
    function handleDragStop(e) {
        adjustSingleOrderItemsDimensions(true);
        //if dragStop happened outside any dropArea or in initial one, set selected back
        if (!currentDropAreaKey || currentDropAreaKey === initialDropAreaKey) {
            selected = cloneDeep(selectedSnapshot);
            resetDraggingState();
        }

        selected = selected.map(item => {
            if (item && item.pending) {
                return null;
            } else {
                return item;
            }
        });

        tick().then(() => {
            dispatchTraceInteraction(e);
        });
    }

    /**
     * Handles update dropArea event
     * @param {CustomEvent} e
     */
    function handleDragUpdate(e) {
        //make update only if some movement was made
        //there is a bug if dragging too quickly over and out events do not fire, leading to invalid
        if (dragOperation) {
            if (e.detail.draggableKey) {
                //do not swap, update only if area is empty
                if (!selected[e.detail.dropAreaKey]) {
                    selected[e.detail.dropAreaKey] = { key: e.detail.draggableKey };
                    resetDraggingState();
                    selected = selected;
                    fireUpdate();
                    if (parseInt(e.detail.initialDropAreaKey) > -1) {
                        dispatch('move', { key: e.detail.draggableKey, index: +e.detail.dropAreaKey });
                    } else {
                        dispatch('placeDown', { key: e.detail.draggableKey });
                    }
                    tick().then(() => {
                        dispatchTraceInteraction(e);
                    });
                }
            }
        }
    }

    /**
     * Takes the string index and shifts the selected array items to empty the place
     * @param {Number} index
     */
    function shiftItemsFrom(index) {
        let nearestEmptyAreaIndex = findNearestPotentiallyEmptyAreaIndex(index);

        //copy the item in index, it can be a pending one
        let item = cloneDeep(selected[nearestEmptyAreaIndex]);

        if (~nearestEmptyAreaIndex) {
            if (nearestEmptyAreaIndex > index) {
                selected.copyWithin(index + 1, index, nearestEmptyAreaIndex);
                selected[index] = item;
            } else {
                selected.copyWithin(nearestEmptyAreaIndex, nearestEmptyAreaIndex + 1, index + 1);
                selected[index] = item;
            }

            selected = selected;
        }
    }

    /**
     * Finds nearest index to shift options to for reorder
     * @param {Number} index
     * @returns {Number}
     */
    function findNearestPotentiallyEmptyAreaIndex(index) {
        let upperIndex = index;
        let lowerIndex = index;

        while (upperIndex >= 0 || lowerIndex < selected.length) {
            if (upperIndex >= 0 && (!selected[upperIndex] || selected[upperIndex].pending)) {
                return upperIndex;
            } else if (lowerIndex < selected.length && (!selected[lowerIndex] || selected[lowerIndex].pending)) {
                return lowerIndex;
            } else {
                upperIndex--;
                lowerIndex++;
            }
        }
        return -1;
    }

    //keyboard nav

    /**
     * Handler for backward keyboard move
     * @param {KeyboardEvent} e
     * @param {Boolean} forward - move direction: forward if true, backward if false
     */
    function handleKbMove(e, forward) {
        if (isAnswerSuggested) {
            //move suggested up/down with reordering if needed
            const delta = forward ? 1 : -1;
            const newIndex = (selected.length + findSuggestedIndex() + delta) % selected.length;
            moveSuggested(newIndex);
            dispatch('move', { key: suggestedKey, index: newIndex });
            keepFocus(); //if we leave focus on item that is being replaced by suggested, SR will read changed aria-describedby of that replaced item
            tick().then(() => {
                focusItemAtKey(suggestedKey);
            });
        } else {
            const allElements = findItemElements();
            //is item focused?
            const focusedIndex = findIndexOfFocusedItem(allElements);
            if (focusedIndex !== -1) {
                if (itemRemovable) {
                    let closestRemoveBtnIndex;
                    if (forward) {
                        //focus this item's remove btn
                        closestRemoveBtnIndex = focusedIndex;
                    } else {
                        //focus the previous item remove btn
                        closestRemoveBtnIndex = (allElements.length + focusedIndex - 1) % allElements.length;
                    }
                    findRemoveButtonForItemElement(allElements[closestRemoveBtnIndex])?.focus();
                } else {
                    let closestNextElementIndex;
                    if (forward) {
                        //focus next item
                        closestNextElementIndex = (allElements.length + focusedIndex + 1) % allElements.length;
                    } else {
                        //focus previous element
                        closestNextElementIndex = (allElements.length + focusedIndex - 1) % allElements.length;
                    }
                    allElements[closestNextElementIndex].focus();
                }
            } else {
                //is remove button focused?
                const removeFocusedIndex = findIndexOfFocusedRemove();
                if (removeFocusedIndex !== -1) {
                    let closestElementIndex;
                    if (forward) {
                        //focus next item
                        closestElementIndex = (allElements.length + removeFocusedIndex + 1) % allElements.length;
                    } else {
                        //focus item of this remove button
                        closestElementIndex = removeFocusedIndex;
                    }
                    allElements[closestElementIndex].focus();
                }
            }
        }
        e.preventDefault();
    }

    /**
     * Handle keydown on container to navigate through items,
     * and prevent page scroll when capturing space key event
     * @param {KeyboardEvent} event
     * @returns {Boolean|void} - to prevent browser default
     */
    function handleKeyDown(event) {
        const isRTL = window.getComputedStyle(event.target).getPropertyValue('direction') === 'rtl';
        const key = getActualKey(event);
        switch (key) {
            case 'tab': {
                //= on:focusout, but without timeout
                if (isAnswerSuggested) {
                    placeDownSuggested(false);
                }
                break;
            }
            case 'right':
                if (isRTL) {
                    handleKbMove(event, false);
                } else {
                    handleKbMove(event, true);
                }
                break;
            case 'down': {
                handleKbMove(event, true);
                break;
            }
            case 'left':
                if (isRTL) {
                    handleKbMove(event, true);
                } else {
                    handleKbMove(event, false);
                }
                break;
            case 'up': {
                handleKbMove(event, false);
                break;
            }
            case 'esc': {
                if (isAnswerSuggested) {
                    const focusBackKey = suggestedKey;
                    const suggestedItemWillStayInSelected = selectedSnapshot.some(
                        item => item && item.key === focusBackKey
                    );
                    cancelSuggested(!suggestedItemWillStayInSelected);
                    if (suggestedItemWillStayInSelected) {
                        tick().then(() => {
                            focusItemAtKey(focusBackKey);
                        });
                    }
                }
                break;
            }
            case 'space': {
                event.preventDefault();
                return false;
            }
        }
    }

    /**
     * Cancels suggested item and restores selected to previous state
     * @param {Boolean} controlFocus
     */
    function cancelSuggested(controlFocus) {
        const removedItem = selected.find(item => item && !selectedSnapshot.some(s => s && s.key === item.key));
        const focusKey = removedItem ? removedItem.key : null;

        selected = cloneDeep(selectedSnapshot);
        selected = selected;
        suggestedKey = null;

        fireUpdate(controlFocus, focusKey);
        dispatch('cancel');
    }

    /**
     * Places down suggested item
     * @param {Boolean} controlFocus
     */
    function placeDownSuggested(controlFocus) {
        const key = suggestedKey;
        suggestedKey = null;
        fireUpdate(controlFocus);
        dispatch('placeDown', { key });
    }

    /**
     * Reorders if needed selected array to move suggested to the next/previous slot
     * @param {Number} newIndex
     */
    function moveSuggested(newIndex) {
        const suggestedIndex = findSuggestedIndex();
        const suggestedItem = selected[suggestedIndex];
        if (suggestedIndex === newIndex) {
            return;
        }

        //is the place we want to move to empty in snapshot?
        if (!selectedSnapshot[newIndex] || selectedSnapshot[newIndex].key === suggestedItem.key) {
            //yes, it's empty: put suggested to its new place, and restore other items' positions from snapshot
            selected = Array.from(selectedSnapshot);
            const suggestedIndexInSnapshot = selected.findIndex(item => item && item.key === suggestedItem.key);
            if (suggestedIndexInSnapshot !== -1) {
                selected[suggestedIndexInSnapshot] = null;
            }
            selected[newIndex] = suggestedItem;
        } else {
            //no, it's filled, need to swap, and can't restore other items' positions yet:
            //clear place of suggested
            selected[suggestedIndex] = null;

            //insert item to it's new place (do not replace anything, just insert, we'll remove additional place later)
            if (newIndex < suggestedIndex) {
                //suggested is moved up, we shift swapped item below it
                const aboveNew = selected.slice(0, newIndex);
                const belowNewIncludingNew = selected.slice(newIndex);
                selected = aboveNew.concat(suggestedItem, belowNewIncludingNew);
            } else {
                //suggested is moved down, we shift swapped item above it
                const aboveNewIncludingNew = selected.slice(0, newIndex + 1);
                const belowNew = selected.slice(newIndex + 1);
                selected = aboveNewIncludingNew.concat(suggestedItem, belowNew);
            }

            //remove one closest empty place (since additional place appeared after insert)
            const suggestedIndexAfterInsert = selected.findIndex(item => item && item.key === suggestedItem.key);
            if (newIndex < suggestedIndex) {
                //up: empty space is guaranteed to be below since it's at least old place of suggested
                const closestEmptyBelow = selected.findIndex(
                    (item, index) => !item && index > suggestedIndexAfterInsert
                );
                selected.splice(closestEmptyBelow, 1);
            } else {
                //down: empty space is guaranteed to be above since it's at least old place of suggested
                const closestEmptyAbove = findLastIndex(
                    selected,
                    (item, index) => !item && index < suggestedIndexAfterInsert
                );
                selected.splice(closestEmptyAbove, 1);
            }
        }
    }

    /**
     * Get array of html elements for present (draggable and focusable) items
     * @returns {DOMNode[]} elements
     */
    function findItemElements() {
        return Array.from(container.querySelectorAll('.item-btn'));
    }

    /**
     * Get index of currently focused item
     * @param {DOMNode[]} elements
     * @returns {Number} index
     */
    function findIndexOfFocusedItem(elements) {
        return elements.indexOf(document.activeElement);
    }

    /**
     * Get index of currently focused remove element
     * @returns {Number} index
     */
    function findIndexOfFocusedRemove() {
        const allRemoveElements = Array.from(container.querySelectorAll('.remover'));
        return allRemoveElements.indexOf(document.activeElement);
    }

    /**
     * Get remove-button element for specified item-button
     * @param {DOMNode} itemElement - item-button element
     * @returns {DOMNode} remove-button element
     */
    function findRemoveButtonForItemElement(itemElement) {
        return itemElement.nextElementSibling;
    }

    /**
     * Searches currently focused item in selected array
     * @returns {Object} item
     */
    function findFocusedItem() {
        const allElements = findItemElements();
        let focusedElementIndex = findIndexOfFocusedItem(allElements);
        return findSelectedByElementIndex(focusedElementIndex);
    }

    /**
     * Searches in selected array by the index of rendered item element
     * @param {Number} elementIndex
     * @returns {Object} item
     */
    function findSelectedByElementIndex(elementIndex) {
        if (elementIndex >= 0) {
            for (let i = 0; i < selected.length; i++) {
                if (selected[i]) {
                    if (elementIndex === 0) {
                        return selected[i];
                    } else {
                        elementIndex--;
                    }
                }
            }
        } else {
            return null;
        }
        return null;
    }

    /**
     * Searches for suggested index in selected array
     * @returns {Number} index
     */
    function findSuggestedIndex() {
        if (!suggestedKey) {
            return -1;
        }
        return selected.findIndex(item => item && item.key === suggestedKey);
    }

    /**
     * Handle focusin of the list
     */
    function handleFocusin() {
        tabbable = false;
    }

    /**
     * Measure interaction items' dimensions
     * @param {Number} index
     * @param {CustomEvent} event
     * @returns {void}
     */
    function handleInteractionItemsResized(index, event) {
        const { width, height } = event.detail;
        itemsDimensions[index] = { width, height };
    }

    /**
     * Handle focusout on container: restore tabbable in case window:focusin didn't fire (if someone used e.stopPropagation)
     */
    function handleFocusout() {
        setTimeout(() => {
            if (
                !tabbable &&
                container &&
                container !== document.activeElement &&
                !container.contains(document.activeElement)
            ) {
                tabbable = true;
            }
        }, 200);
    }

    /**
     * Handle focusin on window: restore tabbable in case container:focusout didn't fire (Firefox & Safari do not fire it when focused element is removed)
     * @param {Event} e
     */
    function handleWindowFocusin(e) {
        if (!tabbable && container && container !== e.target && !container.contains(e.target)) {
            tabbable = true;
        }
    }

    /**
     * Focuses the focus-keeper element that belongs to focused item
     */
    function keepFocus() {
        const parentElem = document.activeElement.closest('.answer-placeholder');
        if (
            parentElem &&
            parentElem.lastElementChild &&
            parentElem.lastElementChild.classList.contains('.focus-keeper')
        ) {
            parentElem.lastElementChild.focus();
        }
    }

    /**
     * Focus item element at specified key, if such item still exists
     * @param {string} key
     */
    function focusItemAtKey(key) {
        const allElements = findItemElements();
        const focusedIndex = selected.filter(item => item).findIndex(item => item.key === key);
        if (~focusedIndex) {
            allElements[focusedIndex].focus();
        }
    }

    /**
     * Handler for list item click
     * @param {CustomEvent} e
     */
    function handleItemClick(e) {
        const key = e.detail.draggableKey;

        if (isAnswerSuggested) {
            const itemIndex = selected.findIndex(i => i && i.key === key);
            moveSuggested(itemIndex);
            suggestedKey = null;
            fireUpdate();
            dispatch('placeDown', { key: selected[itemIndex].key });
        } else {
            selectedSnapshot = cloneDeep(selected);
            suggestedKey = key;
        }
        dispatchTraceInteraction(e);
    }

    /**
     * Handler for list item keySelect
     * @param {CustomEvent} e
     */
    function handleItemKeySelect(e) {
        if (isAnswerSuggested) {
            const focusBackKey = suggestedKey;
            placeDownSuggested(false);
            tick().then(() => {
                focusItemAtKey(focusBackKey);
            });
        } else {
            const focusedItem = findFocusedItem();
            if (focusedItem) {
                selectedSnapshot = cloneDeep(selected);
                suggestedKey = focusedItem.key;
            }
        }
        dispatchTraceInteraction(e);
    }

    /**
     * Handler for list item remove
     * @param {CustomEvent} event
     */
    async function handleItemRemove(event) {
        const key = event.detail.draggableKey;
        selectedSnapshot = cloneDeep(selected);
        selected = selected.map(item => {
            if (item && item.key === key) {
                return null;
            }
            return item;
        });
        //fix of focus-visible outline remains in Safari
        document.activeElement.blur();
        // re-focus only in case of keyboard navigation
        fireUpdate(event.detail.key != null, key);
        await tick();
        dispatchTraceInteraction(event);
    }

    /**
     * Handler for dropArea click
     * @param {Number} index
     * @param {Event} e
     */
    function handleEmptyAreaClick(index, e) {
        if (suggestedKey) {
            if (isAnswerSuggested) {
                moveSuggested(index);
                suggestedKey = null;
                fireUpdate();
                dispatch('placeDown', { key: selected[index].key });
            } else {
                //if suggested is among choices
                const key = suggestedKey;
                selected[index] = { key };
                selected = selected;
                fireUpdate();
                dispatch('placeDown', { key });
                tick().then(() => {
                    focusItemAtKey(key);
                });
            }
            dispatchTraceInteraction(e);
        }
    }

    /**
     * @fires {CustomEvent} update event with array of selected keys
     * @param {Boolean} controlFocus - if receiver of this event should shift focus to itself
     * @param {String} focusKey - with controlFocus, focus item with this key
     */
    function fireUpdate(controlFocus = true, focusKey = null) {
        dispatch('update', { controlFocus, focusKey });
    }

    /**
     * Handle window click to placeDown suggested item
     */
    function handleWindowClick() {
        if (isAnswerSuggested) {
            placeDownSuggested(false);
        }
    }

    /**
     * Dispatches a trace event
     * @param {CustomEvent} e
     */
    function dispatchTraceInteraction(e) {
        const eventData = traceInteraction(e, selected, selectedSnapshot);
        const interactionEvent = new CustomEvent('interactiontrace', eventData);
        interactionElement && interactionElement.dispatchEvent(interactionEvent);
    }
</script>

<style>
    ol {
        border: 0.375rem solid var(--color-border-default);
        padding: 1rem 2rem;
        list-style-type: none;

        --gap-between-lists: 4rem;

        &.position-left {
            margin-inline-start: var(--gap-between-lists);
        }
        &.position-right {
            margin-inline-end: var(--gap-between-lists);
        }
        &.position-top {
            margin-block-start: var(--gap-between-lists);
        }
        &.position-bottom {
            margin-block-end: var(--gap-between-lists);
        }

        &.orientation-horizontal {
            display: flex;
            flex-flow: row wrap;
            gap: 1rem;
            & li {
                min-width: var(--item-width, auto);
                & .item-bullet {
                    padding-bottom: 1rem;
                }
            }
        }

        &.orientation-vertical {
            & li {
                display: flex;
                justify-content: flex-start;
                align-items: center;
                & > :global([data-drag-drop-key]) {
                    flex: 1 1 auto;
                    padding: 1rem 0;
                }
                & .item-bullet {
                    flex: 0 0 4rem;
                    white-space: nowrap;
                }
            }
        }
    }

    .answer-placeholder {
        position: relative;
        border-radius: var(--radius-large);
        height: var(--item-height);
        width: 100%;
        background-color: var(--color-brand-light);

        &:before {
            /* border shouldn't increase width, because we don't want slot content to resize */
            content: '';
            position: absolute;
            height: 100%;
            width: 100%;
            top: 0;
            left: 0;
            box-sizing: border-box;
            border-radius: var(--radius-large);
            border: var(--border-thin) solid var(--color-brand-hover);
        }

        &.empty-targetable {
            cursor: pointer;
        }
    }

    .empty-targetable:hover:before,
    :global(.draggable-container--over) .empty-targetable:before {
        border: var(--border-medium-plus) dashed var(--color-brand-hover);
    }

    :global(body.draggable--is-dragging) .empty-targetable {
        cursor: unset;
    }

    .reorder-pending:first-child :global(.draggable-container:not(.draggable-mirror) > *),
    .reorder-pending .reorder-placed-over :global(.draggable-container > *) {
        display: none;
    }

    .reorder-placed-over {
        position: absolute;
        z-index: var(--layer-2);
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
</style>

<svelte:window on:click={handleWindowClick} on:focusin={handleWindowFocusin} />
<p id={keyboardInfoDefaultElementId} class="hidden" lang={instructionsLang}>{keyboardInfoDefault}</p>
<p id={keyboardInfoSortingElementId} class="hidden" lang={instructionsLang}>{keyboardInfoSorting}</p>
<ol
    role="application"
    class="sortable-list orientation-{orientation} position-{position}"
    aria-label={__('%s, %d items', ariaLabel, selectedKeysLength)}
    style={cssStyle}
    bind:this={container}
    on:keydown={!disabled && handleKeyDown}
    on:focusin={handleFocusin}
    on:focusout={handleFocusout}>
    {#each dropAreaArray as dropArea, index (index)}
        <li>
            <div class="item-bullet">{getBullet(index)}</div>
            <DropArea
                {disabled}
                {draggableGroupKey}
                key={index.toString()}
                focusable={false}
                on:update={handleDragUpdate}
                on:dragOver={handleDragOver}
                on:dragOut={handleDragOut}>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="answer-placeholder"
                    data-index={index.toString()}
                    use:resizeObserve={handleInteractionItemsResized.bind(this, index)}
                    class:empty-targetable={(!selected[index] || selected[index].pending) &&
                        (draggingAnswer || draggingChoice || suggestedKey)}
                    class:reorder-pending={selected[index] && selected[index].pending}
                    on:click|stopPropagation={!disabled && (e => handleEmptyAreaClick(index, e))}>
                    {#if selected[index]}
                        <DraggableListButton
                            key={selected[index].key}
                            {draggableGroupKey}
                            placed={true}
                            removable={itemRemovable}
                            ariaDescribedBy={suggestedKey === selected[index].key
                                ? keyboardInfoSortingElementId
                                : keyboardInfoDefaultElementId}
                            {disabled}
                            selected={suggestedKey === selected[index].key}
                            targetable={isAnswerSuggested && suggestedKey !== selected[index].key}
                            targeted={currentDropAreaKey === index.toString()}
                            tabbable={tabbable && index === firstAnswerIndex}
                            ariaGrabbed={suggestedKey === selected[index].key}
                            on:dragStart={handleDragStart}
                            on:dragStop={handleDragStop}
                            on:click={handleItemClick}
                            on:keySelect={handleItemKeySelect}
                            on:remove={handleItemRemove}>
                            <slot item={selected[index]} />
                            <p class="visually-hidden" lang={instructionsLang}>{__('Position %d', index + 1)}</p>

                            <span slot="remover-aria-label" lang={instructionsLang}>
                                {__('Return %s to the unordered options').split('%s')[0]}
                                <span lang={itemLang}>
                                    <slot item={selected[index]} />
                                </span>
                                {__('Position %d', index + 1)}
                                {__('Return %s to the unordered options').split('%s')[1]}
                            </span>
                        </DraggableListButton>
                        <span class="focus-keeper visually-hidden" aria-hidden={true} tabindex="-1" />
                    {/if}
                    {#if selected[index] && initialDropAreaKey === index.toString()}
                        <div class="reorder-placed-over">
                            <DraggableListButton placed={true} removable={itemRemovable}>
                                <slot item={selected[index]} />
                            </DraggableListButton>
                        </div>
                    {/if}
                </div>
            </DropArea>
        </li>
    {/each}
</ol>
