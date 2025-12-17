<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { Button } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';
    import CustomInteractionDefault from './CustomInteractionDefault.svelte';
    import { hasClass } from '../../util/attributes.js';
    import { getItemSequentialInteractionsStore } from '../../../itemsSequentialInteractionsStore.js';
    import { fade } from 'svelte/transition';

    const dispatch = createEventDispatcher();

    // only accessed props are detailed here; all others are passed through as $$props
    export let itemIdentifier;
    export let responseIdentifier;
    export let classes = '';
    export let properties = {};

    export let isInitialMount = true;
    export let doNotPlayMedia = false;

    // pass-through props
    export let handleState;
    export let handleResponse;
    export let getInitialState;
    export let getInitialResponse;
    export let doInitialStateUpdate;

    //Do not mutate original (needed when DoNotPlayMediaHandler is used by parent)
    //  and explicitly pass this new value to CustomInteractionDefault, not inside $$props
    properties = Object.assign({}, properties);

    /**
     * Main code runs BEFORE CustomInteractionDefault's main code
     */

    const isReviewMode = !!properties?.isReviewMode;
    const isSequential = hasClass(classes, 'sequential') && !isReviewMode;
    const autostart = properties.autoStart === 'true' || properties.autoStart === true;
    const autoPlayback = properties.autoPlayback === 'true' || properties.autoPlayback === true;
    const pciEndEvent = autoPlayback ? 'playback-end' : 'recorder-stop';

    /** @type {HTMLElement} reference to PCI container - can also be bound to from parent */
    export let container;

    let canAutostart = !doNotPlayMedia;
    let didMount = false;

    // Make PCI respond to some events (config-change) for autostart
    // and emit some events (recorder-start, recorder-stop)
    // for integration with this interaction handler.
    properties.enableDomEvents = true;

    if (isSequential || !canAutostart) {
        // If the PCI was authored with autoStart, turn it off for now (use event instead)
        if (autostart) {
            properties.autoStart = false;
        }
    }

    /**
     * Get if the PCI is marked as internally disabled
     * @returns {Boolean}
     */
    function isPciDisabled() {
        return container.querySelector('.audio-rec')?.dataset.disabled === 'true';
    }

    // sequential logic follows

    const sequentialInteractionsStore = getItemSequentialInteractionsStore(itemIdentifier);

    /** @type {import('svelte/store').Writable<string>} */
    let currentResponseIdentifier;

    if (isSequential) {
        currentResponseIdentifier = sequentialInteractionsStore.currentResponseIdentifier;
    }

    /**
     * Inform sequence this interaction finished
     */
    function finishInSequence() {
        sequentialInteractionsStore.finish(responseIdentifier);
    }

    $: isCurrentInSequence = isSequential && $currentResponseIdentifier === responseIdentifier;

    /**
     * Handle ths interaction in a sequence: trigger its autostart if needed
     */
    function checkSequentialAutostartPreconditions() {
        if (didMount && isCurrentInSequence) {
            // perform checks needed to skip or play interaction
            if (isPciDisabled()) {
                finishInSequence();
            } else if (sequentialInteractionsStore.didStart || canAutostart) {
                properties.autoStart = autostart;
                container.dispatchEvent(new CustomEvent('config-change', { detail: properties }));
                sequentialInteractionsStore.didStart = true;
            }
        }
    }

    function setCanAutostart() {
        //only one transition from do-not-play to do-play is supported.
        // In other cases wrapper component should destroy+recreate interaction (because PCI doesn't implement pausing the recording)
        if (!doNotPlayMedia) {
            if (isSequential) {
                canAutostart = sequentialInteractionsStore.completedTimes === 0;
            } else {
                if (didMount) {
                    canAutostart = true;
                    properties.autoStart = autostart;
                    container.dispatchEvent(new CustomEvent('config-change', { detail: properties }));
                }
            }
        }
    }

    //must be called before checkSequentialAutostartPreconditions
    $: setCanAutostart(didMount, doNotPlayMedia);
    // runs after each sequential start()/finish() call
    $: checkSequentialAutostartPreconditions(didMount, isCurrentInSequence, canAutostart);

    function handleInteractButton() {
        canAutostart = true;
    }

    /**
     * Called AFTER CustomInteractionDefault's onMount
     * Therefore `container` is already bound
     */
    onMount(() => {
        if (isSequential && container) {
            container.addEventListener(pciEndEvent, finishInSequence);
        }
        didMount = true;
        dispatch('mount');
    });

    /**
     * Called BEFORE CustomInteractionDefault's onDestroy
     */
    onDestroy(() => {
        if (isSequential && container) {
            container.removeEventListener(pciEndEvent, finishInSequence);
        }
    });
</script>

<style>
    .interact-button-container {
        display: flex;
        justify-content: center;
    }
    /* match or override specificity within PCI: */
    :global(.qti-customInteraction .audioRecordingInteraction.audioRecordingInteraction) {
        --color-enabled-bg: var(--color-bg-actionable);
        --color-enabled-txt: var(--color-text-actionable);

        --color-active-bg: var(--color-bg-actionable-hover);
        --color-active-txt: var(--color-text-actionable);
        --color-active-txt-shadow: transparent;

        --color-playback: var(--color-bg-actionable);
        --color-playback-lighter: var(--color-brand-light);
    }
</style>

{#if isCurrentInSequence && !(sequentialInteractionsStore.didStart || canAutostart)}
    <div class="interact-button-container" in:fade={{ delay: 100, duration: 1 }}>
        <!-- fade delay prevents brief show-hide blink -->
        <Button
            label={__('Click to record')}
            skin="secondary"
            shape="pill"
            size="small"
            icon="play-16"
            data-test-id="media-interact"
            on:click={handleInteractButton}
        />
    </div>
{/if}

<CustomInteractionDefault
    {...$$restProps}
    {properties}
    {classes}
    {responseIdentifier}
    {itemIdentifier}
    {isInitialMount}
    {handleState}
    {handleResponse}
    {getInitialState}
    {getInitialResponse}
    {doInitialStateUpdate}
    bind:container
/>
