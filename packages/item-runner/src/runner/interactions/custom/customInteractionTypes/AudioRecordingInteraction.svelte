<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { tick } from 'svelte';
    import AudioRecordingInteractionImpl from './AudioRecordingInteractionImpl.svelte';
    import AudioRecordingUploader from './AudioRecordingUploader.svelte';
    import { getItemSettingsStore } from '../../../itemsSettingsStore.js';
    import { getItemSequentialInteractionsStore } from '../../../itemsSequentialInteractionsStore.js';
    import { hasClass } from '../../util/attributes.js';
    import { semverCompare } from 'taoDeliverAppsCommon/util/semver.js';

    export let itemIdentifier;
    export let properties;
    export let classes = '';
    export let responseIdentifier;
    export let version;

    // may be turned on by itemRunnerConfig propertyOverride:
    export let useUploader = false;

    const isReviewMode = !!properties?.isReviewMode;
    const supportsUploader = semverCompare(version, '1.3.0') >= 0;
    const isSequential = hasClass(classes, 'sequential') && !isReviewMode;
    const sequentialInteractionsStore = getItemSequentialInteractionsStore(itemIdentifier);

    if (isSequential) {
        sequentialInteractionsStore.register(responseIdentifier);
    }

    const itemSettingsStore = getItemSettingsStore(itemIdentifier);

    //Remount the interaction outside of usual item lifecycle.
    //On initial Item mount, always render to allow normal ui flow with registerLoadingElement in CustomInteractionDefault,
    // but do not autostart the recording
    let isInitialMount = true;
    let doNotPlayMedia = !!$itemSettingsStore.doNotPlayMedia; //skip one change

    $: {
        let newDoNotPlayMedia = !!$itemSettingsStore.doNotPlayMedia;
        if (doNotPlayMedia !== newDoNotPlayMedia) {
            tick().then(() => {
                //tick: because Item will trigger 'stateupdate', let's ensure that PCI is destroyed only after that
                doNotPlayMedia = newDoNotPlayMedia;
                isInitialMount = false;
            });
        }
    }
</script>

<style>
    .audio-recording-wrapper {
        height: 100px;
    }
</style>

<div class="audio-recording-wrapper">
    {#if (useUploader || isReviewMode) && supportsUploader}
        <!-- uploader part should stay mounted, even if doNotPlayMedia becomes set -->
        <AudioRecordingUploader
            {...$$restProps}
            {itemIdentifier}
            {responseIdentifier}
            {properties}
            {classes}
            {isInitialMount}
            {doNotPlayMedia} />
    {:else}
        {#key doNotPlayMedia && !isInitialMount}
            {#if !doNotPlayMedia || isInitialMount}
                <AudioRecordingInteractionImpl
                    {...$$restProps}
                    {itemIdentifier}
                    {responseIdentifier}
                    {properties}
                    {classes}
                    {isInitialMount}
                    {doNotPlayMedia} />
            {/if}
        {/key}
    {/if}
</div>
