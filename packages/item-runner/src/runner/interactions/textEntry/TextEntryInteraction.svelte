<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;
    import { getContext, onMount } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import { WritingModeInput } from '@oat-sa-private/ui-elements';
    import { extractFromClasses } from '../util/attributes.js';
    import { convertPatternMask } from '../util/pattern.js';
    import { getInteractionStateStore } from '../../itemsStateStore';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import { formatResponseValue, formatInputValue, getLocalizedSymbols } from '../util/responseType.js';
    import { getLocale } from '../../util/locale.js';
    import { tryParseMaxlength } from '../../util/patternMask.js';
    import { wrapWithLogger, createLastPressedKeyListener } from '../util/analytics.js';
    import { findClosestBlockParent } from '../util/dom.js';

    const qtiClass = 'qti-textEntryInteraction';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let dir;

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};
    export let dataAttrs = {};

    const qtiPatternMaskMessage = dataAttrs['data-patternmask-message'];

    // interaction-level QTI attributes:
    export let disabled = false;
    export let readonly = false;
    export let classes = '';

    // response format
    export let cardinality = 'single';
    export let baseType = 'string'; // or float or integer

    export let base = 10; // numeric base

    // interaction-level QTI attributes:
    export let expectedLength; // expected overall length of the desired response measured in number of characters, can be overwritten by qti-input-width-*
    export let patternMask;
    export let placeholderText;

    // interaction-level QTI attributes derived from classes:
    let inputWidth = extractFromClasses(classes, 'qti-input-width-', val => {
        const parsedWidth = parseInt(val, 10);
        return !isNaN(parsedWidth) ? parsedWidth : null;
    });
    if (!inputWidth && expectedLength && expectedLength > 0) {
        inputWidth = expectedLength;
    }

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    const inputModes = Object.freeze({
        integer: 'numeric',
        // do not use numeric keyboard for floats due to locale differences between . and ,
        // device locale not guaranteed to match test locale
        float: 'text',
        string: 'text'
    });

    let maxlength;
    let patternMaskRegex;
    if (patternMask) {
        patternMask = convertPatternMask(patternMask);
        patternMaskRegex = new RegExp(patternMask);
        //QTI standard has no property for maxlength, and as a workaround,
        //authors use `patternMask` in specific format (`^[\s\S]{0,10}$`) to convey it
        maxlength = tryParseMaxlength(patternMask);
    }

    //Use case: prevent user from accidentally pasting huge text which will cause browser to hang.
    //Has different feedback than usual `maxlength`, so it's separate from it.
    let limitMaxlength = 1000;
    let limitMaxlengthReached = false;
    if (maxlength || maxlength === 0) {
        limitMaxlength = null;
    }

    const feedbackProps = {
        showValidFeedback: {
            //customValidity is set only if invalid; this is for 'firstTry' (before first blur)
            custom: Boolean(!patternMask || qtiPatternMaskMessage || (maxlength && !limitMaxlength)),
            pattern: Boolean(qtiPatternMaskMessage),
            maxlength: !qtiPatternMaskMessage && !limitMaxlength
        },
        showInvalidFeedback: {
            custom: true,
            pattern: Boolean(qtiPatternMaskMessage || !maxlength), //currently if maxlength is set, then pattern matches *anything* limited by this maxlength
            maxlength: !qtiPatternMaskMessage && !limitMaxlength
        }
    };

    const itemContext = getContext(itemIdentifier);
    const feedbackLang = itemContext && itemContext.getInstructionsLang();
    const writingMode = itemContext && itemContext.getWritingMode();

    let value = '';

    // for passing back to Input
    let customValidity;
    let visited = false;

    let interactionElement;
    const lastPressedKeyListener = createLastPressedKeyListener();

    if (!interactionStateStore.get().qtiClass) {
        interactionStateStore.merge({ qtiClass });
    }

    // initialize value from store
    if (interactionStateStore.hasResponse()) {
        loadResponse();
    }

    $: storeResponse(value);

    /**
     * Load response from the store and assign it to the value
     */
    function loadResponse() {
        let storedResponse = interactionStateStore.getResponseValue();
        if (storedResponse || storedResponse === 0) {
            value = formatInputValue(storedResponse, baseType, base, getLocale());
            visited = true;
        }
    }

    /**
     * Format and store value in interactionStateStore
     * @param {string} inputValue - the value as received from the input
     */
    function storeResponse(inputValue) {
        let parsedValue = null;
        let isValid = true;
        customValidity = { valid: true, msg: [] };

        if (patternMask) {
            isValid = patternMaskRegex.test(inputValue || '');
        }

        //custom validation for float and integers because of the localization,
        //so we override the input validity with a customValidity
        if (baseType === 'float' || baseType === 'integer') {
            try {
                parsedValue = formatResponseValue(inputValue, baseType, base, getLocale());
            } catch (e) {
                if (e instanceof TypeError) {
                    if (isValid) {
                        isValid = false;
                        const decimalSeparator = getLocalizedSymbols(getLocale()).decimalSeparators[0];
                        const separatorName = {
                            '.': __('(dot)'),
                            ',': __('(comma)')
                        };
                        const decimalSeparatorName = separatorName[decimalSeparator] ?? '';

                        /*eslint-disable indent */
                        customValidity = {
                            valid: false,
                            msg:
                                baseType === 'float'
                                    ? __(
                                          'Invalid value, use %s %s for decimal point separator',
                                          `"${decimalSeparator}"`,
                                          decimalSeparatorName
                                      )
                                    : __('Invalid value, please refer to the instructions')
                        };
                        /*eslint-enable indent */
                    }
                } else if (e instanceof RangeError) {
                    if (isValid) {
                        isValid = false;
                        customValidity = {
                            valid: false,
                            msg: __('Number is out of range')
                        };
                    }
                }
            }
        } else if (baseType === 'string' && typeof inputValue === 'string' && inputValue.trim().length) {
            parsedValue = inputValue.trim();
        }

        if (limitMaxlengthReached && customValidity.valid) {
            customValidity = {
                valid: false,
                msg: __('Max length has been reached')
            };
        }

        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: parsedValue
            },
            isValid
        );
    }

    /**
     * Handler to receive change event from the Input
     * @param {Event} event
     */
    function handleChange(event) {
        const newValue = event && event.detail && event.detail.value;
        if (value !== newValue) {
            value = newValue;
        }

        if (limitMaxlength) {
            limitMaxlengthReached = false;
            if (value.length >= limitMaxlength) {
                //a trick to detect that value was cut because maxlength was reached:
                //make `value.length === limitMaxlength` invalid: so 999 is valid, 1000 is invalid, 1001 is impossible
                limitMaxlengthReached = true;
            }
        }
    }

    function getInteractionElement() {
        return interactionElement;
    }

    const handleFocus = wrapWithLogger({
        interactionStateStore,
        getInteractionElement
    });
    const handleBlur = wrapWithLogger({
        interactionStateStore,
        getInteractionElement,
        getDetails() {
            return {
                newResponse: interactionStateStore.getResponseValue()
            };
        }
    });

    /**
     * Logs clipboard events
     */
    const handleClipboard = wrapWithLogger({
        interactionStateStore,
        getInteractionElement,
        handler() {
            return new Promise(resolve => {
                setTimeout(resolve, 0);
            });
        },
        getDetails(event) {
            const { content, replacedContent, position } = event.detail;
            return {
                content,
                replacedContent,
                position,
                pressedKey: lastPressedKeyListener.lastPressedKey
            };
        }
    });

    /**
     * Logs drag and drop event
     */
    const handleDragDrop = wrapWithLogger({
        interactionStateStore,
        getInteractionElement,
        handler() {
            return new Promise(resolve => {
                setTimeout(resolve, 0);
            });
        },
        getDetails(event) {
            const { content, position } = event.detail;
            return {
                content,
                position
            };
        }
    });

    onMount(() => {
        const parentClass = 'textentry-interaction-container';
        if (!interactionElement.closest(`.${parentClass}`)) {
            //we need to expand the line height of the closest parent block of the inline choice
            const parentElement = findClosestBlockParent(interactionElement);
            if (parentElement) {
                parentElement.classList.add(parentClass);
            }
        }
    });
