<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-21 (original work) Open Assessment Technologies SA ;
    import { getContext, onDestroy } from 'svelte';
    import { htmlAttributes } from './util/attributes.js';
    import { withUnit } from '../util/size.js';
    import { getItemStateStore } from '../itemsStateStore.js';
    import { throttle } from 'lodash';
    import { getItemSessionStatusStore } from '../itemsSessionStatusStore.js';
    import { getItemSettingsStore } from '../itemsSettingsStore.js';
    import { getLanguageDirection } from '@oat-sa-private/ui-core';
    import LoggingPlayer from '../interactions/media/LoggingPlayer.svelte';
    import itemSessionStatus from '../itemSessionStatus';

    export let itemIdentifier;
    export let attributes = {};

    const itemContext = getContext(itemIdentifier);
    const instructionsLang = itemContext && itemContext.getInstructionsLang();
    const instructionsDir = instructionsLang ? getLanguageDirection(instructionsLang) : void 0;
    const assetManager = itemContext && itemContext.getAssetManager();
    const itemStateStore = getItemStateStore(itemIdentifier);
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);
    const itemSettingsStore = getItemSettingsStore(itemIdentifier);
    const throttledStoreProgress = throttle(storeProgress, 400);

    let src = assetManager ? assetManager.resolve(attributes.src) : attributes.src;
    let type = attributes.type || 'audio/*';
    let width = withUnit(attributes.width) || '100%';
    let classes = attributes.class || '';
    let startTime = 0;
    let currentTime = 0;
    let isDestroyed = false;
    let interactionElement;
    const staticElementId = `static_audio_${attributes.serial}`;
    const getInteractionElement = () => interactionElement;

    loadProgress();

    let disabledBySession = false;
    $: {
        let newDisabledBySession =
            $itemSessionStatusStore === itemSessionStatus.suspended ||
            $itemSessionStatusStore === itemSessionStatus.closed ||
            !!$itemSettingsStore.doNotPlayMedia;
        if (disabledBySession !== newDisabledBySession) {
            disabledBySession = newDisabledBySession;
        }
    }

    /**
     * Restore progress from store
     */
    function loadProgress() {
        if (attributes.serial) {
            const elementState = itemStateStore.getItemElementState(staticElementId);
            if (elementState && elementState.time) {
                startTime = elementState.time;
            }
        }
    }

    /**
     * Save progress in store
     */
    function storeProgress() {
        if (attributes.serial && !isDestroyed) {
            itemStateStore.setItemElementState(staticElementId, { time: currentTime });
        }
    }

    /**
     * Handle player time update
     * @param {CustomEvent} e
     */
    function handleTimeUpdate(e) {
        currentTime = e.detail;
        throttledStoreProgress();
    }

    onDestroy(() => {
        isDestroyed = true;
    });
</script>

<div bind:this={interactionElement} class="qti-audio-container not-printable {classes}" {...htmlAttributes(attributes, ['class'])}>
    <LoggingPlayer
        {src}
        {type}
        {width}
        {startTime}
        disabled={disabledBySession}
        feedbackLang={instructionsLang}
        dir={instructionsDir}
        on:timeupdate={handleTimeUpdate}
        {getInteractionElement}
        {staticElementId} />
</div>
