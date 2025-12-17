<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-21 (original work) Open Assessment Technologies SA ;

    // Stores
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import itemSessionStatus from '../../itemSessionStatus.js';
    // Components
    import { Input, Button, Slider, sliderValueFactory } from '@oat-sa-private/ui-elements';
    import Prompt from '../Prompt.svelte';
    import AtomicAriaLive from '../AtomicAriaLive.svelte';
    // Utils
    import { getContext } from 'svelte';
    import { generateElementId, __ } from '@oat-sa-private/ui-core';
    import numberFormattingFactory, { getLocale } from '../../util/locale.js';
    import { createLastPressedKeyListener, wrapWithLogger } from '../util/analytics';

    const qtiClass = 'qti-sliderInteraction';

    // response format
    const cardinality = 'single';
    export let baseType = 'integer'; //or 'float', though 'float' is not supported properly

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let dir;

    // inherited aria and data attributes:
    export let role;
    export let ariaAttrs = {};
    export let dataAttrs = {};

    // interaction-level QTI attributes:
    export let classes = '';
    export let prompt;
    export let disabled = false;
    export let lowerBound;
    export let upperBound;
    export let step = 1;
    export let orientation = 'horizontal'; //or 'vertical'
    export let reverse = false; //switch rendering of upperBound and lowerBound
    let interactionElement; // bind to slider
    const getInteractionElement = () => interactionElement;

    lowerBound = Math.ceil(lowerBound);
    upperBound = Math.max(Math.floor(upperBound), lowerBound);

    const itemContext = getContext(itemIdentifier);

    //lang
    const instructionsLang = itemContext && itemContext.getInstructionsLang();

    const plusLabelledById = generateElementId('plus-label');
    const minusLabelledById = generateElementId('minus-label');
    const sliderLabelledById = generateElementId('slider-label');
    const inputDescribedById = generateElementId('input');
    const plusDescribedById = generateElementId('plus');
    const minusDescribedById = generateElementId('minus');
    const sliderDescribedById = generateElementId('slider');
    let ariaLiveAnnouncement;

    const valueHelper = sliderValueFactory(lowerBound, upperBound, step);
    const inputSize = Math.max(lowerBound.toString().length, upperBound.toString().length);
    const vertical = orientation === 'vertical';
    const isNormalFlow = (!reverse && !vertical) || (reverse && vertical); //for vertical, lowerBound is on bottom and upperBound on top, which is against page flow
    let value = null;
    let inputValue = '';
    let isInputFocused = false;
    let wasInputChangeFired = false;

    // stores
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    // do initial response definition
    if (!interactionStateStore.hasResponse()) {
        interactionStateStore.merge({ qtiClass });
        saveResponse();
    }

    // load the response when the store change
    $: if ($interactionStateStore) {
        loadResponse();
    }

    $: isValueSet = value || value === 0;
    $: disabledBySession = $itemSessionStatusStore === itemSessionStatus.closed;

    const lastPressedKeyListener = createLastPressedKeyListener();
    const handleKeyDown = lastPressedKeyListener.saveLastPressedKey;

    /**
     * Loads response from store and set value
     */
    function loadResponse() {
        const storedValue = interactionStateStore.getResponseValue();
        if (typeof storedValue === 'number') {
            value = storedValue;
            //do not always restore inputValue: response is updated when typing text, but text itself only on blur
            if (!inputValue || !isInputFocused) {
                inputValue = value;
            }
        } else {
            //restore inputValue only if loadResponse overwrites existing 'value': if it had invalid text, it should be kept
            if (value || value === 0) {
                inputValue = '';
            }
            value = null;
        }
    }

    /**
     * Set response to the store
     */
    function saveResponse() {
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value
            },
            isValueSet ? value <= upperBound && value >= lowerBound : true
        );
    }

    /**
     * Parse number which user had entered in text input
     * @param {String} str
     * @returns {Number}
     */
    function parseNumber(str) {
        const numberParser = numberFormattingFactory(getLocale());
        return numberParser.parseIntValue(str);
    }

    /**
     * Handle slider change
     * @param {CustomEvent} e
     */
    const handleSliderChange = wrapWithLogger({
        /// use a getter instead of direct interactionElement,
        // as passing interactionElement as null
        // seals null value forever for a resulted function
        getInteractionElement,
        handler(e) {
            value = e.detail.value;

            inputValue = value;
            saveResponse();
        },
        eventTypeToDomEventTypeMap: {
            mousedown: 'click'
        },
        interactionStateStore,
        getDetails: e => ({
            ...(e.detail.position && { position: e.detail.position })
        }),
        logDebounceOptions: {
            wait: 300,
            leading: true,
            trailing: true
        }
    });

    /**
     * Handle minus button click
     * @param {CustomEvent}
     */
    const handleMinusClick = wrapWithLogger({
        getInteractionElement,
        handler() {
            value = valueHelper.increment(value, -step);

            inputValue = value;
            saveResponse();

            liveAnnounce(value);
        },
        getDetails: e => ({
            ...(lastPressedKeyListener.lastPressedKey && { pressedKey: lastPressedKeyListener.lastPressedKey }),
            ...(e.detail.position && !lastPressedKeyListener.lastPressedKey && { position: e.detail.position })
        }),
        interactionStateStore
    });

    /**
     * Handle plus button click
     * @param {CustomEvent}
     */
    const handlePlusClick = wrapWithLogger({
        getInteractionElement,
        handler() {
            value = valueHelper.increment(value, step);

            inputValue = value;
            saveResponse();

            liveAnnounce(value);
        },
        getDetails: e => ({
            ...(lastPressedKeyListener.lastPressedKey && { pressedKey: lastPressedKeyListener.lastPressedKey }),
            ...(e.detail.position && !lastPressedKeyListener.lastPressedKey && { position: e.detail.position })
        }),
        interactionStateStore
    });

    /**
     * Handle text input change
     * @param {CustomEvent}
     */
    const handleTextChange = wrapWithLogger({
        getInteractionElement,
        handler(e) {
            wasInputChangeFired = true;
            inputValue = e.detail.value;
            const numericInputValue = parseNumber(inputValue);
            if (!isNaN(numericInputValue)) {
                value = valueHelper.adjust(numericInputValue);

                saveResponse();
            } else {
                value = null;
                saveResponse();
            }
        },
        getDetails: e => ({
            pressedKey: lastPressedKeyListener.lastPressedKey,
            target: e.detail.target
        }),
        interactionStateStore
    });

    /**
     * Handle input container focusin (equals input focus)
     */
    function handleInputContainerFocusin() {
        isInputFocused = true;
        wasInputChangeFired = false;
    }

    /**
     * Handle input container focusout (equals input blur)
     */
    function handleInputContainerFocusout() {
        isInputFocused = false;

        if (isValueSet) {
            inputValue = value;
        }

        if (wasInputChangeFired) {
            wasInputChangeFired = false;
            if (isValueSet) {
                liveAnnounce(__('Changed to %d', value));
            } else {
                liveAnnounce(__('Changed to default'));
            }
        }
    }

    /**
     * Get a string describing value, min and max, to use as part of aria-label
     * @returns {String}
     */
    function getStatusAriaLabel() {
        const valueAria = isValueSet ? __('Current value %d', value) : __('Default');
        return __('%s, min %d max %d', valueAria, lowerBound, upperBound);
    }

    /**
     * Sets the aria-live announcement
     * @param {String} text
     */
    function liveAnnounce(text) {
        ariaLiveAnnouncement = { text };
    }
