<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2020-24 (original work) Open Assessment Technologies SA ;
    import { __, generateElementId, getActualKey } from '@oat-sa-private/ui-core';
    import { breakpoints } from '@oat-sa-private/ui-identity';
    import { DraggableList, DraggableListItem } from '@oat-sa-private/ui-components';
    import ItemBlocks from '../../item/blocks/ItemBlocks.svelte';
    import MicroValidity from './MicroValidity.svelte';
    import MatchChoicesManagerFactory from './util/matchChoicesManager.js';
    import AriaHelperFactory from './util/ariaHelper.js';
    import { onMount, tick } from 'svelte';
    import resizeObserve from '../util/actions/resizeObserve.js';
    import { areas, getAreasOrder, isVerticalPosition, positions } from '../util/sharedVocabulary.js';

    /**
     * @typedef {Object} choice - represents one item from either set in the MatchInteraction
     * @property {string} key
     * @property {string} content
     * @property {number} matchMin
     * @property {number} matchMax
     * @property {Object[]} blockTree to be rendered
     * @property {string} plainText for SR
     * @property {number} position starting with 1
     */
    /**
     * @property {string[][]} pairs - follows "multiple directedPair" cardinality & baseType
     * @property {choice[][]} choices - choices[0] maps to source DraggableList ("Set A")
     *                                  choices[1] maps to targets list ("Set B")
     * @property {string} choicesPosition - top, left, bottom, right
     * @property {boolean} disabled
     * @property {string} instructionsLang - language of feedbacks and announcements for SR
     */
    export let pairs = [];
    export let choices = [];
    const choicesMgr = new MatchChoicesManagerFactory(choices, pairs);
    $: choicesMgr.setPairs(pairs);

    const choiceXKeys = choices[0].map(choice => choice.key);
    const choiceYKeys = choices[1].map(choice => choice.key);

    export let choicesPosition;
    export let disabled = false;
    export let instructionsLang;

    // DOM elements
    let ariaLiveElement;
    let containerElement;
    let choicesArea;
    let answerArea;

    const ariaHelper = new AriaHelperFactory(choices);

    // common draggable group key of whole interaction
    const draggableGroupKey = generateElementId('matchInteraction');

    const choicesAreaKey = 'choices'; // TODO: add elementId for uniqueness?
    const bucketPrefix = 'bucket_';
    const bucketPrefixRegex = /^bucket_/;

    const removeButtonWidth = 6.25;

    // position management
    const minimalWidthForPositions = breakpoints.width.medium;
    const forcedPosition = positions.top;
    let actualChoicesPosition = choicesPosition;
    $: horizontal = isVerticalPosition(actualChoicesPosition);
    $: areasOrder = getAreasOrder(actualChoicesPosition);

    /**
     * Forces a position if the width is below a threshold.
     * @param {number} width - The width threshold under what the position is forced.
     */
    function handleForcedPosition(width) {
        if (width <= minimalWidthForPositions) {
            if (actualChoicesPosition !== forcedPosition) {
                actualChoicesPosition = forcedPosition;
            }
        } else if (actualChoicesPosition !== choicesPosition) {
            actualChoicesPosition = choicesPosition;
        }
    }

    // currently selected choice in click & keyboard modes
    let selectedChoice;
    // separate focus position when a choice is selected
    let focusedBucketKey;

    let isDragging = false; // for styling
    let listChoiceHeight = 0; // max height of choice in choice list
    let choiceListTabbable = true;

    $: sortedUnusedChoices = pairs && choicesMgr.getSortedUnusedChoices();

    /*****************/
    /* Pairs helpers */
    /*****************/
    /**
     * Add new pair to pairs based on keys
     * @param {String} xKey
     * @param {String} yKey
     * @param {Boolean} [announce=true] do aria announcement
     * @returns {Boolean} true if added
     */
    function addPair(xKey, yKey, announce = true) {
        if (!choicesMgr.canReceiveChoice(xKey, yKey)) {
            return false;
        }
        pairs = pairs.concat([[xKey, yKey]]);
        if (announce) {
            ariaHelper.announceAddPair(xKey, yKey);
        }
        return true;
    }

    /**
     * Remove pair from pairs based on keys
     * @param {String} xKey
     * @param {String} yKey
     * @param {Boolean} [announce=true] do aria announcement
     * @returns {Boolean} true if removed
     */
    function removePair(xKey, yKey, announce = true) {
        const oldLength = pairs.length;
        pairs = pairs.filter(pair => pair[0] !== xKey || pair[1] !== yKey);
        if (announce) {
            ariaHelper.announceRemovePair(xKey, yKey);
        }
        return pairs.length < oldLength;
    }

    /******************/
    /* Choice helpers */
    /******************/
    /**
     * Try to move choice from source bucket to target bucket
     * (agnostic of input device)
     * @param {String} choiceKey
     * @param {String} sourceBucketKey
     * @param {String} targetBucketKey
     * @param {Boolean} reselect - if true, reselect the moved choice in its new list (for keyboard mode)
     */
    function moveChoice(choiceKey, sourceBucketKey = '', targetBucketKey = '', reselect = false) {
        // unprefix buckets
        const sourceBucketShortKey = sourceBucketKey.replace(bucketPrefixRegex, '');
        const targetBucketShortKey = targetBucketKey.replace(bucketPrefixRegex, '');

        // validate params (edge cases?)
        const allTargetAreaKeys = [choicesAreaKey].concat(choiceYKeys);
        if (!choiceXKeys.includes(choiceKey) || !allTargetAreaKeys.includes(targetBucketShortKey)) {
            throw new TypeError(`Invalid params for moveChoice: ${choiceKey}, ${sourceBucketKey}, ${targetBucketKey}`);
        }

        if (sourceBucketShortKey === choicesAreaKey) {
            // from choices
            if (targetBucketShortKey !== choicesAreaKey) {
                // to bucket
                addPair(choiceKey, targetBucketShortKey);
            }
        } else {
            // from bucket
            if (targetBucketShortKey === choicesAreaKey) {
                // to choices
                removePair(choiceKey, sourceBucketShortKey);
            } else if (targetBucketShortKey !== sourceBucketShortKey) {
                // or to another bucket
                if (addPair(choiceKey, targetBucketShortKey, false)) {
                    removePair(choiceKey, sourceBucketShortKey);
                    // addPair's announce has to be deferred after removePair's
                    ariaHelper.announceAddPair(choiceKey, targetBucketShortKey);
                }
            }
        }
        clearSelectedChoice().then(() => {
            // focus new choice button matching the one moved
            focusChoice(choiceKey, targetBucketKey);

            if (reselect) {
                selectedChoice = {
                    key: choiceKey,
                    areaKey: targetBucketKey
                };
            }
        });
    }

    /**
     * Focus the choice button defined by the given keys
     * @param {String} choiceKey
     * @param {String} areaKey
     */
    function focusChoice(choiceKey, areaKey) {
        if (containerElement) {
            const dropAreaSelector = `.drop-area[data-drag-drop-key=${areaKey}]`;
            const draggableSelector = `.draggable-container[data-drag-drop-key=${choiceKey}]`;
            const choiceBtn = containerElement.querySelector(`${dropAreaSelector} ${draggableSelector} .item-btn`);
            if (choiceBtn) {
                choiceBtn.focus();
            }
        }
    }

    /**
     * Is the choice made by (key, sourceBucketKey) THE current selected one?
     * @param {String} key - from choices[0] ("Set A")
     * @param {String} sourceBucketKey (always includes a prefix)
     * @returns {Boolean}
     */
    function isTheSelectedChoice(key, sourceBucketKey) {
        return selectedChoice && selectedChoice.key === key && selectedChoice.areaKey === sourceBucketKey;
    }

    /**
     * Clear selected choice & dragging state
     * @param {Boolean} refocus - puts focus back on choice after dropping it
     * @returns {Promise} resolves when done
     */
    function clearSelectedChoice(refocus = false) {
        if (!selectedChoice) {
            return Promise.resolve();
        }
        const originalChoiceKey = selectedChoice.key;
        const originalAreaKey = selectedChoice.areaKey;
        return new Promise(resolve => {
            // deferred so drop events can fire first
            setTimeout(() => {
                isDragging = false;
                selectedChoice = null;
                focusedBucketKey = null;
                if (refocus) {
                    focusChoice(originalChoiceKey, originalAreaKey);
                }
                resolve();
            }, 0);
        });
    }

    /******************/
    /* Bucket helpers */
    /******************/
    /**
     * Find out where selected choice is allowed to be moved (includes choicesArea and current location)
     * @param {String} choiceKey
     * @param {String} sourceBucketShortKey
     * @returns {String[]}
     */
    function getValidRecipients(choiceKey, sourceBucketShortKey) {
        const validBucketKeys = choiceYKeys.filter(
            yKey => yKey === sourceBucketShortKey || choicesMgr.canReceiveChoice(choiceKey, yKey)
        );
        return [choicesAreaKey].concat(validBucketKeys);
    }

    /**
     * Move the keyboard focus one place left or right to the next open bucket,
     * taking into account selectedChoice's key and source bucket
     * @param {Object} choice
     * @param {String} choice.key
     * @param {String} choice.sourceBucketKey
     * @param {Boolean} [previous=false]
     */
    function focusAdjacentBucket({ key, sourceBucketKey = '' }, previous = false) {
        const sourceBucketShortKey = sourceBucketKey.replace(bucketPrefixRegex, '');
        const focusedBucketShortKey = focusedBucketKey
            ? focusedBucketKey.replace(bucketPrefixRegex, '')
            : choicesAreaKey;

        const validAreaKeys = getValidRecipients(key, sourceBucketShortKey);
        if (validAreaKeys.length === 1) {
            ariaHelper.announceAnswerAreaFull();
            return;
        }

        // Go +1 or -1
        const delta = previous ? -1 : 1;
        const currentIndex = validAreaKeys.findIndex(areaKey => areaKey === focusedBucketShortKey);
        const nextIndex = (currentIndex + validAreaKeys.length + delta) % validAreaKeys.length; // loop it round
        let targetAreaKey = validAreaKeys[nextIndex];

        // add back prefix
        if (targetAreaKey !== choicesAreaKey) {
            targetAreaKey = `${bucketPrefix}${targetAreaKey}`;
        }

        focusBucket(targetAreaKey);
    }

    /**
     * Focuses a bucket list element by given key
     * @param {String} bucketKey
     */
    function focusBucket(bucketKey) {
        const listSelector = `.drop-area[data-drag-drop-key=${bucketKey}] .draggable-list`;
        const listElt = containerElement.querySelector(listSelector);
        if (listElt) {
            listElt.focus();
            if (bucketKey === choicesAreaKey) {
                ariaHelper.announceUnusedChoices();
            } else {
                ariaHelper.announceBucket(bucketKey);
            }
            focusedBucketKey = bucketKey;
        }
    }

    /*************************/
    /* Choice event handlers */
    /*************************/
    /**
     * Handle choice selection (by click or keypress)
     * set selected choice
     * @param {CustomEvent} event
     */
    function handleChoiceSelect(event) {
        const { draggableKey: choiceKey } = event.detail;
        const sourceArea = event.detail.target.closest('.drop-area');
        const { dragDropKey: sourceBucketKey } = sourceArea.dataset;

        if (!choiceKey || !sourceBucketKey) {
            return;
        }

        if (isTheSelectedChoice(choiceKey, sourceBucketKey)) {
            // clicked same choice: clear it
            clearSelectedChoice(true).then(() => {
                ariaHelper.announce(__('deselected'), true);
            });
        } else if (!selectedChoice) {
            // clicked new choice: select it
            selectedChoice = {
                key: choiceKey,
                areaKey: sourceBucketKey
            };
            focusedBucketKey = sourceBucketKey;

            const thisChoice = choices[0].find(choice => choice.key === choiceKey);
            ariaHelper.announce(__('selected %s', thisChoice.plainText), true);

            // move focus to first bucket automatically (keyboard mode only)
            if (sourceBucketKey === choicesAreaKey && event.type === 'keySelect') {
                focusAdjacentBucket({
                    key: selectedChoice.key,
                    sourceBucketKey: selectedChoice.areaKey
                });
            }
        }
    }

    /**
     * Set selected choice
     * @param {CustomEvent} event
     */
    function handleChoiceDragStart(event) {
        selectedChoice = {
            key: event.detail.draggableKey,
            areaKey: event.detail.dropAreaKey
        };
    }

    /**
     * Handle removal button of placed choice
     * Return choice to choices, and then focus it in that list
     * @param {String} xKey key of choice
     * @param {String} yKey key of bucket
     */
    function handleChoiceRemoveButton(xKey, yKey) {
        removePair(xKey, yKey);
        clearSelectedChoice()
            .then(() => {
                ariaHelper.announceReturned(xKey);
                return tick();
            })
            .then(() => {
                focusChoice(xKey, choicesAreaKey);
            });
    }

    /*********************************/
    /* Droppable area event handlers */
    /*********************************/
    /**
     * Dragged choice must leave its area of origin before we consider it dragging
     */
    function handleAreaDragOut() {
        isDragging = Boolean(selectedChoice);
    }

    /**
     * Handle draggable being dropped into a droppable area
     * @param {CustomEvent} event
     */
    function handleAreaDrop(event) {
        const { draggableKey, dropAreaKey } = event.detail;
        const sourceBucketKey = selectedChoice.areaKey.replace(bucketPrefixRegex, '');

        if (!isDragging || !draggableKey || !sourceBucketKey || !dropAreaKey) {
            return;
        }

        moveChoice(draggableKey, sourceBucketKey, dropAreaKey);
    }

    /**
     * Handle choice being clicked into a droppable area
     * @param {CustomEvent} event
     */
    function handleAreaClick(event) {
        const { dragDropKey } = event.target.closest('.drop-area').dataset;

        if (!selectedChoice || !dragDropKey) {
            return;
        }

        moveChoice(selectedChoice.key, selectedChoice.areaKey, dragDropKey);
    }

    /**
     * Handle keyup events on an area
     * @param {KeyboardEvent} event
     */
    function handleAreaKeyup(event) {
        if (!selectedChoice) {
            return;
        }
        const pressedKey = getActualKey(event);

        switch (pressedKey) {
            // move focus left or right
            case 'left': {
                if (selectedChoice) {
                    event.preventDefault();
                    event.stopPropagation();
                    focusAdjacentBucket(
                        {
                            key: selectedChoice.key,
                            sourceBucketKey: selectedChoice.areaKey
                        },
                        true
                    );
                }
                break;
            }
            case 'right': {
                if (selectedChoice) {
                    event.preventDefault();
                    event.stopPropagation();
                    focusAdjacentBucket(
                        {
                            key: selectedChoice.key,
                            sourceBucketKey: selectedChoice.areaKey
                        },
                        false
                    );
                }
                break;
            }
            // place down
            case 'enter':
            case 'space': {
                if (selectedChoice) {
                    event.preventDefault();
                    event.stopPropagation();
                    moveChoice(selectedChoice.key, selectedChoice.areaKey, focusedBucketKey);
                }
                break;
            }
            // cancel
            case 'esc': {
                if (selectedChoice) {
                    ariaHelper.announceCancelled(selectedChoice.key);
                    clearSelectedChoice(true);
                }
                break;
            }
        }
    }

    /***********************/
    /* Global key handlers */
    /***********************/
    /**
     * Handle some key events which may bubble to the window (e.g. cancel selection, tab, scroll during selection)
     * @param {KeyboardEvent} event
     */
    function handleWindowKeydown(event) {
        if (!selectedChoice) {
            return;
        }

        const pressedKey = getActualKey(event);

        switch (pressedKey) {
            case 'esc':
            case 'tab': {
                // prevent drop, if over a droppable when cancelled
                isDragging = false;

                // simulate click on document to cancel current drag
                const clickEvent = document.createEvent('MouseEvents');
                clickEvent.initEvent('mouseup', true, true);
                document.dispatchEvent(clickEvent);

                ariaHelper.announceCancelled(selectedChoice.key);
                // clear and refocus choice
                const refocus = pressedKey === 'esc';
                clearSelectedChoice(refocus);
                break;
            }
        }
    }

    // set up values to pass into CSS via style attribute
    const numBuckets = choices[1].length;
    let containerWidth;
    let headerHeight;

    /**
     * Measure interaction container's width
     * @param {CustomEvent} event
     */
    function handleInteractionResized(event) {
        const { width } = event.detail;
        if (width) {
            containerWidth = `${width}px`;
            handleForcedPosition(width);
        }
        // measure and sync column heading heights
        const firstColumnHeader = containerElement.querySelector('.bucket-heading');
        const { height } = firstColumnHeader.getBoundingClientRect();
        if (height) {
            headerHeight = `${height}px`;
        }
    }

    $: style = getStyles(containerWidth, headerHeight, numBuckets, listChoiceHeight, sortedUnusedChoices);

    /**
     * Generate style string with various css variable
     * @returns {String} string with variables
     */
    function getStyles() {
        let css = '';
        css += containerWidth ? `--container-width:${containerWidth};` : '';
        css += headerHeight ? `--header-height:${headerHeight};` : '';
        css += numBuckets ? `--buckets:${numBuckets};` : '';
        css += listChoiceHeight ? `--item-list-height:${listChoiceHeight}px;` : '';
        css += `--remove-button-width:${removeButtonWidth}rem;`;
        const choicesInList = choicesMgr.getChoicesPresentItemCount();
        let rows = Math.ceil(choicesInList / numBuckets);
        //additional row for removed choices
        if (choicesInList % numBuckets === 0) {
            rows += 1;
        }

        css += `--rows:${Math.max(1, rows)};`;
        return css;
    }

    onMount(() => {
        if (ariaLiveElement) {
            ariaHelper.setAriaLiveContainer(ariaLiveElement);
        }
    });
