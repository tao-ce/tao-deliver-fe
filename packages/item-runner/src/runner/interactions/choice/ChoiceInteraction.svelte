<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;
    import { getContext } from 'svelte';
    import { breakpoints } from '@oat-sa-private/ui-identity';
    import { SelectableChoices, SelectableChoice } from '@oat-sa-private/ui-components';
    import ChoiceFeedbackBlock from '../feedback/ChoiceFeedbackBlock.svelte';
    import { feedbackTypes } from '../feedback/choiceFeedbackHelper.js';
    import { generateElementId } from '@oat-sa-private/ui-core';
    import Prompt from '../Prompt.svelte';
    import ItemBlocks from '../../item/blocks/ItemBlocks.svelte';
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import { getItemSettingsStore } from '../../itemsSettingsStore.js';
    import { getItemToolsStateStore } from '../../itemsToolsStateStore.js';
    import { hasClass, extractFromClasses } from '../util/attributes.js';
    import { getOrientation, orientations } from '../util/sharedVocabulary.js';
    import urlUtil from 'util/url';
    import shuffleChoiceOptions from '../util/shuffleChoices.js';

    const qtiClass = 'qti-choiceInteraction';

    // ChoiceInteraction response format:
    export let cardinality = 'multiple';
    export let baseType = 'identifier';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    export let disabled = false;

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let dir;
    export let base;

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};
    export let dataAttrs = {};

    const qtiMaxChoicesMessage = dataAttrs['data-max-selections-message'];
    const qtiMinChoicesMessage = dataAttrs['data-min-selections-message'];

    const choiceAnswerMasking = 'choiceAnswerMasking';
    const choiceElimination = 'choiceElimination';

    // interaction-level QTI attributes:
    export let prompt;
    export let shuffle = false;
    export let maxChoices = 1;
    export let minChoices = 0;
    export let orientation = orientations.vertical; // can be overwritten by qti-orientation-* class
    export let classes = '';
    export let choices = [];

    let previousResponse;

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

    let promptId;
    //add semantic grouping with prompt if needed
    if (prompt) {
        promptId = generateElementId('prompt');
        //override to group role only if role not set
        if (!role) {
            role = 'group';
        }
        //add
        if (!ariaAttrs['aria-labelledby']) {
            ariaAttrs['aria-labelledby'] = promptId;
        }
    }

    // force classes to whitespace-separated string:
    if (Array.isArray(classes)) {
        classes = classes.join(' ');
    }

    // QTI class -> prop conversion maps:
    const choiceLabelTypes = Object.freeze({
        decimal: 'decimal',
        'lower-alpha': 'lowerAlpha',
        'upper-alpha': 'upperAlpha'
    });
    const choiceLabelSuffixes = Object.freeze({
        parenthesis: ')',
        period: '.',
        none: ''
    });
    const stackings = [1, 2, 3, 4, 5];

    // interaction-level QTI attributes derived from classes:
    const choiceLabel = extractFromClasses(classes, 'qti-labels-', val => choiceLabelTypes[val]);

    const choiceLabelSuffix =
        extractFromClasses(classes, 'qti-label-suffix-', val => choiceLabelSuffixes[val], '') || '';

    let stacking = extractFromClasses(classes, 'qti-choices-stacking-', val => parseInt(val, 10));
    stacking = stackings.indexOf(stacking) + 1; // not found will give desired default stacking of 0

    const controls = !hasClass(classes, 'qti-input-control-hidden');

    const taoConstrainMaxChoices = hasClass(classes, 'tao-constrain-maxChoices');

    let isInteractionFocused = false; // becomes true when interaction is focused for the first time
    let interactionElement;

    const name = generateElementId('choice-interaction');

    const captionChoiceMode = choices.every(choice => choice.image && choice.image.src);

    const itemContext = getContext(itemIdentifier);
    const assetManager = itemContext && itemContext.getAssetManager();
    const writingMode = itemContext && itemContext.getWritingMode();

    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const itemSettingsStore = getItemSettingsStore(itemIdentifier);
    const toolsStateStore = getItemToolsStateStore(itemIdentifier);

    // internal state management:
    let selected = [];
    let immediateValidationWarning = false;

    let eliminated = toolsStateStore.getElementToolState(choiceElimination, responseIdentifier) || [];
    $: eliminable =
        itemSettingsStore.isEnabled(choiceElimination) &&
        $itemSettingsStore &&
        $itemSettingsStore.choiceElimination === true;
    $: if (!eliminable) {
        eliminated = [];
        toolsStateStore.setElementToolState(choiceElimination, responseIdentifier, eliminated);
    }

    let masked = toolsStateStore.getElementToolState(choiceAnswerMasking, responseIdentifier) || [];
    $: maskable =
        itemSettingsStore.isEnabled(choiceAnswerMasking) &&
        $itemSettingsStore &&
        $itemSettingsStore.choiceAnswerMasking === true;
    $: if (!maskable) {
        masked = [];
        toolsStateStore.setElementToolState(choiceAnswerMasking, responseIdentifier, masked);
    }

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        interactionStateStore.merge({ qtiClass });
        saveResponse();
    }

    $: if ($interactionStateStore) {
        loadResponse();
    }

    $: {
        if (taoConstrainMaxChoices && selected && maxChoices > 1 && selected.length > maxChoices) {
            immediateValidationWarning = true;
            let selectedTrim = [...selected];
            selectedTrim.pop();
            selected = selectedTrim;
            saveResponse();
        } else {
            // We need it explicitly to clear the timer on Feedback side
            immediateValidationWarning = false;
        }
    }

    // containts the choices in the order they should be displayed
    let orderedChoices = choices;
    if (shuffle) {
        orderedChoices = shuffleChoiceOptions(choices, interactionStateStore);
    }

    //resolve assets in images
    let resolvedImages = null;
    if (captionChoiceMode) {
        resolvedImages = {};
        orderedChoices.forEach(choice => {
            if (choice.image) {
                const image = Object.assign({}, choice.image);
                if (assetManager && image.src) {
                    image.src = assetManager.resolve(base ? urlUtil.build([base, image.src]) : image.src);
                }
                resolvedImages[choice.key] = image;
            } else {
                resolvedImages[choice.key] = null;
            }
        });
    }

    /**
     * Load the saved interaction response (if any)
     */
    function loadResponse() {
        // retrieve stored JSON object response and decode it
        const storedResponse = interactionStateStore.getResponseValue();
        if (storedResponse) {
            selected = Array.isArray(storedResponse) ? storedResponse : [storedResponse];

            //if the eliminated choices conflicts with the selected choices, the selection is kept over the elimination
            if (eliminated && eliminated.length) {
                eliminated = eliminated.filter(choice => !selected.includes(choice));
                toolsStateStore.setElementToolState(choiceElimination, responseIdentifier, eliminated);
            }
            //if the masked choices conflicts with the selected choices, the selection is kept over the masking
            if (masked && masked.length) {
                masked = masked.filter(choice => !selected.includes(choice));
                toolsStateStore.setElementToolState(choiceAnswerMasking, responseIdentifier, masked);
            }
        }
    }

    /**
     * Save the latest interaction response
     */
    function saveResponse() {
        toolsStateStore.setElementToolState(choiceElimination, responseIdentifier, eliminated || []);
        toolsStateStore.setElementToolState(choiceAnswerMasking, responseIdentifier, masked || []);

        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: selected
            },
            // validity:
            getValidity()
        );
    }

    /**
     * Trace the interaction
     * @param {Event} event
     */
    function traceInteraction(event) {
        if (!event?.target?.defaultValue) {
            return;
        }
        const newResponse = interactionStateStore.getResponseIfChanged(previousResponse);
        const eventData = {
            detail: {
                target: event.target,
                domEventType: event.type,
                qtiChoiceIdentifier: event.target.defaultValue,
                newResponse
            }
        };

        if (event.type === 'keyup') {
            eventData.detail.pressedKey = event.key;
        } else {
            eventData.detail.position = {
                clientX: event.clientX,
                clientY: event.clientY,
                screenX: event.screenX,
                screenY: event.screenY
            };
        }

        const interactionEvent = new CustomEvent('interactiontrace', eventData);
        interactionElement.dispatchEvent(interactionEvent);
    }

    /**
     * Get the validity of the current state
     * @returns {Boolean}
     */
    function getValidity() {
        if (maxChoices > 0 && selected.length > maxChoices) {
            return false;
        }
        if (minChoices > 0 && selected.length < minChoices) {
            return false;
        }
        return true;
    }

    /**
     * Handle choice change
     * @param {Event} event
     */
    function handleChange(event) {
        previousResponse = interactionStateStore.snapshotResponse();
        saveResponse();
        traceInteraction(event.detail);
        // due to checkboxes, in Safari it can also be interacted without firing focusin event
        isInteractionFocused = true;
    }

    /**
     * Flag that focus jump inside interaction
     */
    function handleInteractionFocusIn() {
        isInteractionFocused = true;
    }

    let windowWidth;
