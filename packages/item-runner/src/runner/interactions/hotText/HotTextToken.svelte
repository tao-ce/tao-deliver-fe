<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2022 (original work) Open Assessment Technologies SA ;
    /* eslint-disable svelte/valid-compile */ // because of CSS mixin

    import { getContext } from 'svelte';
    import itemSessionStatus from '../../itemSessionStatus.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import { Icon } from '@oat-sa-private/ui-elements';
    import { getActualKey } from '@oat-sa-private/ui-core';
    import ItemBlocks from '../../item/blocks/ItemBlocks.svelte';

    /**
     * The HotTextToken is an individual part of the HotTextInteraction.
     * It gets its props from the ItemBlockTree of the interaction body,
     * and also accesses data through a store, passed by context, to create the binding with
     * the interaction's overall value (a list of selected tokens).
     *
     * @property {String} content - text content of the token
     * @property {String} identifier - internal identifier of the token
     */
    export let content = '';
    export let blockTree;
    export let identifier;

    // disabled state is derived from item session state
    const itemIdentifier = getContext('itemIdentifier');
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    $: disabled = $itemSessionStatusStore === itemSessionStatus.closed;

    //use radio or checkbox inputs
    const isRadio = getContext('isRadio');

    /**
     * Svelte store bound to selected token list of parent interaction
     * @type {Object}
     * $selectedStore value has @type {String[]} - initially []
     *
     * Also has 2 function properties:
     * @property {Function} add - adds identifier to store, returns {Boolean} success
     * @property {Function} delete - removes identifier from store, returns {Boolean} success
     */
    const selectedStore = getContext('selectedStore');

    /**
     * Svelte store to pass data needed for keyboard navigation.
     * Radio arrow-key navigation is controlled by interaction; not relevant for checkboxes
     * $focusStore value has @type { getTabindex: (hottextIdentifier) => String }
     */
    const focusStore = getContext('focusStore');

    let isWithRubyClass = false;
    if (/<ruby>/.test(content)) {
        isWithRubyClass = true;
    }

    let inputElt;
    let checked = false;
    let tabindex = '0';

    $: updateInput($selectedStore);
    $: updateTabindex($focusStore);

    /**
     * Update the DOM element 'checked' property, because the template can only set 'checked' attribute
     */
    function updateElement() {
        if (inputElt) {
            inputElt.checked = checked;
        }
    }

    /**
     * Set the checked state of the checkbox/radio input
     */
    function updateInput() {
        checked = $selectedStore && $selectedStore.has(identifier);
        updateElement();
    }

    /**
     * Set the tabindex of the radio input
     */
    function updateTabindex() {
        tabindex = $focusStore.getTabindex(identifier);
    }

    /**
     * Handle click on checkbox/radio
     */
    function handleClick() {
        checked = !checked;
        updateStore();
        updateElement();
    }

    /**
     * Handle keypress on checkbox/radio
     * @param {KeyboardEvent} e
     */
    function handleKeyUp(e) {
        const key = getActualKey(e);
        if (key === 'enter' || key === 'space') {
            e.preventDefault();
            checked = !checked;
            updateStore();
            updateElement();
        }
    }

    /**
     * Uses selectedStore methods to make interaction modify store value according to constraints
     */
    function updateStore() {
        const success = checked ? selectedStore.add(identifier) : selectedStore.delete(identifier);
        if (!success) {
            checked = !checked; // revert user action because store effect was blocked
        }
    }
</script>