</script>

<style>
    .layout-container {
        /**
         * These variables and calculations compute an overall column width and choice width
         * which are used to make the choice buttons uniform, while the layout remains responsive.
         */
        --container-width: 100%; /* overridden by clientWidth-bound value */
        --header-height: 2rem; /* overridden by calculated value from headings content */
        --areas-gap: 4rem; /* fixed (qti-choices-left) */
        --grid-row-gap: 1rem; /* fixed */
        --grid-col-gap: 2rem; /* fixed */
        --column-padding: 2rem; /* fixed */

        --buckets: 3; /* overridden by calculated value from choices[1].length */

        /* intermediate values */
        --sum-columns-paddings: calc(var(--columns) * var(--column-padding) * 2);
        --sum-remove-buttons: calc(var(--columns) * var(--remove-button-width));
        --sum-buckets-grid-gaps: calc((var(--buckets) - 1) * var(--grid-col-gap));
        --container-without-gaps: calc(var(--container-width, 100%) - var(--areas-gap) - var(--sum-buckets-grid-gaps));
        /* responsive equal column widths (for qti-choices-left) */
        --column-width: calc(var(--container-without-gaps) / var(--columns));
        /* responsive equal choice widths (for qti-choices-left) */
        --choice-width: calc(
            (var(--container-without-gaps) - var(--sum-columns-paddings) - var(--sum-remove-buttons)) / var(--columns)
        );
        @define-mixin extended-drop-area-background {
            &::before {
                content: '';
                position: absolute;
                top: -0.125rem;
                left: -2.125rem;
                right: -2.125rem;
                bottom: -0.125rem;
                border: var(--border-medium-plus) dashed var(--color-border-actionable-hover);
                border-radius: var(--radius-large);
                pointer-events: none;
                z-index: var(--layer-0);
                background-color: var(
                    --color-bg-selection
                ); /* relative parent container can spread filling of background to absolute element, so added this*/
            }
            &::after {
                left: -2.125rem;
                right: -2.125rem;
            }
        }

        display: flex;
        outline: none; /* container acts as a focus keeper in certain cases */
        &.choices-top,
        &.choices-bottom {
            --columns: var(--buckets);
            --rows: 1; /* overridden by calculated value from choices[0].length */
            flex-direction: column;
            & > .choices {
                & :global(.drop-area) {
                    padding: var(--column-padding) 0;
                }
                & :global(.grid .draggable-list) {
                    grid-template-columns: repeat(var(--columns), var(--choice-width));
                }
                & :global(li.removed) {
                    grid-column: var(--columns);
                    grid-row: var(--rows);
                }
            }
            /*in keyboard mode the focused ul gets the dashed border style */
            &.has-selected-choice > .choices :global-nested(.draggable-list:focus) {
                @add-mixin extended-drop-area-background;
            }
        }
        &.choices-left,
        &.choices-right {
            --columns: calc(var(--buckets) + 1);
            & > .choices {
                flex: 0 0 var(--column-width);
                margin-top: calc(var(--header-height) + var(--grid-row-gap));
                z-index: 1; /* keeps it higher than .buckets */

                /* DraggableList ul */
                & :global(.draggable-list) {
                    width: var(--choice-width);
                    margin: 0 auto;
                }
            }
        }
        &.choices-left {
            & > .choices {
                margin-inline-end: var(--areas-gap);
            }
        }
        &.choices-right {
            & > .choices {
                margin-inline-start: var(--areas-gap);
            }
        }

        & > .buckets {
            flex: 1 0 auto;
            display: grid;
            grid-auto-flow: column;
            grid-template-rows: max-content 1fr;
            grid-template-columns: repeat(auto-fill, var(--column-width));
            row-gap: var(--grid-row-gap);
            column-gap: var(--grid-col-gap);

            & .bucket-heading {
                & h6 {
                    margin: 0;
                }
                & :global(.constraints) {
                    text-align: end;
                }
            }

            /* DraggableList root */
            & :global-nested(.drop-area) {
                background: var(--color-bg-selection);

                /* DraggableList ul */
                & .draggable-list {
                    width: calc(var(--choice-width) + var(--remove-button-width));
                    margin: 0 auto;

                    /* DraggableListItem li - receive external height */
                    & .draggable-list-item {
                        height: var(--item-list-height);
                        background: transparent;
                    }
                }
            }
        }

        /* all drop areas (within .choices and .buckets) */
        & :global-nested(.drop-area) {
            padding: var(--column-padding);
            border: var(--border-thin) solid transparent;
            border-radius: var(--radius-large);
            position: relative;

            & .draggable-list {
                outline: none;

                & .draggable-list-item {
                    background: transparent;
                }
            }
        }

        /* pseudo-element mixin adds dashed medium border without causing border jump */
        @define-mixin pseudo-dashed-border {
            &::after {
                content: '';
                position: absolute;
                top: -0.125rem;
                left: -0.125rem;
                right: -0.125rem;
                bottom: -0.125rem;
                border: var(--border-medium-plus) dashed var(--color-border-actionable-hover);
                border-radius: var(--radius-large);
                pointer-events: none;
            }
        }

        /* suggested area style */
        &.has-selected-choice .buckets {
            & :global(.drop-area.suggested:not(:hover):not(:focus-within)) {
                border-color: var(--color-border-actionable-hover);
            }
        }

        /* suggested area dragover style - classes to override previous block */
        &.has-selected-choice.is-dragging .choices,
        &.has-selected-choice.is-dragging .buckets {
            & :global-nested(.drop-area.suggested.draggable-container--over) {
                background: var(--color-bg-selection);
                border-color: transparent;
                @add-mixin pseudo-dashed-border;
            }
        }
        &.has-selected-choice.is-dragging .choices {
            & :global-nested(.horizontal .drop-area.suggested.draggable-container--over) {
                @add-mixin extended-drop-area-background;
            }
        }

        /* in keyboard mode the focused ul gets the dashed border style */
        &.has-selected-choice :global-nested(.draggable-list:focus) {
            @add-mixin pseudo-dashed-border;
        }

        /* choice buttons */
        & :global(.item-btn),
        & :global(.drop-area.suggested) {
            cursor: pointer;
        }

        &.has-selected-choice :global-nested(.item-btn) {
            pointer-events: none;

            /* selected or "picked up" style */
            &.selected {
                &:focus::after,
                &:focus-visible::after {
                    content: none;
                }
            }
        }
    }
    /* suggested area hover style - needs to use absence of global library class on body */
    :global(body:not(.draggable--is-dragging) .layout-container.has-selected-choice .drop-area.suggested:hover) {
        background: var(--color-bg-selection);
        border-color: transparent;
        @add-mixin pseudo-dashed-border;
    }

    /* suggested area hover style - needs to use absence of global library class on body */
    :global(
            body:not(.draggable--is-dragging)
                .layout-container.choices-top.has-selected-choice
                .choices
                .drop-area.suggested:hover
        ) {
        @add-mixin extended-drop-area-background;
    }
