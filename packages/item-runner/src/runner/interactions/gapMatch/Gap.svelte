<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { __, getActualKey } from '@oat-sa-private/ui-core';
    import { DropArea } from '@oat-sa-private/ui-components';
    import { getContext, tick } from 'svelte';
    import Choice from './Choice.svelte';
    import { extractFromClasses } from '../util/attributes.js';
    import { traceInteraction } from './util.js';

    /**
     * The Gap is a separate component which is used if GapMatchInteraction.
     * It gets its props from the ItemBlockTree of the interaction body,
     * It communicates with interaction by reading storages and dispatching events
     *
     * @property {String} identifier - internal identifier of the token
     */
    export let attributes;

    const { identifier, required } = attributes;
    // interaction-level QTI attributes derived from classes:
    const gapWidthInLetters = extractFromClasses(attributes.class, 'qti-input-width-', val => parseInt(val, 10));
    const allowedGapWidths = [1, 2, 3, 4, 6, 10, 15, 20, 72]; //widths allowed by QTI classes "qti-input-width-*"
    const letterWidth = 2.15; // UI approved "M" letter width in rems

    // eslint-disable-next-line no-unused-vars
    let tabbable = true; // if gap filled by choice we shouldn't focus gap
    let gapElement; // gap element
    let selectedChoice; // if gap filled by choice - it is id will be here
    let selectedSnapshot; // snapshot of selectedChoices before last change
    let matchedChoiceLabel = __('empty'); // UX requirement is to announce choice label if gap is filled
    let disabled;
    let qtiGapWidth;

    const choicesStore = getContext('choicesStore');
    const stateStore = getContext('stateStore');
    const activeElementStore = getContext('activeElementStore');
    const interactionElementStore = getContext('interactionElementStore');

    const requiredAtr = __('required');

    // common draggable group key of whole interaction and gap width
    const { draggableGroupKey, ariaDescribedByContainerIdForEmptyGap } = $stateStore;

    const focusTracker = getContext('focusTracker');
    const storeMatches = getContext('handleDrop');

    // increase global gaps counter by one
    stateStore.addGap();

    stateStore.addGapRequireAttribute({ identifier, required });

    if (gapWidthInLetters && allowedGapWidths.includes(gapWidthInLetters)) {
        if (gapWidthInLetters === 72) {
            qtiGapWidth = 0; // width: 100%
        } else {
            qtiGapWidth = gapWidthInLetters * letterWidth;
            const gapQtiWidth = Math.round(gapWidthInLetters * letterWidth * 10) / 10; //round to first decimal
            const minGapWidth = 7.5; // width of "required" word on en language.
            qtiGapWidth = Math.max(gapQtiWidth, minGapWidth); //compare in rems
        }
    }

    $: if ($stateStore) {
        selectedChoice = getChoiceByGap(identifier, $stateStore.selected);
        selectedSnapshot = $stateStore.selected;
    }

    $: disabled = $stateStore.disabled;

    $: cssStyle = [
        `--gap-height: ${$stateStore.gapDimensions.height}px`,
        `--gap-width: ${$stateStore.gapDimensions.width}px`,
        `--qti-gap-width: ${qtiGapWidth && qtiGapWidth !== 0 ? `${qtiGapWidth}rem` : '100%'}`,
        `--matched-gap-width: ${qtiGapWidth === 0 ? '100%' : 'auto'}`
    ].join(';');

    //it should be lower than "addGap" function
    const gapsNumber = $stateStore.gapsNumber;

    /**
     * Handle click on choice in gap
     * @returns {boolean} - true if choice added to empty gap
     */
    function handleChoiceClick() {
        if ($activeElementStore) {
            // if exists it means we prepared for choice drop
            if ($activeElementStore.dropAreaKey === identifier) {
                // drop element to the same gap
                activeElementStore.set(null);
            } else {
                //drop element to another gap
                addPair({
                    draggableKey: $activeElementStore.draggableKey,
                    dropAreaKey: identifier
                });
            }
        } else {
            // try to start drag
            if (selectedChoice) {
                // start only if gap contains choice
                activeElementStore.set({
                    draggableKey: selectedChoice,
                    dropAreaKey: identifier
                });
                return true;
            }
        }
        tick().then(() => storeFirstChoice());
        return false;
    }

    /**
     * Handle gap key press by calling click handler
     */
    function handleChoiceKeyUp() {
        if (handleChoiceClick()) {
            focusTracker.focusFirstEmptyGap();
        }
    }

    /**
     * Drop choice to empty gap
     * @param {Event} e
     * @returns {boolean} - true if choice added to empty gap
     */
    function handleGapClick(e) {
        if ($activeElementStore) {
            selectedSnapshot = $stateStore.selected;
            const draggableKey = $activeElementStore.draggableKey;
            addPair({
                draggableKey,
                dropAreaKey: identifier
            });
            tick().then(() => storeFirstChoice());
            let position;
            if (e instanceof MouseEvent) {
                position = {
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenX: e.screenX,
                    screenY: e.screenY
                };
            }
            dispatchTraceInteraction(e, draggableKey, position);
            return true;
        }
        return false;
    }

    /**
     * Drop choice to empty gap by calling click handler
     * @param {KeyboardEvent} e
     */
    function handleGapKeyUp(e) {
        const pressedKey = getActualKey(e);
        switch (pressedKey) {
            case 'enter':
            case 'space':
                e.preventDefault();
                if (handleGapClick(e)) {
                    // after placing the choice, gap switched into non-focusable state and we loose focus. focus matched choice.
                    tick().then(() => {
                        focusTracker.focusChoiceInGap(gapElement);
                    });
                }
                break;
        }
    }

    /**
     * Handle drop event
     * @param {Event} e
     */
    function handleDrop(e) {
        const { draggableKey } = e.detail;
        if (!draggableKey) {
            tabbable = true;
            return;
        }
        if (selectedChoice) {
            handleChoiceClick();
        } else {
            handleGapClick(e);
        }
        tabbable = false;
    }

    /**
     * find first filled gap and store its choice
     */
    function storeFirstChoice() {
        const choices = focusTracker.getAllFocusableChoicesInGaps().filter(el => el.classList.contains('item-btn'));
        if (choices.length) {
            const choiceId = choices[0].parentNode.getAttribute('data-drag-drop-key');
            stateStore.setChoiceZeroIndex(choiceId);
        }
    }

    /**
     * Add matched choice and gap to response and set correct message for UX
     * @param {Object} newPair - pairs of gap and related choices
     * @param {String} newPair.dropAreaKey - key of gap to which choice is dropped
     * @param {String} newPair.draggableKey - key of choice which is dropped to gap
     */
    function addPair(newPair) {
        const { dropAreaKey, draggableKey } = newPair;
        const choiceListRelatedGap = $activeElementStore.dropAreaKey.includes('choice');
        const isActiveChoiceFromChoices = $activeElementStore.dropAreaKey === `${draggableKey}-gap`; // from Choice#getDropAreaKey

        if (dropAreaKey !== $activeElementStore.dropAreaKey && choiceListRelatedGap) {
            // drag choice from list to gap
            storeMatches([newPair]); // add new pair
        } else if (isActiveChoiceFromChoices) {
            // drag choice from list to filled gap
            storeMatches([newPair]); // replace a pair
        } else if ($activeElementStore && dropAreaKey !== $activeElementStore.dropAreaKey && !choiceListRelatedGap) {
            // drag choice between gaps
            if (!selectedChoice) {
                // move choice from current gap to empty gap and remove old pair
                storeMatches([
                    newPair,
                    {
                        draggableKey: null,
                        dropAreaKey: $activeElementStore.dropAreaKey
                    }
                ]);
            } else {
                // move choice from current gap to filled gap
                storeMatches([
                    newPair,
                    {
                        draggableKey: selectedChoice,
                        dropAreaKey: $activeElementStore.dropAreaKey
                    }
                ]);
            }
        }
        activeElementStore.set(null);

        const content = $choicesStore[draggableKey].content;
        stateStore.setConfirmation(__('%s has been placed in Gap %d.', content, gapsNumber));
        matchedChoiceLabel = content;
    }

    /**
     * Get choice id from pair using gap id
     * @param {string} gapId - gap id in pair
     * @param {object} selectedPairs - pairs of gap and related choices
     * @returns {string|null} if choice id was not found in any pair - return false
     */
    function getChoiceByGap(gapId, selectedPairs) {
        let choiceId = null;
        selectedPairs.some(pair => {
            if (pair.gapId === gapId) {
                choiceId = pair.choiceId;
                return true;
            }
            return false;
        });

        return choiceId;
    }

    /**
     * Catches event 'remove' and removes choice from gap
     * @param {CustomEvent} event
     */
    async function handleRemoveChoice(event) {
        activeElementStore.set(null);
        // remove old pair
        storeMatches([
            {
                draggableKey: null,
                dropAreaKey: identifier
            }
        ]);
        // we are losing 'tab focus' programmatically, so make 'tab focus' available for answer area
        focusTracker.makeAnswerAreaFocusable();
        // focusTracker.focusChoiceListArea();
        matchedChoiceLabel = __('empty');

        if (event.detail.pressedKey != null) {
            await tick();
            focusTracker.focusChoiceListArea();
        }
    }

    /**
     * Dispatches a trace event
     * @param {CustomEvent} e
     * @param {string} draggableKey
     * @param {Object} position
     */
    function dispatchTraceInteraction(e, draggableKey, position) {
        const eventData = traceInteraction(e, $stateStore.selected, selectedSnapshot, draggableKey, position);
        const interactionEvent = new CustomEvent('interactiontrace', eventData);
        $interactionElementStore.dispatchEvent(interactionEvent);
    }
