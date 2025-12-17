<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;

    import { generateElementId, arrowKeysFocusLoop, isRTLElement } from '@oat-sa-private/ui-core';
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import { extractLastMatchingClass, hasClass } from '../util/attributes.js';
    import ChoiceFeedbackBlock from '../feedback/ChoiceFeedbackBlock.svelte';
    import Prompt from '../Prompt.svelte';
    import ItemBlocks from '../../item/blocks/ItemBlocks.svelte';
    import { getContext, setContext } from 'svelte';
    import { writable } from 'svelte/store';

    const qtiClass = 'qti-hottextInteraction';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    export let disabled = false;

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let dir;

    // inherited aria and data attributes:
    export let role;

    export let ariaAttrs = {};
    export let dataAttrs = {};

    const qtiMaxChoicesMessage = dataAttrs['data-max-selections-message'];
    const qtiMinChoicesMessage = dataAttrs['data-min-selections-message'];

    // interaction-level QTI attributes:
    export let maxChoices = 1;
    export let minChoices = 0;
    export let prompt;

    // response format
    const cardinality = maxChoices === 1 ? 'single' : 'multiple';
    const baseType = 'identifier';

    const itemContext = getContext(itemIdentifier);

    // if true, choices should have radio look and behavior; if false - checkbox
    const isRadio = maxChoices === 1;

    // maxChoice = 1 behaves exactly like radioButton
    const singleChoice = isRadio || cardinality === 'single';
    let immediateValidationWarning = false;
    /**
     * Styling classNames to change the interaction's look
     * Their CSS is located in the HotTextToken component
     */
    const stylingClassNames = Object.freeze({
        default: 'tao-control-input-default',
        inputHidden: 'qti-control-input-hidden',
        stylingHidden: 'tao-control-styling-hidden'
    });
    export let classes = '';

    // if true, selecting more then maxChoices would be prevented
    const taoConstrainMaxChoices = hasClass(classes, 'tao-constrain-maxChoices');

    // force itemData classes to whitespace-separated string:
    if (Array.isArray(classes)) {
        classes = classes.join(' ');
    }

    // extract the one stylingClass to be applied (they are mutually exclusive)
    let uniqueStylingClass = extractLastMatchingClass(classes, Object.values(stylingClassNames));
    if (!uniqueStylingClass) {
        uniqueStylingClass = stylingClassNames.default;
    }

    // remove all stylingClasses from classes
    for (let className of Object.values(stylingClassNames)) {
        classes = classes.replace(className, '');
    }

    let isInteractionFocused = false; // becomes true when interaction is focused for the first time
    let interactionElement;
    let radioBlockTreeHasFocus = false; // focus is within interaction content
    $: isRTL = interactionElement && isRTLElement(interactionElement);

    // the parsed item body:
    export let blockTree = [];

    const name = generateElementId('hottext-interaction');

    /**
     * Svelte store bound to selected token list
     * @type {Object}
     * $selectedStore value has @type {Set} - initially empty
     */
    const selectedStore = writable(new Set());

    /**
     * Add a tokenIdentifier to the stored list
     * @param {String} tokenIdentifier
     * @returns {Boolean} true if identifier successfully added or already present, false if neither
     */
    selectedStore.add = tokenIdentifier => {
        if (isRadio) {
            $selectedStore.clear();
        }

        if (cardinality === 'single' && $selectedStore.size === 1) {
            // must not exceed 1 token in single cardinality
            return false;
        }

        // constrain selecting over maxChoice
        if (taoConstrainMaxChoices && !singleChoice && maxChoices > 0 && $selectedStore.size >= maxChoices) {
            immediateValidationWarning = true;
            return false;
        }

        $selectedStore.add(tokenIdentifier);
        $selectedStore = $selectedStore;
        saveResponse();
        return true;
    };

    /**
     * Remove a tokenIdentifier from the stored list
     * The minChoices constraint is deliberately not applied
     * @param {String} tokenIdentifier
     * @returns {Boolean} always true, doesn't matter if identifier successfully removed or wasn't present
     */
    selectedStore.delete = tokenIdentifier => {
        $selectedStore.delete(tokenIdentifier);
        $selectedStore = $selectedStore;
        immediateValidationWarning = false;
        saveResponse();
        return true;
    };

    /**
     * Svelte store to pass data needed for radio arrow-key navigation.
     * $focusStore value has @type { getTabindex: (hottextIdentifier) => String }
     * Hottext choices should subscribe to it and update their tabindex with the value of `$focusStore.getTabindex(hottextIdentifier)`
     */
    const focusStore = writable({ getTabindex: () => '0' });

    // data for HotTextTokens to inherit:
    setContext('selectedStore', selectedStore);
    setContext('itemIdentifier', itemIdentifier);
    setContext('isRadio', isRadio);
    setContext('focusStore', focusStore);

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        saveResponse();
    }

    // load the response when the store change
    $: if ($interactionStateStore) {
        loadResponse();
    }

    /**
     * Load the interaction response
     * (wrap string response identifier into array of identifiers if cardinality single)
     */
    function loadResponse() {
        let storedResponse = interactionStateStore.getResponseValue();

        if (cardinality === 'single' && storedResponse && storedResponse.length) {
            storedResponse = [storedResponse];
        }

        if (typeof storedResponse === 'undefined' || storedResponse === null) {
            storedResponse = [];
        }
        $selectedStore = new Set(storedResponse);
    }

    /**
     * Format and store selected value in interactionStateStore
     * (unpack array of identifiers to single string identifier if cardinality single)
     */
    function saveResponse() {
        let value = Array.from($selectedStore);

        if (cardinality === 'single' && value.length) {
            value = value[0];
        }

        interactionStateStore.merge({ qtiClass });
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value
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
        if (maxChoices > 0 && $selectedStore.size > maxChoices) {
            return false;
        }
        if (minChoices > 0 && $selectedStore.size < minChoices) {
            return false;
        }
        return true;
    }

    /**
     * Flag that focus jump inside interaction
     */
    function handleInteractionFocusIn() {
        isInteractionFocused = true;
    }

    /**
     * Radio choices arrow-key navigation: get focusable radio elements
     * @returns {NodeList}
     */
    function getFocusableRadios() {
        if (!interactionElement) {
            return null;
        }
        return interactionElement.querySelectorAll('.qti-hottext input[type="radio"]');
    }

    /**
     * Radio choices arrow-key navigation: make choices update their `tabindex`
     */
    function setRadioTabindex() {
        $focusStore.getTabindex = hottextIdentifier => {
            if (radioBlockTreeHasFocus) {
                return '-1';
            } else if ($selectedStore.size) {
                //first selected has tabindex=0 (first in html order, but for radio it's always only one)
                const tabstopIdentifier = Array.from($selectedStore)[0];
                return tabstopIdentifier === hottextIdentifier ? '0' : '-1';
            } else {
                return '0';
            }
        };
        $focusStore = $focusStore;
    }

    $: setRadioTabindex($selectedStore, radioBlockTreeHasFocus);

    $: disabledBySession = $itemSessionStatusStore === itemSessionStatus.closed;
