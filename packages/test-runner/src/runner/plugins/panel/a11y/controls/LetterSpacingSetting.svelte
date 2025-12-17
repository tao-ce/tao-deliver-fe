<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onDestroy } from 'svelte';
    import settingsKeys from '../../../settings/settingsKeys.js';
    import ControlRow from './generic/ControlRow.svelte';
    import { __ } from '@oat-sa-private/ui-core';

    const dispatch = createEventDispatcher();

    export let areaBroker;
    const targetElt = areaBroker?.getContainer();

    // these values represent the letter-spacing ems
    const min = 0;
    const step = 0.0625; // 1px
    const max = 0.25; // 4px
    let value = 0;

    export let initialState;

    if (initialState?.value) {
        handleLetterSpacingChange({ detail: initialState });
    }
    let nonDefault = initialState?.nonDefault;

    /**
     * Handle the input being changed
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleLetterSpacingChange(event) {
        value = event.detail.value;
        const letterSpacingValue = `${value}em`;

        targetElt?.style.setProperty('--letter-spacing', letterSpacingValue);

        dispatch('change', {
            key: settingsKeys.letterSpacing,
            state: {
                value,
                letterSpacingValue,
                nonDefault: event?.detail?.nonDefault
            }
        });
    }

    onDestroy(() => {
        targetElt?.style.removeProperty('--letter-spacing');
    });
</script>

<ControlRow
    icon="font-spacing-16"
    label={__('Letter spacing')}
    {min}
    {max}
    {step}
    {value}
    {nonDefault}
    ariaLabelDecr={__('decrease letter spacing')}
    ariaLabelIncr={__('increase letter spacing')}
    on:change={handleLetterSpacingChange} />
