<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { themeHandler as themeHandlerFactory } from '@oat-sa-private/ui-core';
    import ColourSwitcher from './generic/ColourSwitcher.svelte';
    // Constants
    import settingsKeys from '../../../settings/settingsKeys.js';
    import { defaultThemeKey, themeLabels, themeColours } from './contrastThemeConstants';

    export let areaBroker;
    const dispatch = createEventDispatcher();

    export let config = { themes: [] }; // keys of enabled themes
    let themes = config.themes;
    if (!themes.includes(defaultThemeKey)) {
        themes = [defaultThemeKey, ...themes];
    }

    // TODO: load CSS in this component rather than passing 'stylesheet' to themeHandler?
    // because 'stylesheet' path depends on rollup-plugin-copy to move files into place
    const normalizedThemes = Object.keys(themeLabels)
        .filter(key => themes.includes(key))
        .map(key => ({
            // properties for Dropdown
            key,
            label: themeLabels[key],
            colour: themeColours[key],
            // properties for themeHandler
            id: key,
            stylesheet: key === defaultThemeKey ? null : `themes/${key}.css`,
        }));

    const themeHandler = themeHandlerFactory(normalizedThemes, {
        /**
         * @type {HTMLElement} themeScope - the one element to which the root data-theme attribute will be set.
         * If some child areas should be unthemed, they should be rendered with data-theme="default"
         * to stop the root theme cascading into them.
         */
        themeScope: areaBroker?.getContainer()
    });
    themeHandler.load();

    /**
     * @property {object} initialState
     */
    export let initialState;

    let value = null;
    if (initialState?.value) {
        handleThemeChange({ detail: initialState.value });
    }

    /**
     * Trigger theme change
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleThemeChange(event) {
        value = event.detail;
        themeHandler.activate(value.value);

        dispatch('change', {
            key: settingsKeys.contrastTheme,
            state: {
                value,
                nonDefault: value.value !== defaultThemeKey
            }
        });
    }

    onDestroy(() => {
        themeHandler.destroy();
    });
</script>

<style>
    @import "../themes/themeColours.css";

    .contrast-theme-setting {
        & :global(.select .preview) {
            display: inline-block;
            width: 100%;
            background: var(--color-bg-default, white);
            color: var(--color-text-default, black);
        }
        & :global(.select .listbox .option) {
            padding: 0;
        }
        & :global(.select.lite button) {
            border-bottom: 0;
        }
        & :global(.colour-switcher) {
            margin-left: -1rem;
            margin-right: -1rem;
        }
    }
</style>

<div class="contrast-theme-setting" class:changed-control={value?.value !== 'default'}>
    <ColourSwitcher
        value={value?.value}
        options={normalizedThemes}
        defaultOptionKey={defaultThemeKey}
        on:change={handleThemeChange}
        name="contrast-theme-picker"
    />
</div>