</script>

<style>
    .qti-hottextInteraction {
        margin: 0 var(--space-1x);

        & .qti-block {
            line-height: 2.5;
            outline: 0; /* focusable container for screen readers */
        }
    }

    .tao-control-styling-hidden {
        & .qti-block {
            line-height: 2;
        }
    }
</style>

<div
    class="qti-interaction qti-blockInteraction {qtiClass} {classes} {uniqueStylingClass}"
    on:focusin|once={handleInteractionFocusIn}
    bind:this={interactionElement}
    lang={language}
    {id}
    {dir}
    {role}
    {name}
    aria-disabled={disabled || disabledBySession}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}

    <ChoiceFeedbackBlock
        bind:immediateValidationWarning
        {maxChoices}
        {minChoices}
        type="choices"
        {taoConstrainMaxChoices}
        {qtiMaxChoicesMessage}
        {qtiMinChoicesMessage}
        {isInteractionFocused}
        {interactionElement}
        selectedNumber={$selectedStore.size}
        lang={itemContext && itemContext.getInstructionsLang()} />

    <div class="qti-flow-container">
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
            class="qti-block"
            tabindex="0"
            use:arrowKeysFocusLoop={{ getFocusableElements: isRadio ? getFocusableRadios : null, isRTL }}
            on:setHasFocus={e => {
                radioBlockTreeHasFocus = e.detail;
            }}>
            <ItemBlocks {blockTree} />
        </div>
    </div>
</div>
