<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import settingsKeys from '../../../settings/settingsKeys.js';
    import { settingsGroupKeys } from '../pluginConfig.js';
    import { createEventDispatcher } from 'svelte';
    import Details from './generic/Details.svelte';
    import CheckMark from '../controls/generic/CheckMark.svelte';
    import FontFamilySetting from '../controls/FontFamilySetting.svelte';
    import FontSizeSetting from '../controls/FontSizeSetting.svelte';
    import LineHeightSetting from '../controls/LineHeightSetting.svelte';
    import LetterSpacingSetting from '../controls/LetterSpacingSetting.svelte';
    import WordSpacingSetting from '../controls/WordSpacingSetting.svelte';
    import LetterAndWordSpacingSetting from '../controls/LetterAndWordSpacingSetting.svelte';
    import { getIsNonDefaultState } from '../util.js';
    import { Icon } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';

    const groupKey = settingsGroupKeys.text;

    const dispatch = createEventDispatcher();

    /**
     * Component of an a11y menu panel group
     * @property {object} areaBroker
     * @property {object} pluginConfig
     * @property {object} initialSettingsState
     * @fires 'change' - corresponding to child controls
     * @fires 'toggle' - corresponding to details container
     */
    export let areaBroker;
    export let pluginConfig;
    export let initialSettingsState;

    const nonDefaultsBySettingsKey = [
        settingsKeys.fontFamily,
        settingsKeys.fontSize,
        settingsKeys.lineHeight,
        settingsKeys.letterSpacing,
        settingsKeys.wordSpacing,
        settingsKeys.letterAndWordSpacing
    ].reduce((acc, key) => {
        acc[key] = getIsNonDefaultState(key, initialSettingsState, pluginConfig);
        return acc;
    }, {});

    $: groupNonDefault = Object.values(nonDefaultsBySettingsKey).some(val => val);

    /**
     * Read and propagate change event
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleChange(event) {
        if (event?.detail?.key in nonDefaultsBySettingsKey) {
            nonDefaultsBySettingsKey[event.detail.key] = event?.detail?.state?.nonDefault;
        }
        dispatch('change', event.detail);
    }
</script>

<Details
    key={groupKey}
    config={pluginConfig[groupKey]}
    collapsed={initialSettingsState[groupKey]?.collapsed}
    outlined={groupNonDefault}
    ariaLabelCollapse={__('collapse text settings')}
    ariaLabelExpand={__('expand text settings')}
    on:toggle>
    <h3 class="ui-heading" slot="summary">
        <Icon name="text-16" ariaHidden />
        {__('Text')}
        {#if groupNonDefault}
            <CheckMark />
        {/if}
    </h3>
    <ul>
        {#if pluginConfig[settingsKeys.fontFamily]?.enabled}
            <li>
                <FontFamilySetting
                    {areaBroker}
                    config={pluginConfig.fontFamily}
                    initialState={initialSettingsState[settingsKeys.fontFamily]?.toolState}
                    on:change={handleChange} />
            </li>
        {/if}
        {#if pluginConfig[settingsKeys.fontSize]?.enabled}
            <li>
                <FontSizeSetting
                    {areaBroker}
                    initialState={initialSettingsState[settingsKeys.fontSize]?.toolState}
                    on:change={handleChange} />
            </li>
        {/if}
        {#if pluginConfig[settingsKeys.lineHeight]?.enabled}
            <li>
                <LineHeightSetting
                    {areaBroker}
                    initialState={initialSettingsState[settingsKeys.lineHeight]?.toolState}
                    on:change={handleChange} />
            </li>
        {/if}
        {#if pluginConfig[settingsKeys.letterSpacing]?.enabled}
            <li>
                <LetterSpacingSetting
                    {areaBroker}
                    initialState={initialSettingsState[settingsKeys.letterSpacing]?.toolState}
                    on:change={handleChange} />
            </li>
        {/if}
        {#if pluginConfig[settingsKeys.wordSpacing]?.enabled}
            <li>
                <WordSpacingSetting
                    {areaBroker}
                    initialState={initialSettingsState[settingsKeys.wordSpacing]?.toolState}
                    on:change={handleChange} />
            </li>
        {/if}
        {#if pluginConfig[settingsKeys.letterAndWordSpacing]?.enabled}
            <li>
                <LetterAndWordSpacingSetting
                    {areaBroker}
                    initialState={initialSettingsState[settingsKeys.letterAndWordSpacing]?.toolState}
                    on:change={handleChange} />
            </li>
        {/if}
    </ul>
</Details>
