<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let config;
    export let initialState;
    export let areaBroker;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class={initialState?.mockSettingKey || 'mock-setting'}
    on:click={() =>
        dispatch('change', {
            key: initialState?.mockSettingKey || 'mock-setting',
            state: {
                foo: 'bar',
                nonDefault: true
            }
        })}
    data-areaBroker={JSON.stringify(areaBroker)}
    data-initialState={JSON.stringify(initialState || {})}
    data-config={JSON.stringify(config)}>
    {initialState?.mockSettingKey || 'mock-setting'}
</div>