</script>

<style>
    @add-mixin dir-style .content-container, --dir-rtl-multiplier, 1, -1;

    .content-container {
        display: flex;
        flex-wrap: wrap;
        align-items: center;

        & :global(button) {
            /* user tends to press several times on plus/minus buttons, which can get recognized as double-touch-to-zoom */
            touch-action: manipulation;
            margin: 0;

            &:last-of-type {
                order: 3;
            }
        }
    }

    .input-container {
        margin-inline-end: 2.5rem;

        /* override usual input styles */
        & :global(input) {
            @add-mixin double-border var(--color-border-default);
        }
        & :global(input.height-medium) {
            padding-inline-end: 2rem;
        }
        & :global(.icon) {
            display: none;
        }
    }

    .slider-container {
        flex: 1 0 auto;
        margin: 0 2rem;
    }

    /* mobile and tablet portrait, if horizontal
     [note: would be more logical to measure against container column] */
    @media screen and (--mq-maxwidth-large) {
        .content-container:not(.vertical) {
            & .input-container {
                flex-grow: 1;
            }

            & :global(button:first-of-type) {
                margin-inline-end: 2rem;
            }

            & :global(button:last-of-type) {
                order: 0;
            }

            & .slider-container {
                flex-basis: 100%;
                margin: 3rem 0 0 0;
            }
        }
    }

    /* vertical orientation */
    .vertical {
        &.content-container {
            display: grid;
            grid-template-columns: min-content;
            justify-items: end;
        }
        & .input-container {
            margin-inline-end: 0;
            margin-bottom: 3rem;
            /* 3rem is the part of slider width to the right of the track */
            transform: translateX(calc(var(--dir-rtl-multiplier) * (50% - 3rem)));
        }
        & .slider-container {
            height: 35vh;
            margin: 2rem 0;
        }
    }

    :global([data-layouts~='hideFeedbacksLayout']) {
        & .qti-sliderInteraction :global(.feedback-inline) {
            display: none;
        }
    }
