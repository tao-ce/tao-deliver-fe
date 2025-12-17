<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { getActualKey } from '@oat-sa-private/ui-core';

    export let value;
    export let name = 'colour-switcher';
    export let options = [];
    export let defaultOptionKey;

    const dispatch = createEventDispatcher();

    /**
     * @param {Event} event
     * @param {string} optionKey
     */
    function handleChange(event, optionKey) {
        dispatch('change', {
            value: optionKey !== value ? optionKey : defaultOptionKey,
            position: { x: event.clientX, y: event.clientY }
        });
    }

    /**
     * @param {KeyboardEvent} event
     * @param {string} optionKey
     */
    function handleKeyDown(event, optionKey) {
        const pressedKey = getActualKey(event);
        if (
            pressedKey === 'enter' ||
            pressedKey === 'space'
        ) {
            event.preventDefault();
            handleChange(event, optionKey);
        }
    }
</script>

<style>
    .colour-switcher {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        column-gap: 1rem;
        flex-wrap: wrap;

        margin-top: 1rem;
        margin-bottom: 1rem;
    }

    .border-wrapper {
        --option-size: 2rem;
        --option-size-hover: 3rem;

        --option-wrapper-offset: 0.75rem;
        --option-selected-border-size: var(--border-medium);

        --option-wrapper-offset-hover: 0.25rem;
        --option-selected-border-size-hover: var(--border-thick);

        line-height: 0;

        border: var(--option-selected-border-size) solid transparent;
        border-radius: var(--radius-circular);
    }

    .colour-switcher :global(.border-wrapper:has(input:checked)) {
        border-color: var(--color-brand);
    }

    .option {
        width: var(--option-size);
        height: var(--option-size);
        margin: var(--option-wrapper-offset);

        appearance: none;
        border-radius: var(--radius-circular);
        border: var(--border-thin) solid var(--color-gs-dark);

        cursor: pointer;
    }

    .colour-switcher .option:hover,
    .colour-switcher :global(.option:focus-visible) {
        margin: calc(var(--option-wrapper-offset) - (var(--option-size-hover) - var(--option-size)) / 2);
        width: var(--option-size-hover);
        height: var(--option-size-hover);
        border-width: var(--border-medium);
        outline: none;
    }
</style>

<div
    class="colour-switcher"
    role="radiogroup"
>
    {#each options as option}
        {#if option.key !== defaultOptionKey}
            <div class="border-wrapper">
                <input
                    title={option.label}
                    class="option"
                    style="background-color: var({option.colour})"
                    on:click={ event => handleChange(event, option.key)}
                    on:keyup={(event) => handleKeyDown(event, option.key)}
                    type="radio"
                    id={option.key}
                    {name}
                    value={option.key}
                    bind:group={value}
                />
            </div>
        {/if}
    {/each}
</div>