<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;

    import { getContext } from 'svelte';
    import Prompt from '../Prompt.svelte';
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import { hasClass, removeClass } from '../util/attributes.js';
    import ChoiceFeedbackBlock from '../feedback/ChoiceFeedbackBlock.svelte';
    import TabularMatch from './TabularMatch.svelte';
    import NonTabularMatch from './NonTabularMatch.svelte';
    import { shuffleChoicesTable } from '../util/shuffleChoices';
    import { getPositioning } from '../util/sharedVocabulary.js';

    const qtiClass = 'qti-matchInteraction';

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

    // interaction-level QTI attributes:
    export let prompt;
    export let maxAssociations = 1;
    export let minAssociations = 0;
    export let choices = [[], []];
    export let shuffle = false;

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    if (shuffle) {
        choices = shuffleChoicesTable(choices, interactionStateStore);
    }

    // minAssociations should be less than maxAssociations
    minAssociations = maxAssociations > 0 ? Math.min(minAssociations, maxAssociations) : minAssociations;

    // data attributes
    export let dataAttrs = {};
    const maxSelectionMessage = dataAttrs['data-max-selections-message'];
    const minSelectionMessage = dataAttrs['data-min-selections-message'];
    const firstColumnHeader = dataAttrs['data-first-column-header'];

    // interaction-level QTI attributes derived from classes:
    const isTabular = !hasClass(classes, 'qti-match-non-tabular');
    const isHiddenHeader = hasClass(classes, 'qti-header-hidden');
    const choicesPosition = getPositioning(classes);
    // Tao-specific attributes derived from classes:
    const boldTableHeader = hasClass(classes, 'bold-table-header');
    classes = removeClass(classes, 'bold-table-header');

    // Response format:
    export let cardinality = maxAssociations === 1 ? 'single' : 'multiple';
    const baseType = 'directedPair';

    // contains value of interaction
    let pairs = [];

    let isInteractionFocused = false; // becomes true when interaction is focused for the first time
    let interactionElement;

    const itemContext = getContext(itemIdentifier);
    const instructionsLang = itemContext && itemContext.getInstructionsLang();

    if (!interactionStateStore.get().qtiClass) {
        interactionStateStore.merge({ qtiClass });
    }

    $: $interactionStateStore && loadResponse();

    //update store on pairs value change; also will do initial response definition
    $: pairs && storeResponse();

    /**
     * Validate pairs
     * @returns {boolean} - validity
     */
    function getPairsValidity() {
        let validity = true;

        if (
            (minAssociations > 0 && pairs.length < minAssociations) ||
            (maxAssociations > 0 && pairs.length > maxAssociations)
        ) {
            validity = false;
        }

        // validate matchMin and matchMax properties of choices
        if (validity) {
            choices.some(choiceSet =>
                // eslint-disable-next-line implicit-arrow-linebreak
                choiceSet.some(choice => {
                    const choiceUsageCount = pairs.filter(
                        pair => pair[0] === choice.key || pair[1] === choice.key
                    ).length;
                    if (
                        (choice.matchMin > 0 && choiceUsageCount < choice.matchMin) ||
                        (choice.matchMax > 0 && choiceUsageCount > choice.matchMax)
                    ) {
                        validity = false;
                    }
                    return !validity;
                })
            );
        }

        return validity;
    }

    /**
     * Loads response from store
     */
    function loadResponse() {
        let newResponse = interactionStateStore.getResponseValue();

        if (!newResponse) {
            newResponse = [];
        } else if (cardinality === 'single') {
            newResponse = [newResponse];
        }

        // compare new and old answer and load only if it is different
        if (
            newResponse.length !== pairs.length ||
            newResponse.find((pair, i) => !pairs[i] || pair[0] !== pairs[i][0] || pair[1] !== pairs[i][1])
        ) {
            pairs = newResponse;
        }
    }

    /**
     * Format and store value in interactionStateStores
     */
    function storeResponse() {
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: cardinality === 'single' ? pairs[0] || null : pairs
            },
            getPairsValidity()
        );
    }

    /**
     * Handle change event, in tabular mode
     * @param {Event} e - change event
     */
    function handleTabularChange(e) {
        // due to checkboxes, in Safari it can also be interacted without firing focusin event
        isInteractionFocused = true;

        dispatchInteractiontraceEvent(e);
    }

    /**
     * Flag that focus jump inside interaction
     */
    function handleInteractionFocusIn() {
        isInteractionFocused = true;
    }

    $: disabledBySession = $itemSessionStatusStore === itemSessionStatus.closed;

    /**
     * Dispatch interactiontrace event
     * @param {CustomEvent} e - change event
     */
    function dispatchInteractiontraceEvent(e) {
        const { qtiChoiceIdentifier, type, position, target, pressedKey } = e.detail;

        const event = new CustomEvent('interactiontrace', {
            detail: {
                domEventType: type,
                target,
                qtiChoiceIdentifier,
                ...(position && { position }),
                ...(pressedKey && { pressedKey }),
                newResponse: pairs
            }
        });
        interactionElement.dispatchEvent(event);
    }
</script>

<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    on:focusin|once={handleInteractionFocusIn}
    bind:this={interactionElement}
    lang={language}
    {id}
    {dir}
    {role}
    aria-disabled={disabledBySession}
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
        selectedNumber={pairs.length}
        lang={instructionsLang} />

    {#if isTabular}
        <TabularMatch
            {choices}
            {firstColumnHeader}
            {isHiddenHeader}
            {boldTableHeader}
            disabled={disabledBySession}
            {instructionsLang}
            {maxAssociations}
            {prompt}
            bind:pairs
            on:change={handleTabularChange} />
    {:else}
        <NonTabularMatch {choices} {choicesPosition} disabled={disabledBySession} bind:pairs {instructionsLang} />
    {/if}
</div>