</script>

<style>
    /* override usual input styles */
    .qti-textEntryInteraction {
        & :global(.positioning-wrapper) {
            margin-inline: var(--space-1x);
            margin-block: 0.25rem;
        }
        /* answered style - thick border is done with increased box shadow to avoid height jump */
        & :global(input.valid:not(.empty):not(:focus)) {
            @add-mixin double-border var(--color-border-actionable), var(--border-thin), var(--border-medium-plus);
            &:hover {
                @add-mixin double-border var(--color-border-actionable-hover), var(--border-thin),
                    var(--border-medium-plus);
            }
        }
        & :global(input.valid:not(.empty):focus) {
            @add-mixin double-border var(--color-border-actionable), var(--border-thin), var(--border-medium-plus);
        }
        & :global(input.valid:not(.empty).key-focus-visible) {
            @add-mixin double-border var(--color-border-actionable), var(--border-thin), var(--border-medium-plus);
            @add-mixin simple-outline;
        }
    }

    :global([data-layouts~='hideFeedbacksLayout']) {
        & .qti-textEntryInteraction :global(.feedback-inline) {
            display: none;
        }
    }

    :global(.writing-mode-vertical-rl) {
        & :global(.textentry-interaction-container):not(.inline-interaction-container) {
            line-height: 2.25; /* because of possible ruby tags [lang-dependent] */
        }
    }
</style>

<span
    class="qti-interaction qti-inlineInteraction {qtiClass} {classes}"
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}
    bind:this={interactionElement}
    on:keydown={lastPressedKeyListener.saveLastPressedKey}>
    <WritingModeInput
        {writingMode}
        {value}
        height="x-small"
        size={inputWidth}
        placeholder={placeholderText}
        {disabled}
        readonly={$itemSessionStatusStore === itemSessionStatus.closed || readonly}
        feedback="inline"
        pattern={patternMask}
        patternMessage={qtiPatternMaskMessage}
        maxlength={limitMaxlength || maxlength}
        {feedbackProps}
        {feedbackLang}
        {customValidity}
        {visited}
        inputmode={inputModes[baseType]}
        on:change={handleChange}
        on:focus={handleFocus}
        on:blur={handleBlur}
        on:clipboard={handleClipboard}
        on:dragdrop={handleDragDrop} />
</span>
