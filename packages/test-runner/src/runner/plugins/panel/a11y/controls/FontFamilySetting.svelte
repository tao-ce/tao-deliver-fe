<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onDestroy } from 'svelte';
    import settingsKeys from '../../../settings/settingsKeys.js';
    import { __ } from '@oat-sa-private/ui-core';
    import { Dropdown } from '@oat-sa-private/ui-elements';

    const dispatch = createEventDispatcher();

    export let areaBroker;
    const targetElt = areaBroker?.getContainer();

    export let config = { families: ['default'] };

    const fontStacks = {
        default: "'Nunito Sans', 'Source Sans Pro', Arial, sans-serif", // bundled with ui-identity
        courier: 'Courier New, monospace', // considered web-safe
        arial: 'Arial, sans-serif', // considered web-safe
        verdana: 'Verdana, sans-serif', // considered web-safe
        cmuserif: "'CMU Serif Roman', serif", // bundled with ui-identity
        luciole: 'Luciole, Helvetica, Arial, sans-serif' // bundled with ui-identity
    };

    /* can be used in width calculations which are based on the count of letters */
    const letterWidthByFont = {
        //default: instead of 1ch, we decided to use 1rem.
        //See below measurements for the test strings: [[100 numbers | 100 "a" | 100 various-text-characters]]
        default: '0.5em', //1ch=9.6px; [[9.6px|8.5px|6.6px]]
        courier: '1ch', //monospace
        arial: '0.52em', //1ch=8.887px; [[8.9px|8.9px|6.6px]]
        verdana: '0.58em', //1ch=10.162px; [[10.2px|9.6px|7.7px]]
        cmuserif: '0.5em', //1ch=8px; [[8px|8px|6.72px]]
        luciole: '0.57em' //1ch=11.050px; [[9.6px|9.1px|7.6px]]
    };

    const allOptions = [
        {
            key: 'default',
            label: `<span style="font-family: ${fontStacks.default}">${__('Default font')}</span>`
        },
        {
            key: 'courier',
            label: `<span style="font-family: ${fontStacks.courier}">Courier</span>`
        },
        {
            key: 'arial',
            label: `<span style="font-family: ${fontStacks.arial}">Arial</span>`
        },
        {
            key: 'verdana',
            label: `<span style="font-family: ${fontStacks.verdana}">Verdana</span>`
        },
        {
            key: 'cmuserif',
            label: `<span style="font-family: ${fontStacks.cmuserif}">CMU Serif</span>`
        },
        {
            key: 'luciole',
            label: `<span style="font-family: ${fontStacks.luciole}">Luciole</span>`
        }
    ];
    const normalizedOptions = allOptions.filter(opt => config?.families?.includes(opt.key));

    export let initialState;

    let value = normalizedOptions[0].key;
    if (initialState?.value) {
        handleFontChange({ detail: initialState });
    }

    /**
     * Handle the input being changed
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleFontChange(event) {
        value = event.detail.value;
        const defaultValue = 'default';

        if (targetElt) {
            targetElt.dataset.a11yOverrideFontFamily = value !== defaultValue;

            const fontStack = fontStacks[value] || fontStacks[defaultValue];
            targetElt.style.setProperty('--font-ui', fontStack);
            targetElt.style.setProperty('--letter-width', letterWidthByFont[value]);
        }

        dispatch('change', {
            key: settingsKeys.fontFamily,
            state: {
                value,
                nonDefault: value !== normalizedOptions[0].key
            }
        });
    }

    onDestroy(() => {
        delete targetElt?.dataset.a11yOverrideFontFamily;

        targetElt?.style.removeProperty('--font-ui');
        targetElt?.style.removeProperty('--letter-width');
    });
</script>

<style>
    .font-family-setting {
        & :global(.select.lite button) {
            border-bottom: 0;
            padding-inline-start: 0;

            & :global(.icon) {
                inset-inline-end: 0.25rem;
            }
        }
    }
</style>

<div class="font-family-setting" class:changed-control={value !== 'default'}>
    <Dropdown
        options={normalizedOptions}
        visibleOptions={0}
        {value}
        height="small"
        fullwidth
        lite
        reset={false}
        on:change={handleFontChange} />
</div>