</style>

<div
    bind:this={interactionElement}
    on:keydown={handleKeyDown}
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    lang={language}
    {id}
    {dir}
    {role}
    aria-disabled={disabled || disabledBySession}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}

    <AtomicAriaLive lang={instructionsLang} announcement={ariaLiveAnnouncement} />
    <div class="hidden" lang={instructionsLang}>
        <div id={plusLabelledById}>{__('Plus. %s', getStatusAriaLabel(isValueSet, value))}</div>
        <div id={minusLabelledById}>{__('Minus. %s', getStatusAriaLabel(isValueSet, value))}</div>
        <div id={inputDescribedById}>{__('To enter the slider value in this field, type.')}</div>
        <div id={minusDescribedById}>{__('Use to decrease the slider value by %d', step)}</div>
        <div id={plusDescribedById}>{__('Use to increase the slider value by %d', step)}</div>
        <div id={sliderDescribedById}>{__('Use the arrow keys to increase or decrease the value by %d', step)}</div>
    </div>
    <div class="content-container" class:inverted-flow={!isNormalFlow} class:vertical>
        <div
            class="input-container"
            on:focusin={handleInputContainerFocusin}
            on:focusout={handleInputContainerFocusout}>
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label>
                <span class="visually-hidden">{getStatusAriaLabel(isValueSet, value)}</span>
                <Input
                    placeholder="-"
                    value={inputValue}
                    height="medium"
                    size={inputSize}
                    inputmode="numeric"
                    readonly={disabled || disabledBySession}
                    feedback="inline"
                    feedbackProps={{ showValidFeedback: false }}
                    customValidity={{ valid: isValueSet || !inputValue }}
                    ariaDescribedBy={inputDescribedById}
                    on:change={handleTextChange} />
            </label>
        </div>
        {#if isNormalFlow}
            <Button
                ariaLabelledBy={minusLabelledById}
                ariaDescribedBy={minusDescribedById}
                skin="secondary"
                size="medium"
                icon="minus-16"
                shape="circular"
                disabled={disabled || disabledBySession}
                dataTestId="slider-minus"
                on:click={handleMinusClick} />
            <Button
                ariaLabelledBy={plusLabelledById}
                ariaDescribedBy={plusDescribedById}
                skin="secondary"
                size="medium"
                icon="plus-16"
                shape="circular"
                disabled={disabled || disabledBySession}
                dataTestId="slider-plus"
                on:click={handlePlusClick} />
        {:else}
            <Button
                ariaLabelledBy={plusLabelledById}
                ariaDescribedBy={plusDescribedById}
                skin="secondary"
                size="medium"
                icon="plus-16"
                shape="circular"
                disabled={disabled || disabledBySession}
                dataTestId="slider-plus"
                on:click={handlePlusClick} />
            <Button
                ariaLabelledBy={minusLabelledById}
                ariaDescribedBy={minusDescribedById}
                skin="secondary"
                size="medium"
                icon="minus-16"
                shape="circular"
                disabled={disabled || disabledBySession}
                dataTestId="slider-minus"
                on:click={handleMinusClick} />
        {/if}
        <div class="slider-container">
            <Slider
                min={lowerBound}
                max={upperBound}
                {step}
                {value}
                {reverse}
                {vertical}
                disabled={disabled || disabledBySession}
                ariaLabelledBy={sliderLabelledById}
                ariaDescribedBy={sliderDescribedById}
                on:change={handleSliderChange} />
            <span id={sliderLabelledById} lang={instructionsLang} class="hidden">
                {getStatusAriaLabel(isValueSet, value)}
            </span>
        </div>
    </div>
</div>
