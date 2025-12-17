<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import MediaInteractionImpl from './MediaInteractionImpl.svelte';
    import { getItemSettingsStore } from '../../itemsSettingsStore.js';
    import { hasClass } from '../util/attributes.js';
    import { getItemSequentialInteractionsStore } from '../../itemsSequentialInteractionsStore.js';

    export let itemIdentifier;
    export let responseIdentifier;
    export let autostart;
    export let classes = '';

    const isSequential = autostart && hasClass(classes, 'sequential');
    const sequentialInteractionsStore = getItemSequentialInteractionsStore(itemIdentifier);

    if (isSequential) {
        sequentialInteractionsStore.register(responseIdentifier);
    }

    const itemSettingsStore = getItemSettingsStore(itemIdentifier);

    //remount the interaction outside of usual item lifecycle
    let doNotPlayMedia = false;
    $: {
        let newDoNotPlayMedia = !!$itemSettingsStore.doNotPlayMedia;
        if (doNotPlayMedia !== newDoNotPlayMedia) {
            doNotPlayMedia = newDoNotPlayMedia;
        }
    }
</script>

{#key doNotPlayMedia}
    {#if !doNotPlayMedia}
        <MediaInteractionImpl {...$$props} />
    {/if}
{/key}