</style>

<svelte:window on:click={clearSelectedChoice} on:keydown={handleWindowKeydown} />

<div class="match-non-tabular">
    <p class="aria-live-container visually-hidden" bind:this={ariaLiveElement} lang={instructionsLang}>
        <span aria-live="assertive" />
        <span aria-live="polite" />
    </p>
    <div
        class="layout-container choices-{actualChoicesPosition}"
        class:has-selected-choice={selectedChoice}
        class:is-dragging={isDragging}
        bind:this={containerElement}
        use:resizeObserve={handleInteractionResized}
        {style}
        tabindex="-1">
        {#each areasOrder as area (area)}
            {#if area === areas.choices}
                <div class="choices" bind:this={choicesArea}>
                    <DraggableList
                        {draggableGroupKey}
                        dropAreaKey={choicesAreaKey}
                        ariaLabel={ariaHelper.getUnusedChoicesAriaLabel()}
                        presentItemsCount={pairs && choicesMgr.getChoicesPresentItemCount()}
                        suggested={selectedChoice}
                        inListNavigation={!selectedChoice}
                        {disabled}
                        tabindex="-1"
                        isListVertical={!horizontal}
                        mode="grid"
                        gridSize={numBuckets}
                        bind:itemHeight={listChoiceHeight}
                        on:dragOut={handleAreaDragOut}
                        on:drop={handleAreaDrop}
                        on:click={handleAreaClick}
                        on:keyup={handleAreaKeyup}
                        bind:tabbable={choiceListTabbable}>
                        {#each sortedUnusedChoices as choiceX, i (choiceX.key)}
                            <DraggableListItem
                                key={choiceX.key}
                                {draggableGroupKey}
                                amount={pairs && choicesMgr.getChoiceXStackSize(choiceX.key)}
                                removed={pairs && choicesMgr.getChoiceXStackSize(choiceX.key) === 0}
                                selected={selectedChoice && isTheSelectedChoice(choiceX.key, choicesAreaKey)}
                                tabbable={choiceListTabbable && i === 0}
                                {disabled}
                                on:dragStart={handleChoiceDragStart}
                                on:dragStop={clearSelectedChoice}
                                on:click={handleChoiceSelect}
                                on:keySelect={handleChoiceSelect}>
                                <div>
                                    <ItemBlocks blockTree={choiceX.blockTree} />
                                    <span class="visually-hidden" lang={instructionsLang}
                                        >{ariaHelper.getUnusedChoiceAriaLabel(
                                            i + 1,
                                            choicesMgr.getChoicesPresentItemCount(),
                                            choicesMgr.getChoiceXStackSize(choiceX.key)
                                        )}</span>
                                </div>
                            </DraggableListItem>
                        {/each}
                    </DraggableList>
                </div>
            {:else if area === areas.answers}
                <div class="buckets" bind:this={answerArea}>
                    {#each choices[1] as choiceY, j (choiceY.key)}
                        <header class="bucket-heading">
                            <h6>
                                <ItemBlocks blockTree={choiceY.blockTree} />
                            </h6>
                            <MicroValidity
                                {...choiceY}
                                usageCount={pairs && choicesMgr.getChoiceYUsageCount(choiceY.key)}
                                showMax={false}
                                lang={instructionsLang} />
                        </header>
                        <DraggableList
                            {draggableGroupKey}
                            dropAreaKey="{bucketPrefix}{choiceY.key}"
                            ariaLabel={selectedChoice ? ariaHelper.getBucketAriaLabel(choiceY) : __('List')}
                            presentItemsCount={pairs && choicesMgr.getChoicesPairedWithKey(choiceY.key).length}
                            presentItemSelector={'.item-btn, .remover'}
                            suggested={selectedChoice && choicesMgr.canReceiveChoice(selectedChoice.key, choiceY.key)}
                            tabindex="-1"
                            inListNavigation={!selectedChoice}
                            {disabled}
                            on:dragOut={handleAreaDragOut}
                            on:drop={handleAreaDrop}
                            on:click={handleAreaClick}
                            on:keyup={handleAreaKeyup}>
                            <!-- matched list items: -->
                            <!-- extra 'pairs' variable inside function calls are to guarantee re-run on change -->
                            {#each choicesMgr.getChoicesPairedWithKey(choiceY.key, pairs) as choiceX, j (choiceX.key)}
                                <DraggableListItem
                                    key={choiceX.key}
                                    {draggableGroupKey}
                                    placed={true}
                                    removable={true}
                                    removed={pairs && !choicesMgr.areKeysPaired(choiceX.key, choiceY.key)}
                                    selected={selectedChoice &&
                                        isTheSelectedChoice(choiceX.key, `${bucketPrefix}${choiceY.key}`)}
                                    tabbable={j === 0}
                                    {disabled}
                                    on:dragStart={handleChoiceDragStart}
                                    on:dragStop={clearSelectedChoice}
                                    on:click={handleChoiceSelect}
                                    on:keySelect={handleChoiceSelect}
                                    on:remove={() =>
                                        !selectedChoice && handleChoiceRemoveButton(choiceX.key, choiceY.key)}>
                                    <div>
                                        <ItemBlocks blockTree={choiceX.blockTree} />
                                        <span class="visually-hidden" lang={instructionsLang}
                                            >{ariaHelper.getPlacedChoiceAriaLabel(choiceY)}</span>
                                    </div>
                                    <span slot="remover-aria-label"
                                        >{ariaHelper.getRemoveChoiceAriaLabel(choiceX)}</span>
                                </DraggableListItem>
                            {/each}
                            <!-- hidden list item placeholders (amount depends on choiceY.matchMax): -->
                            {#each choicesMgr.getPlaceholderChoices(choiceY, pairs) as choiceX (choiceX.key)}
                                <DraggableListItem key={choiceX.key} placed={true} removed={true} />
                            {/each}
                        </DraggableList>
                    {/each}
                </div>
            {/if}
        {/each}
    </div>
</div>
