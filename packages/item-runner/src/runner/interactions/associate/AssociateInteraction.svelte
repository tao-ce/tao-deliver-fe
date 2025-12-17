<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;
    import { tick, getContext } from 'svelte';
    // Components
    import Prompt from '../Prompt.svelte';
    import { DraggableList, DraggableListItem, DropArea, DraggableListButton } from '@oat-sa-private/ui-components';
    import ChoiceFeedbackBlock from '../feedback/ChoiceFeedbackBlock.svelte';
    import { Icon } from '@oat-sa-private/ui-elements';
    import ChoiceContent from './ChoiceContent.svelte';
    import ChoiceContentDescription from './ChoiceContentDescription.svelte';
    import AtomicAriaLive from '../AtomicAriaLive.svelte';
    // Store
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    // Utils
    import { cloneDeep } from 'lodash';
    import { __, getActualKey, generateElementId } from '@oat-sa-private/ui-core';
    import { dispatchInteractiontraceEvent } from '../util/analytics.js';
    import { eventTypeToDomEventTypeMap } from './util.js';
    import shuffleChoiceOptions from '../util/shuffleChoices.js';

    const qtiClass = 'qti-associateInteraction';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let classes = '';
    export let dir;

    // data attributes
    export let dataAttrs = {};

    // interaction-level QTI attributes:
    export let prompt;
    export let choices = [];
    export let minAssociations = 0;
    export let maxAssociations = 1;
    export let shuffle = false;

    // Response format:
    export let cardinality = maxAssociations === 1 ? 'single' : 'multiple';
    const baseType = 'pair';
    const pairsListLabelId = generateElementId('pairsListLabel');

    let pairs = [];
    let placeholders = [];
    const eachPairIndexes = [0, 1];
    /**
     * selected  choice details
     * @type {{key: string, areaKey: string}|null}
     */
    let selectedChoice;

    // area elements
    let choiceArea;
    let answerArea;
    let interactionElement;
    let isAnswerAreaTabbable = true;

    // aria live
    let ariaLiveAnnouncement;
    const ariaLiveContainerId = generateElementId('live');
    const choiceContentIdPrefix = generateElementId('choice');
    const answerContentIdPrefix = generateElementId('answer');
    const ariaLiveStrings = Object.freeze({
        placed: __('%lb has been placed down.'),
        replaced: __('%lb has been placed down and replaced %lb'),
        removed: __('%lb has been returned to unassociated options.'),
        removedPair: __('%lb and %lb have been returned to unassociated options.'),
        cancelled: __('cancelled')
    });

    // ariaDescribedBy container id for unselected options
    const ariaDescribedByIdForChoice = generateElementId('ariaDescribedBy');
    const ariaDescribedByIdForAnswer = generateElementId('ariaDescribedBy');
    const ariaDescribedByIdForReplace = generateElementId('ariaDescribedBy');
    const ariaDescribedByIdForPlacedown = generateElementId('ariaDescribedBy');

    let itemHeight;
    let choiceAreaDroppable;
    let choiceTabbable;
    let dragging;

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

    const itemContext = getContext(itemIdentifier);
    const instructionsLang = itemContext && itemContext.getInstructionsLang();

    $: disabled = $itemSessionStatusStore === itemSessionStatus.closed;

    let isInteractionFocused = false; // becomes true when interaction is focused for the first time

    // store
    $: $interactionStateStore && loadResponse();

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        interactionStateStore.merge({ qtiClass });
        storeResponse();
    }

    $: if (pairs) {
        if (maxAssociations) {
            placeholders = Array(maxAssociations).fill(null);
        } else {
            placeholders = Array(Math.max(minAssociations || 1, pairs.length)).fill(null);
            //check if we need to add extra pair of placeholders
            if (
                placeholders.length === pairs.length &&
                pairs.every(pair => pair[0] && pair[1]) &&
                !choiceOptions.every(choice => choice.removed)
            ) {
                placeholders.push(null);
            }
        }
        placeholders = placeholders;
    }
    $: firstTabbablePairItem = pairs && findFirstTabbablePairItem(selectedChoice);

    /**
     * Update choices for DraggableList after answers have changed
     */
    function updateChoices() {
        if (choiceOptions && choiceOptions.length) {
            //initialize if this is called the first time
            if (!Object.prototype.hasOwnProperty.call(choiceOptions[0], 'removed')) {
                choiceOptions.forEach(choice => {
                    choice.removed = false;
                    choice.remainingMatches = choice.matchMax || Infinity;
                });
            }

            //update
            const restored = [];
            choiceOptions.forEach(choice => {
                choice.remainingMatches = (choice.matchMax || Infinity) - getChoiceUsageCount(choice.identifier);
                const removed = choice.remainingMatches <= 0;
                if (choice.removed && !removed) {
                    restored.push(choice);
                }
                choice.removed = removed;
            });
            const present = choiceOptions.filter(choice => !choice.removed && !restored.includes(choice));
            const removed = choiceOptions.filter(choice => choice.removed);
            choiceOptions = present.concat(restored).concat(removed);
        }
    }

    // common draggable group key of whole interaction
    const draggableGroupKey = generateElementId('associateInteraction');

    /**
     * Count of items in answer area
     * @returns {number}
     */
    function getAnswerAreaItemsCount() {
        return pairs.reduce((total, pair) => total + (pair[0] && pair[1] ? 2 : 1), 0);
    }

    /**
     * calculates first row height
     * @returns {Number} height
     */
    function getItemHeight() {
        let height = 1; //to avoid infinite loop;
        const firstLi = document.querySelector('.pairs > li');
        if (firstLi) {
            height = firstLi.getBoundingClientRect().height;
        }
        return height;
    }

    /**
     * Count choice usage in pairs
     * @param {string} choiceId
     * @returns {number}
     */
    function getChoiceUsageCount(choiceId) {
        return pairs.reduce((total, pair) => total + (pair[0] === choiceId) + (pair[1] === choiceId), 0);
    }

    /**
     * Count choice usage in *completed* pairs (for validity)
     * @param {string} choiceId
     * @returns {number}
     */
    function getChoiceUsageCountInCompletedPairs(choiceId) {
        return pairs
            .filter(pair => pair[0] && pair[1])
            .reduce((total, pair) => total + (pair[0] === choiceId) + (pair[1] === choiceId), 0);
    }

    /**
     * @param {string} choiceId
     * @returns {object?} choice details, or null if choice not found
     */
    function getChoiceById(choiceId) {
        if (!choiceId) {
            return null;
        }
        return choiceOptions.find(choice => choice.identifier === choiceId);
    }

    /**
     * Function to be used for filtering present choices
     * @param {Object} choice
     * @returns {Boolean}
     */
    function presentItemFilter(choice) {
        return !choice.removed;
    }

    /**
     * Validate pairs
     * @returns {boolean} - validity
     */
    function getPairsValidity() {
        let validity = true;

        const associations = pairs.filter(pair => pair[0] && pair[1]);

        // validate association count
        if (
            (minAssociations > 0 && associations.length < minAssociations) ||
            (maxAssociations > 0 && associations.length > maxAssociations)
        ) {
            validity = false;
        }

        // validate matchMin and matchMax properties of choices
        if (validity) {
            choiceOptions.some(choice => {
                const choiceUsageCount = getChoiceUsageCountInCompletedPairs(choice.identifier);
                if (
                    (choice.matchMin !== 0 && choiceUsageCount < choice.matchMin) ||
                    (choice.matchMax !== 0 && choiceUsageCount > choice.matchMax)
                ) {
                    validity = false;
                }
                return !validity;
            });
        }

        // validate matchGroup
        if (validity) {
            associations.some(pair => {
                const firstChoice = getChoiceById(pair[0]);
                const secondChoice = getChoiceById(pair[1]);
                if (
                    (firstChoice.matchGroup && !firstChoice.matchGroup.includes(pair[1])) ||
                    (secondChoice.matchGroup && !secondChoice.matchGroup.includes(pair[0]))
                ) {
                    validity = false;
                }
                return !validity;
            });
        }

        return validity;
    }

    /**
     * Format and store value in interactionStateStore
     */
    function storeResponse() {
        const choiceKeys = choiceOptions.map(choice => choice.identifier);
        interactionStateStore.merge({ pairs, choiceKeys });
        let responseValue = null;
        if (cardinality === 'single') {
            if (pairs && pairs[0] && pairs[0][0] && pairs[0][1]) {
                responseValue = pairs[0];
            }
        } else {
            //store only pairs that have both identifiers set
            responseValue = pairs.filter(pair => pair.length === 2 && pair[0] && pair[1]);
        }
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: responseValue
            },
            getPairsValidity()
        );
    }

    /**
     * Load store response and set it to pairs
     */
    function loadResponse() {
        let state = interactionStateStore.get();
        let newResponse = interactionStateStore.getResponseValue();

        //set pairs from state, if empty - from response
        if (state.pairs) {
            pairs = state.pairs;
        } else {
            if (cardinality === 'single' && newResponse) {
                newResponse = [newResponse];
            }

            pairs = newResponse || [];
        }

        if (state.choiceKeys) {
            choiceOptions = state.choiceKeys.map(choiceKey =>
                choiceOptions.find(choice => choice.identifier === choiceKey)
            );
        }
        updateChoices();
    }

    /**
     * Remove empty pairs
     * @param {number} i - index of pair for which new index we want to know
     * @returns {number} new index if 'i' was specified
     */
    function removeEmptyPairs(i) {
        let iNew;
        if (i > 0 || i === 0) {
            let skip = 0;
            for (let k = 0; k < i; k++) {
                if (!pairs[k] || !(pairs[k][0] || pairs[k][1])) {
                    ++skip;
                }
            }
            iNew = i - skip;
        }
        pairs = pairs.filter(pair => pair[0] || pair[1]);
        return iNew;
    }

    /**
     * Returns with the first empty placeholder index and position
     * @returns {[number, number]} first empty answer index and position
     */
    function getFirstEmptyPairItem() {
        const firstEmptyPair = pairs.findIndex(pair => !pair[0] || !pair[1]);
        if (firstEmptyPair === -1) {
            if (placeholders.length > pairs.length) {
                return [pairs.length, 0];
            } else {
                return [-1, 0];
            }
        } else {
            return [firstEmptyPair, pairs[firstEmptyPair][0] ? 1 : 0];
        }
    }

    /**
     * Calculate number of matched pairs
     * @param {array} pairsArray - contains pairs (matched or unmatched) of associations
     * @returns {number} pairs number
     */
    function getPairsNumber(pairsArray) {
        return pairsArray.reduce((total, pair) => total + (!!pair[0] && !!pair[1]), 0);
    }

    /**
     * Returns with the first answered item index and position
     * @returns {[number, number]} first answered item index and position
     */
    function getFirstAnswer() {
        const firstEmptyPair = pairs.findIndex(pair => pair[0] || pair[1]);
        if (firstEmptyPair === -1) {
            return [-1, 0];
        } else {
            return [firstEmptyPair, pairs[firstEmptyPair][0] ? 0 : 1];
        }
    }

    /**
     * Remove an item from a pair
     * @param {integer} i pair number
     * @param {integer} n element number in pair
     */
    function removePairItem(i, n) {
        liveAnnounce(ariaLiveStrings.removed, getChoiceContentId(pairs[i][n]));
        delete pairs[i][n];
        pairs = pairs; // to trigger pairs modification
    }

    /**
     * Remove an item from a pair and replace it with a choice that doesn't belong to pairs yet
     * @param {integer} i pair number
     * @param {integer} n element number in pair
     * @param {string} key id of choice that will act as a replacement
     */
    function swapPairItemWithChoice(i, n, key) {
        liveAnnounce(ariaLiveStrings.replaced, getAnswerContentId(key), getChoiceContentId(pairs[i][n]));
        pairs[i][n] = key;
    }

    /**
     * Add pair element, or move it to another position, or replace it with another pair element
     * @param {integer} i pair number
     * @param {integer} n element number in pair
     * @param {string} key id of the item
     * @param {integer} iPrev original position of item (pair number)
     * @param {integer} nPrev original position of item (element number in pair)
     */
    function addOrMovePairItem(i, n, key, iPrev, nPrev) {
        const replacedKey = pairs[i] && pairs[i][n];
        if (replacedKey) {
            if (iPrev !== -1) {
                liveAnnounce(ariaLiveStrings.replaced, getAnswerContentId(key), getAnswerContentId(replacedKey));
            } else {
                liveAnnounce(ariaLiveStrings.replaced, getAnswerContentId(key), getChoiceContentId(replacedKey));
            }
        } else {
            liveAnnounce(__('%lb has been placed down.'), getAnswerContentId(key));
        }

        if (typeof pairs[i] === 'undefined') {
            pairs[i] = [];
        }
        pairs[i][n] = key;

        if (iPrev !== -1) {
            if (replacedKey) {
                pairs[iPrev][nPrev] = replacedKey;
            } else {
                delete pairs[iPrev][nPrev];
            }
        }
    }

    /**
     * Remove a pair
     * @param {Number} i - pair number
     * @returns {string} - first key of removed pair
     */
    function removePair(i) {
        const firstRemovedKey = pairs[i][0];

        liveAnnounce(ariaLiveStrings.removedPair, getChoiceContentId(firstRemovedKey), getChoiceContentId(pairs[i][1]));
        pairs.splice(i, 1);
        pairs = pairs; // to trigger pairs modification
        updateChoices();
        storeResponse();

        return firstRemovedKey;
    }

    /**
     * Set selected choice
     * @param {String} key choice key
     * @param {String} areaKey original dropArea key
     */
    function setSelectedChoice(key, areaKey) {
        selectedChoice = { key, areaKey };
    }

    /**
     * Unset selected choice
     */
    function clearSelectedChoice() {
        selectedChoice = null;
    }

    /**
     * Cancel selected choice: unset & announce cancellation
     */
    function cancelSelection() {
        clearSelectedChoice();
        liveAnnounce(ariaLiveStrings.cancelled);
    }

    /**
     * Get position of pair element by parsing DropArea key
     * @param {String} dropAreaKey
     * @returns {[number, number]} pair position and index
     */
    function getPairItemByDropArea(dropAreaKey) {
        if (dropAreaKey.startsWith('pair_')) {
            const [, i, n] = dropAreaKey.split('_');
            return [parseInt(i), parseInt(n)];
        }
        return [-1, 0];
    }

    /**
     * Get key of choice by parsing choice individual DropArea key
     * @param {String} dropAreaKey
     * @returns {String} choice key
     */
    function getChoiceKeyByDropArea(dropAreaKey) {
        if (dropAreaKey.startsWith('choice_')) {
            return dropAreaKey.substring('choice_'.length);
        }
        return null;
    }

    /**
     * Handle answer drag start
     * @param {CustomEvent} event
     */
    function handleAnswerDragStart(event) {
        const { draggableKey, dropAreaKey } = event.detail;
        setSelectedChoice(draggableKey, dropAreaKey);
        dragging = true;
        dispatchInteractiontraceEvent({
            interactionElement,
            event,
            eventTypeToDomEventTypeMap,
            metadata: {
                qtiChoiceIdentifier: draggableKey,
                area: dropAreaKey
            }
        });
    }

    /**
     * Handle answer drag stop
     * @param {CustomEvent} event
     */
    function handleAnswerDragStop(event) {
        dispatchInteractiontraceEvent({
            interactionElement,
            event,
            eventTypeToDomEventTypeMap,
            metadata: {
                qtiChoiceIdentifier: selectedChoice.key,
                area: selectedChoice.areaKey
            }
        });
        clearSelectedChoice();
        dragging = false;
    }

    /**
     * Handle answer drop event
     * @param {CustomEvent} event
     */
    function handleAnswerDrop(event) {
        const { draggableKey, dropAreaKey, initialDropAreaKey } = event.detail;
        if (draggableKey !== null) {
            const [i, n] = getPairItemByDropArea(dropAreaKey);
            if (!pairs[i] || !pairs[i][n] || pairs[i][n] !== draggableKey) {
                const [iPrev, nPrev] = getPairItemByDropArea(initialDropAreaKey);

                const previousResponse = interactionStateStore.snapshotResponse();
                addOrMovePairItem(i, n, draggableKey, iPrev, nPrev);
                removeEmptyPairs();
                updateChoices();
                storeResponse();
                const newResponse = interactionStateStore.getResponseIfChanged(previousResponse);
                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        qtiChoiceIdentifier: draggableKey,
                        areaFrom: initialDropAreaKey,
                        areaTo: dropAreaKey,
                        state: cloneDeep(pairs),
                        ...(newResponse && { newResponse })
                    }
                });
            }
        }
    }

    /**
     * Handle choice area drag start
     * @param {CustomEvent} event
     */
    function handleChoiceDragStart(event) {
        const { draggableKey, dropAreaKey } = event.detail;
        setSelectedChoice(draggableKey, dropAreaKey);
        dragging = true;
        dispatchInteractiontraceEvent({
            interactionElement,
            event,
            eventTypeToDomEventTypeMap,
            metadata: {
                qtiChoiceIdentifier: draggableKey,
                area: dropAreaKey
            }
        });
    }

    /**
     * Handle choice area drag stop
     * @param {CustomEvent} event
     */
    function handleChoiceDragStop(event) {
        dispatchInteractiontraceEvent({
            interactionElement,
            event,
            eventTypeToDomEventTypeMap,
            metadata: {
                qtiChoiceIdentifier: selectedChoice.key,
                area: selectedChoice.areaKey
            }
        });
        clearSelectedChoice();
        dragging = false;
    }

    /**
     * Handle choice area drop event
     * @param {CustomEvent} event
     */
    function handleChoiceAreaDrop(event) {
        const { initialDropAreaKey, draggableKey, dropAreaKey } = event.detail;
        const [i, n] = getPairItemByDropArea(initialDropAreaKey);

        const previousResponse = interactionStateStore.snapshotResponse();
        if (i !== -1) {
            removePairItem(i, n);
        }
        removeEmptyPairs();
        updateChoices();
        storeResponse();

        choiceAreaDroppable = false;
        const newResponse = interactionStateStore.getResponseIfChanged(previousResponse);
        dispatchInteractiontraceEvent({
            interactionElement,
            event,
            eventTypeToDomEventTypeMap,
            metadata: {
                qtiChoiceIdentifier: draggableKey,
                areaFrom: initialDropAreaKey,
                areaTo: dropAreaKey,
                state: cloneDeep(pairs),
                ...(newResponse && { newResponse })
            }
        });
    }

    /**
     * Handle individual choice drop event
     * @param {CustomEvent} event
     */
    function handleChoiceIndividualDrop(event) {
        const { dropAreaKey, initialDropAreaKey, draggableKey } = event.detail;
        if (initialDropAreaKey.startsWith('pair_')) {
            const choiceKey = getChoiceKeyByDropArea(dropAreaKey);
            const [i, n] = getPairItemByDropArea(initialDropAreaKey);
            if (pairs[i] && pairs[i][n] && pairs[i][n] === choiceKey) {
                handleChoiceAreaDrop(event);
            } else {
                const previousResponse = interactionStateStore.snapshotResponse();
                swapPairItemWithChoice(i, n, choiceKey);
                removeEmptyPairs();
                updateChoices();
                storeResponse();
                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        qtiChoiceIdentifier: draggableKey,
                        areaFrom: initialDropAreaKey,
                        areaTo: dropAreaKey,
                        newResponse: interactionStateStore.getResponseIfChanged(previousResponse),
                        state: cloneDeep(pairs)
                    }
                });
            }
        }
        choiceAreaDroppable = false;
    }

    /**
     * Handle choice area drag over event
     */
    function handleChoiceAreaDragOver() {
        choiceAreaDroppable = selectedChoice && selectedChoice.areaKey.startsWith('pair_');
    }

    /**
     * Handle choice area drag out event
     */
    function handleChoiceAreaDragOut() {
        choiceAreaDroppable = false;
    }

    /**
     * Handle individual choice drag over event
     * @param {CustomEvent} e
     */
    function handleChoiceIndividualDragOver(e) {
        const { dropAreaKey } = e.detail;
        const choiceKey = getChoiceKeyByDropArea(dropAreaKey);
        choiceAreaDroppable =
            selectedChoice && selectedChoice.areaKey.startsWith('pair_') && selectedChoice.key === choiceKey;
    }

    /**
     * Handle individual choice drag out event
     */
    function handleChoiceIndividualDragOut() {
        choiceAreaDroppable = false;
    }

    /**
     * Gives focus to choice area
     * @param {string?} key - focus at specific key
     */
    function focusChoiceArea(key) {
        if (choiceArea) {
            const index = key ? choiceOptions.findIndex(choice => choice.identifier === key) : null;
            focusChoiceAtIndex(index);
        }
    }

    /**
     * Focus some item in choice list
     * @param {Number} index of item's element among other list elements
     */
    function focusChoiceAtIndex(index) {
        const elements = Array.from(choiceArea.querySelectorAll('.draggable-list .item-btn'));
        if (elements.length > 0) {
            const safeIndex = index > 0 && index < elements.length ? index : 0;
            elements[safeIndex].focus();
        }
    }

    /**
     * Gives focus to answer area
     */
    function focusAnswerArea() {
        if (answerArea) {
            const [i, n] = firstTabbablePairItem;
            if (i !== -1) {
                focusPairItemOrPlaceholder(i, n);
            }
        }
    }

    /**
     * Find pair item which should serve as a tabstop in answer area
     * @returns {[number, number]} first tabbable answer index and position
     */
    function findFirstTabbablePairItem() {
        let i;
        let n;
        if (selectedChoice) {
            // can focus first unanswered element
            [i, n] = getFirstEmptyPairItem();
            if (i === -1) {
                i = 0;
            }
        } else {
            // can focus first answered element
            [i, n] = getFirstAnswer();
        }
        return [i, n];
    }

    /**
     * Handle choice click
     * set selected choice
     * @param {CustomEvent} event
     */
    function handleChoiceClick(event) {
        const { draggableKey } = event.detail;
        if (selectedChoice && selectedChoice.areaKey !== 'choices') {
            if (selectedChoice.key !== draggableKey) {
                const [i, n] = getPairItemByDropArea(selectedChoice.areaKey);

                const previousResponse = interactionStateStore.snapshotResponse();
                swapPairItemWithChoice(i, n, draggableKey);
                removeEmptyPairs();
                clearSelectedChoice();
                updateChoices();
                storeResponse();

                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        qtiChoiceIdentifier: draggableKey,
                        area: 'choices',
                        newResponse: interactionStateStore.getResponseIfChanged(previousResponse),
                        state: cloneDeep(pairs)
                    }
                });
            } else {
                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        qtiChoiceIdentifier: selectedChoice.key,
                        area: selectedChoice.areaKey
                    }
                });
                cancelSelection();
            }
        } else {
            setSelectedChoice(draggableKey, 'choices');

            tick().then(() => {
                focusAnswerArea();
            });

            dispatchInteractiontraceEvent({
                interactionElement,
                event,
                eventTypeToDomEventTypeMap,
                metadata: {
                    qtiChoiceIdentifier: selectedChoice.key,
                    area: selectedChoice.areaKey,
                    position: event.detail.position
                }
            });
        }
    }

    /**
     * Handle choice keyselect
     * set selected choice
     * @param {CustomEvent} event
     */
    function handleChoiceKeySelect(event) {
        const { draggableKey } = event.detail;
        setSelectedChoice(draggableKey, 'choices');

        dispatchInteractiontraceEvent({
            interactionElement,
            event,
            eventTypeToDomEventTypeMap,
            metadata: {
                qtiChoiceIdentifier: selectedChoice.key,
                area: selectedChoice.areaKey,
                pressedKey: event.detail.key
            }
        });

        tick().then(() => {
            focusAnswerArea();
        });
    }

    /**
     * Handle answer click
     * @param {Event} event
     * @param {number} i
     * @param {number} n
     */
    function handleAnswerClick(event, i, n) {
        let pressedKey;
        if (event.type === 'keyup') {
            pressedKey = event.key;
        }
        if (selectedChoice) {
            const key = selectedChoice.key;
            if (selectedChoice.areaKey === `pair_${i}_${n}`) {
                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        qtiChoiceIdentifier: selectedChoice.key,
                        area: selectedChoice.areaKey,
                        pressedKey
                    }
                });
                clearSelectedChoice();
                liveAnnounce(ariaLiveStrings.placed, getAnswerContentId(key));
            } else if (!pairs[i] || !pairs[i][n] || pairs[i][n] !== key) {
                const [iPrev, nPrev] = getPairItemByDropArea(selectedChoice.areaKey);
                const previousResponse = interactionStateStore.snapshotResponse();
                addOrMovePairItem(i, n, key, iPrev, nPrev);
                // Update pairs first, before assigning qtiChoiceIndentifier to have the selected choice value that triggers the action.
                const qtiChoiceIdentifier = pairs[i] ? pairs[i][n] : null;
                const iPlacedTo = removeEmptyPairs(i);
                clearSelectedChoice();
                updateChoices();
                storeResponse();
                let position;
                if ('clientX' in event) {
                    position = {
                        clientX: event.clientX,
                        clientY: event.clientY,
                        screenX: event.screenX,
                        screenY: event.screenY
                    };
                }
                const newResponse = interactionStateStore.getResponseIfChanged(previousResponse);
                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        qtiChoiceIdentifier,
                        area: `pair_${i}_${n}`,
                        state: cloneDeep(pairs),
                        ...(newResponse && { newResponse }),
                        ...(event.type === 'keyup' && { pressedKey }),
                        ...(position && { position })
                    }
                });

                tick().then(() => {
                    // focus placed item
                    focusPairItemOrPlaceholder(iPlacedTo, n);
                });
            } else {
                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        qtiChoiceIdentifier: selectedChoice.key,
                        area: selectedChoice.areaKey,
                        pressedKey
                    }
                });
                cancelSelection();
            }
        } else {
            if (pairs[i] && pairs[i][n]) {
                setSelectedChoice(pairs[i][n], `pair_${i}_${n}`);
                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        qtiChoiceIdentifier: selectedChoice.key,
                        area: selectedChoice.areaKey
                    }
                });
            }
        }
    }

    /**
     * Handles remove pair-item button click
     * @param {CustomEvent} event
     * @param {number} i pair index
     * @param {number} n pair item position
     */
    async function handleRemovePairItem(event, i, n) {
        const removedKey = pairs[i][n];
        const previousResponse = interactionStateStore.snapshotResponse();
        removePairItem(i, n);
        removeEmptyPairs();
        updateChoices();
        storeResponse();
        const newResponse = interactionStateStore.getResponseIfChanged(previousResponse);
        const position = event.detail.position;
        const pressedKey = event.detail.key;

        dispatchInteractiontraceEvent({
            interactionElement,
            event,
            eventTypeToDomEventTypeMap,
            metadata: {
                qtiChoiceIdentifier: event.detail.draggableKey,
                area: `pair_${i}_${n}`,
                state: cloneDeep(pairs),
                ...(newResponse && { newResponse }),
                ...(position && { position }),
                ...(pressedKey && { pressedKey })
            }
        });

        // focus choice area in case of keyboard navigation
        if (pressedKey != null) {
            await tick();
            focusChoiceArea(removedKey);
        }
    }

    /**
     * Handle remove pair button keyup
     * @param {KeyboardEvent} event
     * @param {number} i pair index
     */
    function handleRemovePairKeyDown(event, i) {
        const pressedKey = getActualKey(event);
        switch (pressedKey) {
            case 'enter':
            case 'space': {
                const previousResponse = interactionStateStore.snapshotResponse();
                const removedKey = removePair(i);
                tick().then(() => focusChoiceArea(removedKey));

                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        area: `pair_${i}`,
                        newResponse: interactionStateStore.getResponseIfChanged(previousResponse),
                        state: cloneDeep(pairs),
                        pressedKey: event.key
                    }
                });
                break;
            }
        }
    }

    /**
     * Handle remove pair button click
     * @param {MouseEvent} event
     * @param {number} i pair index
     * @returns {Boolean|void}
     */
    function handleRemovePairClick(event, i) {
        // e.detail will be > 0 if it was triggered by a real click or touch
        // if we have 0, it was triggered by Enter or Space
        if (event.detail === 0) {
            return false;
        }
        const previousResponse = interactionStateStore.snapshotResponse();
        removePair(i);
        dispatchInteractiontraceEvent({
            interactionElement,
            event,
            eventTypeToDomEventTypeMap,
            metadata: {
                area: `pair_${i}`,
                newResponse: interactionStateStore.getResponseIfChanged(previousResponse),
                state: cloneDeep(pairs),
                position: {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    screenX: event.screenX,
                    screenY: event.screenY
                }
            }
        });
    }

    /**
     * Focus an answer item, if it is placed or focus its placeholder
     * @param {number} i pair index
     * @param {number} n pair position
     */
    function focusPairItemOrPlaceholder(i, n) {
        const pairElementDropArea = answerArea.querySelector(`[data-drag-drop-key=pair_${i}_${n}]`);
        if (!pairElementDropArea) {
            return;
        }

        const pairItem = pairElementDropArea.querySelector('.item-btn');
        if (pairItem) {
            pairItem.focus();
        } else {
            pairElementDropArea.querySelector('.pair-element-empty').focus();
        }
    }

    /**
     * Handle answer key done and call click if it is necessary
     * @param {KeyboardEvent} e
     * @param {number} i
     * @param {number} n
     */
    function handleAnswerKeyUp(e, i, n) {
        const pressedKey = getActualKey(e);
        switch (pressedKey) {
            case 'enter':
            case 'space': {
                e.stopPropagation();
                handleAnswerClick(e, i, n);
                break;
            }
        }
    }

    /**
     * Returns whether empty pair element is focused
     * @returns {boolean}
     */
    function isEmptyDropzoneFocused() {
        return (
            answerArea.contains(document.activeElement) &&
            document.activeElement.classList.contains('pair-element-empty')
        );
    }

    /**
     * Returns pair focusable elements in order
     * @param {number} i pair index
     * @returns {HTMLElement[]}
     */
    function getPairFocusableElements(i) {
        if (i > placeholders.length) {
            return [];
        }

        const focusOrder = [];
        const pairContainer = answerArea.querySelector(`[data-drag-drop-key=pair_${i}_0]`).closest('.pair');

        for (let j = 0; j < 2; j++) {
            const pairElement = pairContainer.querySelector(`[data-drag-drop-key=pair_${i}_${j}]`);
            if (pairs[i] && pairs[i][j]) {
                focusOrder.push(pairElement.querySelector('.item-btn'));
                const pairElementRemove = !selectedChoice && pairElement.querySelector('.remover');
                if (pairElementRemove) {
                    focusOrder.push(pairElementRemove);
                }
            } else if (selectedChoice) {
                focusOrder.push(pairElement.querySelector('.pair-element-empty'));
            }
        }

        if (!selectedChoice && pairs[i] && pairs[i][0] && pairs[i][1]) {
            focusOrder.push(pairContainer.querySelector('.remove-pair'));
        }

        return focusOrder;
    }

    /**
     * Focuses next element inside pair
     * @param {HTMLElement[]} focusableElements focusable elements inside pair
     * @param {Number} activeElementFocusIndex currently focused element index
     * @param {KeyboardEvent} event event
     */
    function focusNextInPair(focusableElements, activeElementFocusIndex, event) {
        if (activeElementFocusIndex < focusableElements.length - 1) {
            focusableElements[activeElementFocusIndex + 1].focus();
            event.stopPropagation();
            event.preventDefault();
        }
    }

    /**
     * Focuses previous element inside pair
     * @param {HTMLElement[]} focusableElements focusable elements inside pair
     * @param {Number} activeElementFocusIndex currently focused element index
     * @param {KeyboardEvent} event event
     */
    function focusPreviousInPair(focusableElements, activeElementFocusIndex, event) {
        if (activeElementFocusIndex !== 0) {
            focusableElements[activeElementFocusIndex - 1].focus();
            event.stopPropagation();
            event.preventDefault();
        }
    }
    /**
     * Handle pair key event
     * @param {CustomEvent} e
     * @param {number} i pair index
     */
    function handlePairKeyDown(e, i) {
        const pressedKey = getActualKey(e);

        const focusableElements = getPairFocusableElements(i);
        const activeElementFocusIndex = focusableElements.findIndex(function (element) {
            return element.contains(document.activeElement);
        });
        const isRTL = window.getComputedStyle(e.target).getPropertyValue('direction') === 'rtl';

        if (activeElementFocusIndex === -1) {
            return;
        }

        switch (pressedKey) {
            case 'down':
                focusNextInPair(focusableElements, activeElementFocusIndex, e);
                break;
            case 'right':
                if (isRTL) {
                    focusPreviousInPair(focusableElements, activeElementFocusIndex, e);
                } else {
                    focusNextInPair(focusableElements, activeElementFocusIndex, e);
                }
                break;
            case 'up':
                focusPreviousInPair(focusableElements, activeElementFocusIndex, e);
                break;
            case 'left':
                if (isRTL) {
                    focusNextInPair(focusableElements, activeElementFocusIndex, e);
                } else {
                    focusPreviousInPair(focusableElements, activeElementFocusIndex, e);
                }
                break;
        }
    }

    /**
     * Focuses previous element inside pairs
     * @param {Number} index current pair index
     * @param {KeyboardEvent} event event
     */
    function focusPreviousInPairs(index, event) {
        const focusablePairsLength = selectedChoice ? placeholders.length : pairs.length;
        const nextPairIndex = index === 0 ? focusablePairsLength - 1 : index - 1;
        const focusableElements = getPairFocusableElements(nextPairIndex);
        focusableElements[focusableElements.length - 1].focus();
        event.stopPropagation();
        event.preventDefault();
    }

    /**
     * Focuses next pairs / placeholder
     * @param {Number} index current pair index
     * @param {KeyboardEvent} event event
     */
    function focusNextInPairs(index, event) {
        const focusablePairsLength = selectedChoice ? placeholders.length : pairs.length;
        const nextPairIndex = index < focusablePairsLength - 1 ? index + 1 : 0;
        const focusableElements = getPairFocusableElements(nextPairIndex);
        focusableElements[0].focus();
        event.stopPropagation();
        event.preventDefault();
    }

    /**
     * Handle pairs key event
     * @param {CustomEvent} e
     */
    function handlePairsKeyDown(e) {
        const pressedKey = getActualKey(e);
        const activePairElement = [...e.currentTarget.querySelectorAll('.pair')].find(function (pair) {
            return pair.contains(document.activeElement);
        });
        const isRTL = window.getComputedStyle(e.target).getPropertyValue('direction') === 'rtl';

        if (!activePairElement) {
            return;
        }
        // get the active pair element's index
        const dropAreaKey = activePairElement
            .querySelector('.pair-element-wrapper > div')
            .getAttribute('data-drag-drop-key');
        const [i] = getPairItemByDropArea(dropAreaKey);

        switch (pressedKey) {
            case 'left':
                if (isRTL) {
                    focusNextInPairs(i, e);
                } else {
                    focusPreviousInPairs(i, e);
                }
                break;
            case 'up':
                focusPreviousInPairs(i, e);
                break;
            case 'right':
                if (isRTL) {
                    focusPreviousInPairs(i, e);
                } else {
                    focusNextInPairs(i, e);
                }
                break;
            case 'down':
                focusNextInPairs(i, e);
                break;
            case 'tab': {
                if (selectedChoice) {
                    cancelSelection();
                }
                break;
            }
        }
    }

    /**
     * Prevent page scroll on when capturing space key event
     * @param {KeyboardEvent} event
     * @returns {?Boolean} - to prevent browser default
     */
    function handleAnswerKeyDown(event) {
        const pressedKey = getActualKey(event);
        switch (pressedKey) {
            case 'space': {
                event.preventDefault();
                return false;
            }
        }
    }

    /**
     * Handle answer area focusin event
     */
    function handleAnswerAreaFocusIn() {
        isAnswerAreaTabbable = false;
    }

    /**
     * Handle focusout on container: backup plan to restore tabbable in case window:focusin didn't fire (if someone used e.stopPropagation)
     */
    function handleAnswerAreaFocusOut() {
        //TODO
        setTimeout(() => {
            if (
                !isAnswerAreaTabbable &&
                answerArea &&
                answerArea !== document.activeElement &&
                !answerArea.contains(document.activeElement)
            ) {
                isAnswerAreaTabbable = true;
            }
        }, 200);
    }

    /**
     * Handle focusin on window: backup plan to restore tabbable in case container:focusout didn't fire (Firefox & Safari do not fire it when focused element is removed)
     * @param {Event} e
     */
    function handleWindowFocusin(e) {
        if (!isAnswerAreaTabbable && answerArea && answerArea !== e.target && !answerArea.contains(e.target)) {
            isAnswerAreaTabbable = true;
        }
    }

    /**
     * Cancel selection when escape is pressed
     * @param {KeyboardEvent} event
     */
    function handleWindowKeyDown(event) {
        if (selectedChoice) {
            const pressedKey = getActualKey(event);
            if (pressedKey === 'esc') {
                //if focus was on empty dropzone, focus something else, because empty dropzone won't be focusable anymore
                const keepFocus = isEmptyDropzoneFocused();

                cancelSelection();

                if (keepFocus) {
                    tick().then(() => {
                        focusChoiceArea();
                    });
                }
                dispatchInteractiontraceEvent({
                    interactionElement,
                    event,
                    eventTypeToDomEventTypeMap,
                    metadata: {
                        pressedKey: event.key
                    }
                });
            }
        }
    }

    /**
     * Returns with choice info
     * @param {string} choiceKey
     * @returns {string} choice info
     */
    function getChoiceHiddenInfo(choiceKey) {
        const index = choiceOptions
            .filter(choice => choice.matchMax === 0 || choice.matchMax > getChoiceUsageCount(choice.identifier))
            .findIndex(choice => choice.identifier === choiceKey);
        return __('Option %d', index + 1);
    }

    /**
     * Get if pair element is selected
     * @param {number} i pair index
     * @param {number} n pair item position
     * @returns {boolean} is selected
     */
    function isSelectedChoice(i, n) {
        return selectedChoice && selectedChoice.areaKey === `pair_${i}_${n}`;
    }

    /**
     * Sets the announcement
     * @param {String} text - format string with '%lb' modifier in places where aria-labelledby should be inserted
     * @param {...*} [labelledByParams] - strings containing aria-labelledby id to use in place of %lb modifiers
     */
    function liveAnnounce(text, ...labelledByParams) {
        ariaLiveAnnouncement = {
            text,
            labelledByParams
        };
    }

    /**
     * Get id of choice content element
     * @param {String} key
     * @returns {String}
     */
    function getChoiceContentId(key) {
        return `${choiceContentIdPrefix}_${key}`;
    }

    /**
     * Get id of answer content element
     * @param {String} key
     * @returns {String}
     */
    function getAnswerContentId(key) {
        return `${answerContentIdPrefix}_${key}`;
    }

    /**
     * Flag that focus jump inside interaction
     */
    function handleInteractionFocusIn() {
        isInteractionFocused = true;
    }
