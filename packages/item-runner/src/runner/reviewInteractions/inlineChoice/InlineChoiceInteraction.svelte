<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { onMount, getContext } from 'svelte';
    import { Dropdown } from '@oat-sa-private/ui-elements';
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { extractFromClasses } from '../../interactions/util/attributes.js';
    import { findClosestBlockParent } from '../../interactions/util/dom.js';

    const qtiClass = 'qti-inlineChoiceInteraction';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    export let required = false;

    export let choices = [];

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
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    let choiceOptions = choices;

    let wrapperElement;

    const placeholder = dataAttrs['data-prompt'] || '';
    const inputWidth = extractFromClasses(classes, 'qti-input-width-', val => parseInt(val, 10));

    // load the response when the store change
    let selected = '';
    interactionStateStore.subscribe(() => {
        const response = interactionStateStore.getResponseValue();
        if (response) {
            selected = loadResponse();
        }
    });

    //context
    const itemContext = getContext(itemIdentifier);
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

    onMount(() => {
        //we need to expand the line height of the closest parent block of the inline choice
        const parentElement = findClosestBlockParent(wrapperElement);
        if (parentElement) {
            parentElement.classList.add('inline-interaction-container');
        }
    });
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
        disabled={true}
        {placeholder}
        height="small"
        size={inputWidth}
        selectFocused={false}
        {required}
        visibleOptions={0}
        {writingMode} />
</span>