</script>

<style>
    .qti-choiceInteraction :global(.choice-content > p:first-child) {
        margin-block-start: 0;
    }
    .qti-choiceInteraction :global(.choice-content > p:last-child) {
        margin-block-end: 0;
    }

    .qti-choiceInteraction :global(.compact-appearance) {
        margin-left: auto;
        align-self: center;
    }

    .qti-choiceInteraction :global(.choice-content:has(.compact-appearance)) {
        display: flex;
        align-items: center;
    }

    :global([dir='rtl'] .qti-choiceInteraction .compact-appearance) {
        margin-left: initial;
        margin-right: auto;
    }
</style>

<svelte:window bind:innerWidth={windowWidth} />

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
        <Prompt blockTree={prompt} id={promptId} />
    {/if}

    <ChoiceFeedbackBlock
        bind:immediateValidationWarning
        {maxChoices}
        {minChoices}
        {taoConstrainMaxChoices}
        type={feedbackTypes.selectChoices}
        {qtiMaxChoicesMessage}
        {qtiMinChoicesMessage}
        {isInteractionFocused}
        {interactionElement}
        selectedNumber={selected.length}
        lang={itemContext && itemContext.getInstructionsLang()} />

    <SelectableChoices
        {maxChoices}
        {minChoices}
        {writingMode}
        orientation={getOrientation(classes, orientation)}
        {disabled}>
        {#each orderedChoices as choice, index}
            <SelectableChoice
                bind:selected
                bind:eliminated
                bind:masked
                {index}
                key={choice.key}
                {maxChoices}
                {choiceLabel}
                {choiceLabelSuffix}
                {eliminable}
                {maskable}
                {writingMode}
                disabled={disabled || $itemSessionStatusStore === itemSessionStatus.closed}
                image={captionChoiceMode ? resolvedImages[choice.key] : false}
                showCaption={!captionChoiceMode || (choice.label && choice.label.trim() !== '')}
                {controls}
                {name}
                stacking={windowWidth <= breakpoints.width.medium ? 1 : stacking}
                on:change={handleChange}>
                {#if (captionChoiceMode || !choice.blockTree) && choice.label}
                    {choice.label}
                {:else if choice.blockTree}
                    <ItemBlocks blockTree={choice.blockTree} />
                {/if}
            </SelectableChoice>
        {/each}
    </SelectableChoices>
</div>