</script>

<style>
    .wrapper {
        display: flex;
        align-items: flex-start;
        cursor: unset; /* reset [aria-controls] style */

        --lists-spacing: var(--space-4x);
        --pair-spacing: 3rem;
        --remove-button-width: 6rem;
        --remove-pair-button-width: 5.5rem;
        --remove-pair-button-spacing: var(--space-1x);
        --total-spacing: calc(
            var(--lists-spacing) + var(--pair-spacing) + 2 * var(--remove-button-width) +
                var(--remove-pair-button-width) + var(--remove-pair-button-spacing)
        );
        --pair-list-total-spacing: calc(var(--total-spacing) - var(--lists-spacing));
    }

    .choices {
        flex: 0 0 calc((100% - var(--total-spacing)) / 3);
        margin-block: 0;
        margin-inline: 0 var(--lists-spacing);
        align-self: stretch;
    }

    .pairs {
        flex: 0 0 calc((100% - var(--total-spacing)) * 2 / 3 + var(--pair-list-total-spacing));
        padding: 0;
        display: flex;
        flex-direction: column;
    }

    .remove-pair {
        align-self: stretch;
        background-color: var(--color-bg-default);
        width: var(--remove-pair-button-width);
        cursor: pointer;

        @add-mixin outline-focus -1rem;
        &:focus-visible::after {
            border-radius: var(--radius-large);
        }

        &:hover,
        &:focus {
            background-color: var(--color-bg-actionable-secondary-hover);
        }

        &.visually-disabled {
            background: none;
        }
        &:disabled {
            cursor: not-allowed;
            color: var(--color-text-disabled);
            border-color: var(--color-border-disabled);
            &:hover {
                background-color: var(--color-bg-default);
            }
        }
    }

    :global(body.draggable--is-dragging) .remove-pair {
        cursor: unset;
    }

    .remove-pair {
        border: none;
        margin-left: var(--remove-pair-button-spacing);
        color: inherit;
    }

    .pair {
        width: 100%;
        display: flex;
        align-items: flex-start;
        margin-bottom: 3rem;

        &.linked {
            & .pair-container {
                margin: 0;
            }
            & .pair-link::before {
                transform: translate(-50%, -50%) scale(3);
            }
        }

        & :global(.draggable-container > *) {
            /* over .pair-link when selected */
            z-index: 1;
        }
    }

    .pair-container {
        display: flex;
        width: calc(100% - var(--remove-pair-button-width));
        height: 100%;
        margin-block: 0;
        margin-inline: 0 calc(var(--remove-pair-button-width) + var(--remove-pair-button-spacing));

        & > .pair-element-wrapper {
            width: calc((100% - var(--pair-spacing)) / 2);
            height: 100%;
            & > :global(div) {
                height: 100%;
            }
        }
    }

    .pair-link {
        width: var(--pair-spacing);
        position: relative;

        &::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 1rem;
            height: 0.125rem;
            background-color: var(--color-brand);
        }
    }

    .pair-element-placeholder {
        display: flex;
        background-color: var(--color-bg-selection);
        border-radius: var(--radius-large);
        list-style: none;
        padding: 0;
        margin: 0;
        min-height: 6rem;
        height: 100%;
        width: 100%;
        position: relative;

        &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: var(--border-thin) solid var(--color-border-active);
            border-radius: var(--radius-large);
        }

        &.empty-targetable {
            cursor: pointer;
            &:hover::before,
            &:focus-visible::before {
                border: var(--border-medium-plus) dashed var(--color-border-active); /* missing on Android */
            }
        }
    }
    /* fix for Android, duplicating missing styles under dragover situations */
    :global(.drop-area.draggable-container--over) .pair-element-placeholder {
        cursor: unset;

        &.empty-targetable::before {
            border: var(--border-medium-plus) dashed var(--color-border-active);
        }
    }

    .pair-element-empty {
        height: 100%;
        width: 100%;
        border-radius: var(--radius-large);
        @add-mixin outline-focus -0.75rem;
        &:focus-visible::after {
            border-radius: var(--radius-large);
        }
    }