</script>

<style>
    .gap {
        --remover-width: 6rem;
        position: relative;
        display: inline-block;
        background-color: var(--color-bg-selection);
        border-radius: var(--radius-large);
        min-height: 4rem;
        line-height: var(--line-height-default);
        vertical-align: middle;
        margin: var(--space-half) 0;
        width: var(--matched-gap-width);
        max-width: 100%;

        &.disabled {
            background-color: var(--color-bg-disabled-subtle);
            cursor: not-allowed;
            pointer-events: none;
        }
        & :global(.drop-area) {
            height: 100%;
        }
        & :global(div[class*='qti-input-width-']) {
            --choice-label-paddings: 2.5rem;
            --icon-space: 4.25rem;
            --choice-border-width: 0.25rem;
            width: calc(
                var(--qti-gap-width) + var(--choice-label-paddings) + var(--icon-space) + var(--choice-border-width) +
                    var(--remover-width)
            );
        }
        & :global(div[class*='qti-input-width-72']) {
            width: var(--qti-gap-width);
        }
    }
    .gap-droppable {
        --choice-full-width: calc(var(--gap-width) + var(--remover-width));
        outline: none;
        height: var(--gap-height);
        width: var(--choice-full-width);
        max-width: 100%;
        border: 0.125rem solid var(--color-border-active);
        border-radius: var(--radius-large);

        &.matched {
            min-width: var(--choice-full-width);
            border: 0;
        }

        &.activated:not(.matched) {
            cursor: pointer;

            &:hover {
                border: var(--border-medium-plus) dashed var(--color-border-actionable-hover);
            }
        }
        & > span {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            color: var(--color-bg-feedback);
            font-size: var(--fontsize-body);
        }
    }
    :global(.draggable-container--over) {
        & .gap-droppable.activated:not(.matched) {
            border: var(--border-medium-plus) dashed var(--color-border-actionable-hover);
        }
    }
    :global(.gap-droppable:not(.matched):focus-visible) {
        @add-mixin outline-focus-after;

        &::after {
            border-radius: var(--radius-large);
        }
    }

    :global([data-layouts~='hideFeedbacksLayout']) {
        & .required-label {
            visibility: hidden;
        }
    }
