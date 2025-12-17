<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { createEventDispatcher } from 'svelte';

    export let data = {};

    $: isSelected = data.checked;

    const dispatch = createEventDispatcher();

    const handleChange = (e) => {
        isSelected = e.target.checked;
        dispatch('action', { type: data.actionType || 'select', options: { checked: !data.checked }});
    };
</script>

<style>
    .radio-wrapper {
        --radio-size: 2rem;
        --options-distance: 2rem;
        --radio-button-offset: 0.5rem;

        display: flex;
        justify-content: center;
        align-items: center;

        & .radio {
            &:hover {
                & input:not(:disabled) ~ .radio-button .border {
                    stroke: var(--color-border-actionable-hover);
                }
            }

            & input {
                @add-mixin visually-hidden;
            }

            & .radio-button {
                background-color: white;
                width: var(--radio-size);
                height: var(--radio-size);
                border-radius: 100%;
            }
        }
    }
    :global(.radio-wrapper .radio .radio-label input:focus-visible ~ .radio-button) {
        @add-mixin simple-outline;

        & .border {
            stroke: var(--color-border-actionable-hover);
        }
    }
</style>

<div class="radio-wrapper">
    <div class="radio">
        <label class="radio-label">
            <input
                type="radio"
                name="radioButton"
                value={data.value}
                on:change={handleChange}
            />
            <svg class="radio-button" viewBox="0 0 16 16">
                <title>Radio button</title>
                {#if isSelected}
                    <circle class="radio-check" r="4" cx="8" cy="8" fill="black" />
                {/if}
                <circle class="border" r="7" cx="8" cy="8" fill="none" stroke="black" stroke-width="2" />
            </svg>
        </label>
    </div>
</div>
