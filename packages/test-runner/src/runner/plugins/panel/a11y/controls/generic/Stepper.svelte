<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { IconBarButton } from '@oat-sa-private/ui-elements';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    /**
     * Numeric input component consisting of decrement/increment buttons
     * for a preset value range.
     *
     * @property {number} value - starting value, usually the min
     * @property {number} min
     * @property {number} max
     * @property {number} step - value added or subtracted with every click
     * @property {string} ariaLabelDecr
     * @property {string} ariaLabelIncr
     * @property {Boolean} disabled
     */
    export let value;
    export let min;
    export let max;
    export let step;
    export let ariaLabelDecr;
    export let ariaLabelIncr;
    export let disabled = false;

    let position;

    /**
     * @fires 'change'
     */
    function handleStepperChange() {
        dispatch('change', {
            value,
            position,
            nonDefault: value !== min
        });
    }

    /**
     * Handle when '-' button is clicked
     * @param {Event} event
     */
    function handleStepperDecr(event) {
        if (value > min) {
            const newValue = value - step;
            value = Math.max(min, newValue);
            position = { x: event.clientX, y: event.clientY };
            handleStepperChange();
        }
    }

    /**
     * Handle when '+' button is clicked
     * @param {Event} event
     */
    function handleStepperIncr(event) {
        if (value < max) {
            const newValue = value + step;
            value = Math.min(max, newValue);
            position = { x: event.clientX, y: event.clientY };
            handleStepperChange();
        }
    }
</script>

<style>
    .stepper {
        white-space: nowrap;
        margin-inline-end: -1.5rem;
        display: flex;
        /* The 2 buttons should appear to render [-][+], but in tab order the [+] should receive focus first */
        flex-direction: row-reverse;
    }
    :global(.inverted .stepper > .actionable.secondary) {
        border-color: transparent;

        &:hover {
            background-color: var(--color-bg-info);
        }
    }
</style>

<span class="stepper" class:changed-control={value !== min}>
    <IconBarButton
        skin="secondary"
        size="base-12"
        icon="plus-16"
        shape="circular"
        visuallyDisabled={value >= max}
        label={ariaLabelIncr}
        ariaLabel={ariaLabelIncr}
        {disabled}
        on:click={handleStepperIncr} />
    <IconBarButton
        skin="secondary"
        size="base-12"
        icon="minus-16"
        shape="circular"
        visuallyDisabled={value <= min}
        label={ariaLabelDecr}
        ariaLabel={ariaLabelDecr}
        {disabled}
        on:click={handleStepperDecr} />
</span>