</style>

<div class="gap" class:disabled style={cssStyle}>
    <DropArea key={identifier} on:update={handleDrop} {draggableGroupKey} focusable={false} {disabled}>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
            class="gap-droppable {attributes.class || ''}"
            class:selected={$activeElementStore && $activeElementStore.dropAreaKey === identifier}
            class:activated={$activeElementStore}
            class:matched={selectedChoice}
            tabindex={selectedChoice ? void 0 : '-1'}
            bind:this={gapElement}
            role={selectedChoice !== null ? 'button' : 'region'}
            aria-atomic={true}
            aria-labelledby={`gap_${gapsNumber}_label`}
            aria-describedby={selectedChoice === null && $activeElementStore
                ? ariaDescribedByContainerIdForEmptyGap
                : void 0}
            on:click={!disabled && handleGapClick}
            on:keyup={!disabled && handleGapKeyUp}>
            {#if selectedChoice !== null}
                <Choice
                    area={identifier}
                    key={selectedChoice}
                    matchedGap={identifier}
                    on:remove={!disabled && handleRemoveChoice}
                    on:choiceClick={!disabled && handleChoiceClick}
                    on:choiceKeyup={!disabled && handleChoiceKeyUp}
                    {disabled} />
            {:else if required}<span class="required-label">{requiredAtr}</span>{/if}
            <div class="hidden" id={`gap_${gapsNumber}_label`}>
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html __(
                    'Gap %d %s %s',
                    gapsNumber,
                    selectedChoice ? matchedChoiceLabel : __('empty'),
                    !selectedChoice && required ? requiredAtr : ''
                )}
            </div>
        </div>
    </DropArea>
</div>
