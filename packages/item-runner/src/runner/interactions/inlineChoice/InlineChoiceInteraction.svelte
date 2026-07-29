<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { onMount, getContext } from 'svelte';
    import { Dropdown } from '@oat-sa-private/ui-elements';
    import { getInteractionStateStore } from '../../itemsStateStore';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import { extractFromClasses } from '../util/attributes.js';
    import shuffleChoiceOptions from '../util/shuffleChoices.js';
    import { findClosestBlockParent } from '../util/dom.js';

    const qtiClass = 'qti-inlineChoiceInteraction';

    // response format
    export let cardinality = 'single';
    export let baseType = 'identifier';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    export let disabled = false;
    export let required = false;

    export let choices = [];

    // interaction-level QTI attributes:
    export let shuffle = false;

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let dir;
    export let classes = '';

    // inherited aria and data attributes:
    export let role;
    export let ariaAttrs = {};
    export let dataAttrs = {};

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    let choiceOptions = choices;
    if (shuffle) {
        choiceOptions = Array.isArray(choices)
            ? shuffleChoiceOptions(choices, interactionStateStore)
            : shuffleChoiceOptions(Object.keys(choices), interactionStateStore).reduce(
                  (accumulator, key) => ({
                      ...accumulator,
                      [key]: choices[key]
                  }),
                  {}
              );
    }

    let wrapperElement;

    const placeholder = dataAttrs['data-prompt'] || '';
    const inputWidth = extractFromClasses(classes, 'qti-input-width-', val => parseInt(val, 10));

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        interactionStateStore.merge({ qtiClass });
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: null
            },
            // validity:
            !required
        );
    }

    // load the response when the store change
    $: selected = $interactionStateStore ? loadResponse() : '';

    //context
    const itemContext = getContext(itemIdentifier);
    const instructionsLang = itemContext && itemContext.getInstructionsLang();
    const writingMode = itemContext && itemContext.getWritingMode();

    /**
     * Load the interaction response
     * @returns {String} the identifier of the selected response
     */
    function loadResponse() {
        // if value is invalid, do not load it
        if (interactionStateStore.getValidity() === false) {
            return selected;
        }
        let storedValue = interactionStateStore.getResponseValue();

        if (typeof storedValue === 'undefined' || storedValue === null) {
            storedValue = '';
        }
        return storedValue;
    }

    // Received from Dropdown via events
    let selectedValue;
    let validity;

    /**
     * Format and store selected value in interactionStateStore
     */
    function storeResponse() {
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: selectedValue
            },
            validity
        );

        // forget the last received value
        selectedValue = void 0;
    }

    /**
     * Change event handler, applies the state to the store
     * @param {CustomEvent} event - the component change event
     */
    function handleChange(event) {
        selectedValue = event.detail.value === '' ? null : event.detail.value;
        const eventData = {
            target: event.detail.event.target,
            type: event.detail.event.type,
            ...(event.detail.event.key && { key: event.detail.event.key }),
            ...(event.detail.event.clientX && {
                position: {
                    clientX: event.detail.event.clientX,
                    clientY: event.detail.event.clientY,
                    screenX: event.detail.event.screenX,
                    screenY: event.detail.event.screenY
                }
            })
        };
        dispatchTraceInteraction(eventData, event.detail.value);
    }

    /**
     * Validation event handler, sets local valid value
     * @param {CustomEvent} event - the component validation event
     */
    function handleValidation(event) {
        validity = event.detail.overallValidity;
        // need both selectedValue and validity before storing
        if (typeof selectedValue !== 'undefined') {
            storeResponse();
        }
    }

    onMount(() => {
        //we need to expand the line height of the closest parent block of the inline choice
        const parentElement = findClosestBlockParent(wrapperElement);
        if (parentElement) {
            parentElement.classList.add('inline-interaction-container');
        }
    });

    /**
     * Dispatches a trace event
     * @param {CustomEvent} event
     * @param {String} value
     */
    function dispatchTraceInteraction(event, value) {
        const eventData = {
            detail: {
                target: event.target,
                domEventType: event.type,
                qtiChoiceIdentifier: value,
                newResponse: selected,
                ...(event.position && { position: event.position }),
                ...(event.key && { pressedKey: event.key })
            }
        };

        const interactionEvent = new CustomEvent('interactiontrace', eventData);
        wrapperElement.dispatchEvent(interactionEvent);
    }
</script>

<style>
    :global(.inline-interaction-container) {
        line-height: 2.5;
    }
    .qti-inlineChoiceInteraction {
        margin: 0 1rem;
        line-height: 1.5;

        /* answered style - thick border is done with increased box shadow to avoid height jump */
        &.selected :global(button) {
            @add-mixin double-border var(--color-border-actionable), var(--border-thin), var(--border-medium-plus);
            &:hover {
                @add-mixin double-border var(--color-border-actionable-hover), var(--border-thin),
                    var(--border-medium-plus);
            }
        }
        /* layout values inherited from item runner, and passed down to Dropdown component */
        --dropdown-total-max-height: var(--item-container-block-size);
        --dropdown-viewport-offset-top: var(--item-container-offset-block-start);
    }

    :global([data-layouts~='hideFeedbacksLayout']) {
        & .qti-inlineChoiceInteraction :global(.feedback-inline) {
            display: none;
        }
    }
</style>

<span
    class="qti-interaction qti-inlineInteraction {qtiClass} {classes}"
    class:selected
    bind:this={wrapperElement}
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}>
    <Dropdown
        options={choiceOptions}
        bind:value={selected}
        disabled={disabled || $itemSessionStatusStore === itemSessionStatus.closed}
        {placeholder}
        height="small"
        size={inputWidth}
        feedback={required ? 'inline' : null}
        feedbackLang={instructionsLang}
        selectFocused={false}
        {required}
        visibleOptions={0}
        {writingMode}
        on:change={handleChange}
        on:validation={handleValidation} />
</span>