</style>

<svelte:window on:click={clearSelectedChoice} on:keydown={handleWindowKeyDown} on:focusin={handleWindowFocusin} />

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

    <ChoiceFeedbackBlock
        maxChoices={maxAssociations}
        minChoices={minAssociations}
        type="associations"
        {isInteractionFocused}
        {interactionElement}
        selectedNumber={getPairsNumber(pairs)}
        lang={instructionsLang} />

    <AtomicAriaLive id={ariaLiveContainerId} announcement={ariaLiveAnnouncement} lang={instructionsLang} />
    <div id={ariaDescribedByIdForChoice} class="hidden" lang={instructionsLang}>
        {__(
            'Press enter or space to grab and browse the answer area. To move to the next available option, use the arrow keys.'
        )}
    </div>
    <div id={ariaDescribedByIdForAnswer} class="hidden" lang={instructionsLang}>
        {__('Press enter or space to grab. To move to next available answer, use the arrow keys.')}
    </div>
    <div id={ariaDescribedByIdForReplace} class="hidden" lang={instructionsLang}>
        {__('Press enter or space to replace. To browse other drop zones use the arrow keys. Press escape to cancel.')}
    </div>
    <div id={ariaDescribedByIdForPlacedown} class="hidden" lang={instructionsLang}>
        {__(
            'Press enter or space to place down. To browse other drop zones use the arrow keys. Press escape to cancel.'
        )}
    </div>
    <div class="wrapper" aria-controls={ariaLiveContainerId}>
        <div class="choices" bind:this={choiceArea}>
            <DraggableList
                {draggableGroupKey}
                dropAreaKey="choices"
                {disabled}
                ariaLabel={__('unassociated options')}
                presentItemsCount={choiceOptions.filter(presentItemFilter).length}
                targetable={dragging && selectedChoice && selectedChoice.areaKey.startsWith('pair_')}
                targeted={choiceAreaDroppable}
                {instructionsLang}
                bind:itemHeight
                bind:tabbable={choiceTabbable}
                on:dragOver={handleChoiceAreaDragOver}
                on:dragOut={handleChoiceAreaDragOut}
                on:drop={handleChoiceAreaDrop}>
                {#each choiceOptions as choice, index (choice.identifier)}
                    <DraggableListItem
                        key={choice.identifier}
                        dropAreaKey={`choice_${choice.identifier}`}
                        {draggableGroupKey}
                        {instructionsLang}
                        {disabled}
                        dropArea={true}
                        tabbable={choiceTabbable && index === 0}
                        amount={pairs && choice.matchMax === 0
                            ? -1
                            : choice.matchMax - getChoiceUsageCount(choice.identifier)}
                        selected={selectedChoice &&
                            selectedChoice.key === choice.identifier &&
                            selectedChoice.areaKey === 'choices'}
                        ariaDescribedBy={ariaDescribedByIdForChoice}
                        removed={choice.removed}
                        targetable={selectedChoice &&
                            selectedChoice.areaKey.startsWith('pair_') &&
                            selectedChoice.key !== choice.identifier}
                        notHoverable={selectedChoice &&
                            (!selectedChoice.areaKey.startsWith('pair_') || selectedChoice.key === choice.identifier)}
                        on:dragStart={handleChoiceDragStart}
                        on:dragStop={handleChoiceDragStop}
                        on:click={handleChoiceClick}
                        on:keySelect={handleChoiceKeySelect}
                        on:drop={handleChoiceIndividualDrop}
                        on:dragOver={handleChoiceIndividualDragOver}
                        on:dragOut={handleChoiceIndividualDragOut}>
                        <div id={getChoiceContentId(choice.identifier)}>
                            <ChoiceContent {choice} />
                        </div>
                        <span class="visually-hidden" lang={instructionsLang}>
                            {pairs && getChoiceHiddenInfo(choice.identifier)}
                        </span>
                    </DraggableListItem>
                {/each}
            </DraggableList>
        </div>
        <ol
            class="pairs"
            role="application"
            aria-labelledby={pairsListLabelId}
            bind:this={answerArea}
            on:focusin={handleAnswerAreaFocusIn}
            on:focusout={handleAnswerAreaFocusOut}
            on:keydown={!disabled && handlePairsKeyDown}>
            {#each placeholders as placeholder, i}
                <li
                    class="pair"
                    class:linked={pairs[i] && pairs[i][0] && pairs[i][1]}
                    on:keydown={!disabled && (e => handlePairKeyDown(e, i))}
                    style={`height: ${itemHeight || getItemHeight()}px;`}>
                    <div class="pair-container">
                        {#each eachPairIndexes as n}
                            <div class="pair-element-wrapper">
                                <DropArea
                                    key={`pair_${i}_${n}`}
                                    focusable={false}
                                    on:update={handleAnswerDrop}
                                    {draggableGroupKey}
                                    {disabled}>
                                    <div
                                        class="pair-element-placeholder"
                                        class:empty-targetable={selectedChoice &&
                                            (isSelectedChoice(i, n) || !pairs[i] || !pairs[i][n])}>
                                        {#if pairs[i] && pairs[i][n]}
                                            <DraggableListButton
                                                key={pairs[i][n]}
                                                {draggableGroupKey}
                                                {disabled}
                                                tabbable={isAnswerAreaTabbable &&
                                                    i === firstTabbablePairItem[0] &&
                                                    n === firstTabbablePairItem[1]}
                                                ariaGrabbed={!!selectedChoice && isSelectedChoice(i, n)}
                                                ariaDescribedBy={selectedChoice
                                                    ? isSelectedChoice(i, n)
                                                        ? ariaDescribedByIdForPlacedown
                                                        : ariaDescribedByIdForReplace
                                                    : ariaDescribedByIdForAnswer}
                                                selected={selectedChoice && isSelectedChoice(i, n)}
                                                placed={true}
                                                removable={true}
                                                targetable={selectedChoice && pairs[i][n] !== selectedChoice.key}
                                                notHoverable={selectedChoice && pairs[i][n] === selectedChoice.key}
                                                on:dragStart={handleAnswerDragStart}
                                                on:dragStop={handleAnswerDragStop}
                                                on:click={e => handleAnswerClick(e, i, n)}
                                                on:keySelect={e => handleAnswerClick(e, i, n)}
                                                on:remove={e => handleRemovePairItem(e, i, n)}>
                                                {#if selectedChoice && !isSelectedChoice(i, n)}
                                                    <span class="visually-hidden" lang={instructionsLang}
                                                        >{__('Drop zone occupied by ')}</span>
                                                {/if}
                                                <div id={getAnswerContentId(pairs[i][n])}>
                                                    <ChoiceContent choice={getChoiceById(pairs[i][n])} />
                                                </div>
                                                <ChoiceContentDescription
                                                    otherChoice={getChoiceById(pairs[i][n === 0 ? 1 : 0])}
                                                    {instructionsLang} />
                                                <div slot="remover-aria-label">
                                                    <span lang={instructionsLang}>
                                                        {__('Return %s to unassociated options.').split('%s')[0]}
                                                    </span>
                                                    <ChoiceContent choice={getChoiceById(pairs[i][n])} />
                                                    <span lang={instructionsLang}>
                                                        {__('Return %s to unassociated options.').split('%s')[1]}
                                                    </span>
                                                </div>
                                            </DraggableListButton>
                                        {:else}
                                            <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                                            <div
                                                class={`pair-element-empty`}
                                                tabindex={selectedChoice ? '-1' : void 0}
                                                role={selectedChoice ? 'button' : void 0}
                                                aria-disabled={disabled ? true : void 0}
                                                aria-describedby={selectedChoice
                                                    ? ariaDescribedByIdForPlacedown
                                                    : void 0}
                                                aria-labelledby={pairs[i] && pairs[i][n === 0 ? 1 : 0]
                                                    ? `label_${pairs[i][n === 0 ? 1 : 0]}`
                                                    : ''}
                                                on:click|stopPropagation={!disabled &&
                                                    (e => handleAnswerClick(e, i, n))}
                                                on:keyup={!disabled && (e => handleAnswerKeyUp(e, i, n))}
                                                on:keydown={!disabled && handleAnswerKeyDown}>
                                                <div
                                                    class="hidden"
                                                    id={pairs[i] && pairs[i][n === 0 ? 1 : 0]
                                                        ? `label_${pairs[i][n === 0 ? 1 : 0]}`
                                                        : ''}>
                                                    <span lang={instructionsLang}>
                                                        {__('Empty dropzone.')}
                                                    </span>
                                                    <ChoiceContentDescription
                                                        otherChoice={getChoiceById(
                                                            pairs[i] && pairs[i][n === 0 ? 1 : 0]
                                                        )}
                                                        {instructionsLang} />
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                </DropArea>
                            </div>
                            {#if n === 0}
                                <div class="pair-link" />
                            {/if}
                        {/each}
                    </div>
                    {#if pairs[i] && pairs[i][0] && pairs[i][1]}
                        <button
                            class="remove-pair actionable"
                            class:visually-disabled={selectedChoice}
                            aria-disabled={!!selectedChoice}
                            aria-labelledby={`pairRemove_${i}`}
                            {disabled}
                            tabindex="-1"
                            on:keydown={disabled || selectedChoice ? void 0 : e => handleRemovePairKeyDown(e, i)}
                            on:click={disabled || selectedChoice ? void 0 : e => handleRemovePairClick(e, i)}>
                            <Icon name="remove-16" ariaHidden={true} />
                            <div class="hidden" id={`pairRemove_${i}`}>
                                <span lang={instructionsLang}
                                    >{__('Return the association %s and %s to unassociated options.').split(
                                        '%s'
                                    )[0]}</span>
                                <ChoiceContent choice={getChoiceById(pairs[i][0])} />
                                <span lang={instructionsLang}
                                    >{__('Return the association %s and %s to unassociated options.').split(
                                        '%s'
                                    )[1]}</span>
                                <ChoiceContent choice={getChoiceById(pairs[i][1])} />
                                <span lang={instructionsLang}
                                    >{__('Return the association %s and %s to unassociated options.').split(
                                        '%s'
                                    )[2]}</span>
                            </div>
                        </button>
                    {/if}
                </li>
            {/each}
        </ol>
        <span id={pairsListLabelId} class="hidden" lang={instructionsLang}>
            {__('answer area, %d items', pairs && getAnswerAreaItemsCount())}
        </span>
    </div>
</div>
