<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2024 (original work) Open Assessment Technologies SA ;

    import { createEventDispatcher, onMount } from 'svelte';
    import { __, getActualKey, generateElementId } from '@oat-sa-private/ui-core';
    import { IconBarButton } from '@oat-sa-private/ui-elements';
    import { FloatingBar } from '@oat-sa-private/ui-components';
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { actionKeys } from './readAloudActionKeys.js';
    import ReadAloudSettingsDrawer from './ReadAloudSettingsDrawer.svelte';

    /**
     * Component is used to show readAloud toolbar. Should be mounted in floating toolbar container.
     * Button states should be managed by consumer.
     * @property {String} serviceCallId
     * @property {Boolean} playSelectionToggled - playSelection button toggled on
     * @property {Boolean} playSelectionPlaying - playSelection button in playing state
     * @property {Boolean} playAllPlaying - playAll button in playing state
     * @property {Object} readAloudSettings - prop for ReadAloudSettingsDrawer
     * @property {Boolean} disabled - buttons attribute
     * @property {Boolean} autofocus - focus first button on open
     * @fires 'action'
     * @fires 'close'
     */
    export let serviceCallId;
    export let clickToSpeakEnable = false;
    export let playOnClickToggled = false;
    export let playOnClickPlaying = false;
    export let playSelectionToggled = false;
    export let playSelectionPlaying = false;
    export let playAllPlaying = false;
    export let readAloudSettings = {};
    export let disabled = false;
    export let autofocus = false;

    const dispatch = createEventDispatcher();
    const statusStore = getTestSessionStatusStore(serviceCallId);
    const ariaDescribedByIdSelection = generateElementId('ra-sel');
    const ariaDescribedByIdPlay = generateElementId('ra-play');

    let actionsElement;

    /**
     * Keydown handler
     * @param {KeyboardEvent} e event
     */
    function handleKeyDown(e) {
        const pressedKey = getActualKey(e);
        switch (pressedKey) {
            case 'esc': {
                dispatch('close');
                break;
            }
        }
    }

    /**
     * Action button click handler
     * @param {String} key
     */
    function handleActionClick(key) {
        dispatch('action', { key });
    }

    /**
     * Get list of buttons
     * @returns {Array<HTMLElement}
     */
    function getFocusableElements() {
        return Array.from(actionsElement.querySelectorAll('.icon-bar-btn'));
    }

    onMount(() => {
        if (autofocus && actionsElement) {
            getFocusableElements()[0].focus();
        }
    });
</script>

<style>
    .readAloud-bar {
        & .footer {
            & .instruction {
                min-height: 3.25rem;
                max-width: 30rem;
                padding: 0 1.5rem;
                margin: 0;
                font-size: var(--fontsize-body-xs);
            }
        }
    }
</style>

<div
    class="readAloud-bar"
    class:has-footer={playSelectionToggled || playOnClickToggled || readAloudSettings.open}
    class:hidden={$statusStore === testSessionStatus.overlay}
    on:keydown={handleKeyDown}
    on:click|stopPropagation
>
    <FloatingBar title={__('read aloud')}>
        <!-- first slot -->
        <div class="actions do-not-read" bind:this={actionsElement}>
            <IconBarButton
                label={__('Continuous reading')}
                icon={playAllPlaying ? 'stop-16' : 'play-16'}
                shape="circular"
                toggled={playAllPlaying}
                ariaPressed={playAllPlaying}
                ariaDescribedBy={ariaDescribedByIdPlay}
                dataTestId="readaloud-play"
                {disabled}
                on:click={() => handleActionClick(actionKeys.playAll)}
            />
            {#if clickToSpeakEnable}
                <IconBarButton
                    label={__('Click to read')}
                    icon={playOnClickPlaying ? 'stop-16' : 'play-on-click-16'}
                    shape="circular"
                    toggled={playOnClickToggled}
                    ariaPressed={playOnClickToggled}
                    ariaDescribedBy={ariaDescribedByIdSelection}
                    dataTestId="readaloud-play-on-click"
                    {disabled}
                    on:click={() => handleActionClick(actionKeys.playOnClick)}
                />
            {:else}
                <IconBarButton
                    label={__('Select and read')}
                    icon={playSelectionPlaying ? 'stop-16' : 'play-from-16'}
                    shape="circular"
                    toggled={playSelectionToggled}
                    ariaPressed={playSelectionToggled}
                    ariaDescribedBy={ariaDescribedByIdSelection}
                    dataTestId="readaloud-play-selection"
                    {disabled}
                    on:click={() => handleActionClick(actionKeys.playSelection)}
                />
            {/if}
            <IconBarButton
                label={__('ReadAloud settings')}
                icon="cogwheel-16"
                shape="circular"
                toggled={readAloudSettings.open}
                ariaPressed={readAloudSettings.open}
                dataTestId="readaloud-settings"
                {disabled}
                on:click={() => handleActionClick(actionKeys.settings)}
            />
        </div>
        <!-- second slot -->
        <div class="footer" slot="footer">
            {#if !disabled && playSelectionToggled}
                <p class="instruction">{__('Select text to read aloud')}</p>
            {/if}
            {#if !disabled && clickToSpeakEnable && playOnClickToggled}
                <p class="instruction">{__('Click on any text to read aloud')}</p>
            {/if}
            {#if readAloudSettings.open}
                <ReadAloudSettingsDrawer {readAloudSettings} {disabled} on:change />
            {/if}
        </div>
    </FloatingBar>
    <!-- hidden ARIA elements: -->
    <div id={ariaDescribedByIdSelection} class="hidden">
        {__(
            'Press enter or space to activate select and read. To move the next available action, use the arrow keys. To close press escape.'
        )}
    </div>
    <div id={ariaDescribedByIdPlay} class="hidden">
        {__(
            'Press enter or space to activate continuous reading. If activated press enter or space to stop the reading.'
        )}
    </div>
</div>
