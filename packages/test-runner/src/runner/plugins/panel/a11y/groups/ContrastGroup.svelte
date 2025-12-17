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
    import ContrastThemeSetting from '../controls/ContrastThemeSetting.svelte';
    import { getIsNonDefaultState } from '../util.js';
    import { Icon } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';

    const groupKey = settingsGroupKeys.contrast;

    const dispatch = createEventDispatcher();

    /**
     * Component of an a11y menu panel group
     * @property {object} areaBroker
     * @property {object} pluginConfig
     * @property {object} initialSettingsState
     * @fires 'toggle' - corresponding to details container
     * @fires 'change' - corresponding to child controls
     */
    export let areaBroker;
    export let pluginConfig;
    export let initialSettingsState;

    let nonDefault = getIsNonDefaultState(settingsKeys.contrastTheme, initialSettingsState, pluginConfig);

    function handleChange(event) {
        nonDefault = event?.detail?.state?.nonDefault;
        dispatch('change', event.detail);
    }
</script>

<Details
    key={groupKey}
    config={pluginConfig[groupKey]}
    collapsed={initialSettingsState[groupKey]?.collapsed}
    outlined={nonDefault}
    ariaLabelCollapse={__('collapse contrast settings')}
    ariaLabelExpand={__('expand contrast settings')}
    on:toggle>
    <h3 class="ui-heading" slot="summary">
        <Icon name="contrast-16" ariaHidden />
        {__('Contrast')}
        {#if nonDefault}
            <CheckMark />
        {/if}
    </h3>
    {#if pluginConfig[settingsKeys.contrastTheme]?.enabled}
        <ul>
            <li>
                <ContrastThemeSetting
                    {areaBroker}
                    config={pluginConfig[settingsKeys.contrastTheme]}
                    initialState={initialSettingsState[settingsKeys.contrastTheme]?.toolState}
                    on:change={handleChange} />
            </li>
        </ul>
    {/if}
</Details>
