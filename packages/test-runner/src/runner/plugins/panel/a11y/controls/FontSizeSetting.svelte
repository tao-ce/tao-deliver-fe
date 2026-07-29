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
    const min = 0;
    const step = 1;
    const max = 2;
    let value = 0;

    const normalFontSizeValues = [1.5, 1.75, 2, 2, 2.5, 3.75, 5]; // default font-sizes (rem)
    const fontSizesMap = [
        {
            name: 'normal',
            values: normalFontSizeValues
        },
        {
            name: 'large',
            values: normalFontSizeValues.map(size => size * 1.25)
        },
        {
            name: 'extraLarge',
            values: normalFontSizeValues.map(size => size * 1.5)
        }
    ];
    const defaultValue = 0;

    export let initialState;

    if (initialState?.value) {
        handleFontSizeChange({ detail: initialState });
    }
    let nonDefault = initialState?.nonDefault;

    /**
     * Handle the input being changed
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleFontSizeChange(event) {
        value = event.detail.value;
        const { name, values } = fontSizesMap[value] || fontSizesMap[defaultValue];

        if (targetElt) {
            targetElt.dataset.a11yOverrideFontSize = value !== defaultValue;

            targetElt.style.setProperty('--fontsize-body-xs', `${values[0]}rem`);
            targetElt.style.setProperty('--fontsize-body-s', `${values[1]}rem`);
            targetElt.style.setProperty('--fontsize-body', `${values[2]}rem`);
            targetElt.style.setProperty('--fontsize-heading', `${values[3]}rem`);
            targetElt.style.setProperty('--fontsize-heading-l', `${values[4]}rem`);
            targetElt.style.setProperty('--fontsize-heading-xl', `${values[5]}rem`);
            targetElt.style.setProperty('--fontsize-heading-xxl', `${values[6]}rem`);

            const fontSizeScale = values[2] / fontSizesMap[defaultValue].values[2];
            targetElt.style.setProperty('--a11y-fontsize-scale', fontSizeScale);
        }

        dispatch('change', {
            key: settingsKeys.fontSize,
            state: {
                value,
                fontSizeBody: `${values[2]}rem`,
                fontSizeDescriptor: name,
                nonDefault: event?.detail?.nonDefault
            }
        });
    }

    onDestroy(() => {
        delete targetElt?.dataset.a11yOverrideFontSize;

        targetElt?.style.removeProperty('--fontsize-body-xs');
        targetElt?.style.removeProperty('--fontsize-body-s');
        targetElt?.style.removeProperty('--fontsize-body');
        targetElt?.style.removeProperty('--fontsize-heading');
        targetElt?.style.removeProperty('--fontsize-heading-l');
        targetElt?.style.removeProperty('--fontsize-heading-xl');
        targetElt?.style.removeProperty('--fontsize-heading-xxl');

        targetElt?.style.removeProperty('--a11y-fontsize-scale');
    });
</script>

<ControlRow
    icon="font-size-16"
    label={__('Size')}
    {min}
    {max}
    {step}
    {value}
    {nonDefault}
    ariaLabelDecr={__('decrease font size')}
    ariaLabelIncr={__('increase font size')}
    on:change={handleFontSizeChange} />
