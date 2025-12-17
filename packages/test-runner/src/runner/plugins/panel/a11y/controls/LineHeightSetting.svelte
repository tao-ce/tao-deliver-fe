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

    // stepper props
    // these values represent multipliers for the default line-heights
    const min = 1.5;
    const options = [1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2, 2.3, 2.4, 2.5];
    let value = 1.5;

    // from LDS styles
    const lineHeightBodyDefault = 1.5;
    const lineHeightHeadingDefault = 1.2;

    export let initialState;

    if (initialState?.value) {
        handleLineHeightChange({ detail: initialState });
    }
    let nonDefault = initialState?.nonDefault;

    /**
     * Handle the input being changed
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleLineHeightChange(event) {
        value = event.detail.value;
        const lineHeightMultiplier = value / min;
        const lineHeightBodyOperationValue = lineHeightBodyDefault * lineHeightMultiplier;
        const lineHeightBodyValue = parseFloat(lineHeightBodyOperationValue.toFixed(1));
        const lineHeightHeadingValue = lineHeightHeadingDefault * lineHeightMultiplier;
        targetElt?.style.setProperty('--line-height-default', lineHeightBodyValue);
        targetElt?.style.setProperty('--line-height-heading', lineHeightHeadingValue);

        dispatch('change', {
            key: settingsKeys.lineHeight,
            state: {
                value,
                lineHeightBodyValue,
                nonDefault: event?.detail?.nonDefault
            }
        });
    }

    onDestroy(() => {
        targetElt?.style.removeProperty('--line-height-default');
        targetElt?.style.removeProperty('--line-height-heading');
    });
</script>

<ControlRow
    icon="font-line-height-16"
    label={__('Line height')}
    {options}
    {value}
    {nonDefault}
    ariaLabelDecr={__('decrease line height')}
    ariaLabelIncr={__('increase line height')}
    on:change={handleLineHeightChange} />
