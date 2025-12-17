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

    // these values represent the word-spacing ems
    const min = 0;
    const step = 1 / 12;
    const max = 4 / 12;
    let value = 0;

    export let initialState;

    if (initialState?.value) {
        handleWordSpacingChange({ detail: initialState });
    }
    let nonDefault = initialState?.nonDefault;

    /**
     * Handle the input being changed
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleWordSpacingChange(event) {
        value = event.detail.value;
        const wordSpacingValue = `${value}em`;

        targetElt?.style.setProperty('--word-spacing', wordSpacingValue);

        dispatch('change', {
            key: settingsKeys.wordSpacing,
            state: {
                value,
                wordSpacingValue,
                nonDefault: event?.detail?.nonDefault
            }
        });
    }

    onDestroy(() => {
        targetElt?.style.removeProperty('--word-spacing');
    });
</script>

<ControlRow
    icon="font-spacing-16"
    label={__('Word spacing')}
    {min}
    {max}
    {step}
    {value}
    {nonDefault}
    ariaLabelDecr={__('decrease word spacing')}
    ariaLabelIncr={__('increase word spacing')}
    on:change={handleWordSpacingChange} />
