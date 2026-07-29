<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { Icon } from '@oat-sa-private/ui-elements';
    import CheckMark from './CheckMark.svelte';
    import Stepper from './Stepper.svelte';
    import StepperArray from "./StepperArray.svelte";

    const dispatch = createEventDispatcher();

    /**
     * @property {string} icon - optional
     * @property {string} label
     */
    export let icon;
    export let label;

    // stepper props
    export let min = 0;
    export let step = 1;
    export let max = 10;
    export let value = 0;
    export let ariaLabelDecr;
    export let ariaLabelIncr;
    export let options = [];

    export let nonDefault = false;

    /**
     * Read and propagate Stepper change event
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleChange(event) {
        nonDefault = event.detail.nonDefault;

        dispatch('change', event.detail);
    }
</script>

<style>
    .control-row {
        display: flex;
        justify-content: flex-between;
        align-items: center;

        &.non-default {
            color: var(--color-brand);
        }
        & > :global(.icon) {
            margin-inline-end: 1rem;
        }
        & label {
            font-size: var(--fontsize-body-s);
            flex-grow: 1;
        }
    }
</style>

<span class="control-row" class:non-default={nonDefault}>
    {#if icon}
        <Icon name={icon} ariaHidden />
    {/if}
    <label>
        {label || ''}
        {#if nonDefault}
            <CheckMark />
        {/if}
    </label>
    {#if options.length === 0}
        <Stepper {min} {max} {step} {value} {ariaLabelDecr} {ariaLabelIncr} on:change={handleChange} />
    {:else}
        <StepperArray {options} {value} {ariaLabelDecr} {ariaLabelIncr} on:change={handleChange} />
    {/if}
</span>