<style>
    .qti-hottext {
        --checkbox-size: 2rem;
        --checkbox-check-size: 1.5rem;
        --radio-size: 2rem;
        --radio-check-size: 1rem;

        cursor: pointer;
        user-select: none;
        position: relative;
        outline: 0;

        & input[type='checkbox'],
        & input[type='radio'] {
            @add-mixin visually-hidden;
        }
    }

    @define-mixin padded-rounded {
        & {
            padding: var(--space-quarter) var(--space-1x);
            margin: 0 var(--space-half);
            border: var(--border-medium) solid var(--color-border-default);
            border-radius: var(--radius-large);
        }
        &.with-ruby {
            padding-top: 1rem;
        }
    }

    @define-mixin states-colors {
        &.selected {
            background: var(--color-bg-actionable);
            border-color: var(--color-bg-actionable);
        }
        &:hover {
            background: var(--color-bg-actionable-hover);
            border-color: var(--color-bg-actionable-hover);
        }
        &.selected,
        &:hover {
            color: var(--color-text-actionable);
        }
        &:focus-within {
            background: var(--color-bg-actionable-hover);
            border-color: var(--color-bg-actionable-hover);
            @add-mixin simple-outline var(--color-border-focus), 0.25rem;
        }
        &:focus-within:not(.selected) {
            background: var(--color-bg-selection);
            &:hover {
                color: var(--color-text-default);
            }
        }
    }

    @define-mixin custom-checkbox {
        /* The empty checkbox */
        &::before {
            content: '';
            display: block;
            position: absolute;
            border: solid var(--border-medium) var(--color-border-default);
            border-radius: var(--radius-medium);
            background-color: var(--color-bg-default);
            width: var(--checkbox-size);
            height: var(--checkbox-size);
            left: 0.625rem;
            top: calc(50% - (var(--checkbox-size) / 2));
        }
        &:hover::before,
        &:focus-within::before {
            border-color: var(--color-bg-actionable-hover);
        }
        &.selected {
            &::before {
                border-color: var(--color-border-actionable);
            }
            &:hover::before,
            &:focus-within::before {
                border-color: var(--color-bg-actionable-hover);
            }
        }
        /* The checkbox check (when hidden) */
        & :global(svg) {
            display: none;
        }
        /* The checkbox check (when shown) */
        & :checked + :global(svg) {
            display: inline;
            position: absolute;
            left: 0.625rem;
            top: calc(50% - (var(--checkbox-check-size) / 2));
            width: var(--checkbox-check-size);
            height: var(--checkbox-check-size);
            color: var(--color-bg-selected);
        }
    }

    @define-mixin custom-radio {
        /* The empty radio */
        &::before {
            content: '';
            display: block;
            position: absolute;
            border: solid var(--border-medium) var(--color-border-default);
            border-radius: var(--radius-circular);
            background-color: var(--color-bg-default);
            width: var(--radio-size);
            height: var(--radio-size);
            left: 0.625rem;
            top: calc(50% - (var(--radio-size) / 2));
        }
        &:hover::before,
        &:focus-within::before {
            border-color: var(--color-bg-actionable-hover);
        }
        &.selected {
            &::before {
                border-color: var(--color-border-actionable);
            }
            &:hover::before,
            &:focus-within::before {
                border-color: var(--color-bg-actionable-hover);
            }
        }
        /* The radio check (when shown) */
        & :checked + :global(span) {
            position: absolute;
            width: var(--radio-check-size);
            height: var(--radio-check-size);
            left: 1.125rem;
            top: calc(50% - (var(--radio-check-size) / 2));
            background-color: var(--color-bg-selected);
            border-radius: var(--radius-circular);
        }
    }

    @define-mixin enlarged-hitbox {
        &::after {
            content: '';
            position: absolute;
            width: 100%;
            min-width: 5.5rem;
            min-height: 5.5rem;
            left: 50%;
            top: 50%;
            transform: translateX(-50%) translateY(-50%);
            opacity: 0;
        }
    }

    /* default variant - with visible checkbox & token styling */
    :global(.tao-control-input-default) .qti-hottext:not(.radio) {
        @add-mixin padded-rounded;
        @add-mixin states-colors;
        @add-mixin custom-checkbox;
        @add-mixin enlarged-hitbox;
        /* to ensure it appears after mixins in compiled CSS: */
        & {
            padding-left: 3.5rem; /* RTL not implemented for checkbox variant */
            white-space: nowrap;
        }
    }

    /* variant with checkbox hidden */
    :global(.qti-control-input-hidden) .qti-hottext {
        @add-mixin padded-rounded;
        @add-mixin states-colors;
        @add-mixin enlarged-hitbox;
        white-space: nowrap;

        & :global(svg) {
            display: none;
        }
    }

    /* variant with checkbox hidden & minimal styling only on hover/focus */
    :global(.tao-control-styling-hidden) .qti-hottext {
        border: var(--border-thin) solid transparent;
        margin: 0;
        padding: 0.25rem 0;
        &.with-ruby {
            padding-top: 1rem;
        }

        &:hover {
            background: var(--color-bg-selection);
            border-color: var(--color-border-focus);
        }
        &:focus-within {
            background: var(--color-bg-selection);
            @add-mixin simple-outline var(--color-border-focus), -0.25rem;
        }
        &.selected {
            background: var(--color-bg-actionable);
            border-color: var(--color-bg-actionable);
            color: var(--color-text-actionable);
            &:hover {
                background: var(--color-bg-actionable-hover);
                border-color: var(--color-bg-actionable-hover);
            }
            &:focus-within {
                background: var(--color-bg-actionable-hover);
                @add-mixin simple-outline var(--color-bg-default), -0.25rem;
            }
        }
        & :global(svg) {
            display: none;
        }
    }

    /* variant with visible radio & token styling */
    :global(.tao-control-input-default) .qti-hottext.radio {
        @add-mixin padded-rounded;
        @add-mixin states-colors;
        @add-mixin custom-radio;
        @add-mixin enlarged-hitbox;
        /* to ensure it appears after mixins in compiled CSS: */
        & {
            padding-left: 3.5rem; /* RTL not implemented for radio variant */
            white-space: nowrap;
        }
    }

    /* Target only firefox to increase space for Hiragana symbols*/
    @media screen and (min--moz-device-pixel-ratio: 0) {
        :global(.tao-control-input-default) .qti-hottext.radio,
        :global(.qti-control-input-hidden) .qti-hottext,
        :global(.tao-control-input-default) .qti-hottext:not(.radio) {
            &.with-ruby {
                padding-top: 1.3rem;
            }
        }
    }
</style>

<label class="qti-hottext" class:selected={checked} class:radio={isRadio} class:with-ruby={isWithRubyClass}>
    {#if isRadio}
        <input
            type="radio"
            value={identifier}
            {checked}
            {tabindex}
            on:click={handleClick}
            on:keyup={handleKeyUp}
            bind:this={inputElt}
            {disabled} />
        <span />
    {:else}
        <input type="checkbox" value={identifier} {checked} on:click={handleClick} on:keyup={handleKeyUp} bind:this={inputElt} {disabled} />
        <Icon name="checkbox-check-16" ariaHidden={true} />
    {/if}
    {#if blockTree}
        <ItemBlocks {blockTree} />
    {:else}
        {content}
    {/if}
</label>
