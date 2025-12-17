<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;

    import { createEventDispatcher } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import { RadioGroup } from '@oat-sa-private/ui-elements';
    import StepperArray from '../../panel/a11y/controls/generic/StepperArray.svelte';
    import settingsKeys from '../../settings/settingsKeys.js';
    import { pitches, speeds, voices } from '@oat-sa-private/read-aloud-client/lib/preferences.js';

    const dispatch = createEventDispatcher();

    /**
     * The UI component of the ReadAloud settings drawer
     *
     * @property {Boolean} disabled
     * @property {Object} readAloudSettings
     * @property {Object} [readAloudSettings.constraints] - details of supported features, from provider
     * @property {Object} [readAloudSettings.constraints.voice]
     * @property {Object} [readAloudSettings.constraints.speed]
     * @property {Object} [readAloudSettings.constraints.pitch]
     * @property {Object} [readAloudSettings.toolState] - state created by user
     * @property {string} [readAloudSettings.toolState.voice]
     * @property {string} [readAloudSettings.toolState.speed]
     * @property {string} [readAloudSettings.toolState.pitch]
     */
    export let disabled = false;
    export let readAloudSettings = {};

    const voiceOptions = {
        [voices.male]: __('Male'),
        [voices.female]: __('Female')
    };

    /**
     * Voice speed options packed to apply constraints later
     */
    const allSpeedOptions = new Map([
        [speeds.slowest, __('slow')],
        [speeds.slow, __('medium slow')],
        [speeds.normal, __('default')],
        [speeds.fast, __('medium fast')],
        [speeds.fastest, __('fast')]
    ]);
    const allSpeedKeys = Array.from(allSpeedOptions.keys());
    const speedKeys = readAloudSettings.constraints?.speed?.options
        ? allSpeedKeys.filter(option => readAloudSettings.constraints.speed.options.includes(option))
        : allSpeedKeys;

    /**
     * Voice pitch options packed to apply constraints later
     */
    const allPitchOptions = new Map([
        [pitches.lowest, __('low')],
        [pitches.medium, __('medium')],
        [pitches.highest, __('high')]
    ]);
    const allPitchKeys = Array.from(allPitchOptions.keys());
    const pitchKeys = readAloudSettings.constraints?.pitch?.options
        ? allPitchKeys.filter(option => readAloudSettings.constraints.pitch.options.includes(option))
        : allPitchKeys;

    // Initial values
    let voiceValue = readAloudSettings.toolState?.[settingsKeys.readAloudVoice] || voices.female;
    let speedValue = readAloudSettings.toolState?.[settingsKeys.readAloudSpeed] || speeds.normal;
    let pitchValue = readAloudSettings.toolState?.[settingsKeys.readAloudPitch] || pitches.medium;

    /**
     * Handle when user changed voice gender
     * @param {CustomEvent} e
     */
    function handleVoiceChange(e) {
        dispatch('change', {
            key: settingsKeys.readAloudVoice,
            value: e.detail?.value
        });
    }

    /**
     * Handle when user changed speed
     * @param {CustomEvent} e
     */
    function handleSpeedChange(e) {
        dispatch('change', {
            key: settingsKeys.readAloudSpeed,
            value: e.detail?.value
        });
    }

    /**
     * Handle when user changed pitch
     * @param {CustomEvent} e
     */
    function handlePitchChange(e) {
        dispatch('change', {
            key: settingsKeys.readAloudPitch,
            value: e.detail?.value
        });
    }
</script>

<style>
    .read-aloud-settings-drawer {
        --floating-bar-height: 5rem;

        padding-block-end: 0.25rem;
        padding-inline-start: 1.25rem;
        padding-inline-end: 1.75rem;
        margin: 0 0.25rem 0.25rem;
        background: var(--color-bg-inverted-secondary);
        border-bottom-left-radius: calc(var(--floating-bar-height) / 2);
        border-bottom-right-radius: calc(var(--floating-bar-height) / 2);

        & .control-row {
            display: flex;
            justify-content: space-between;
            align-items: center;

            & label {
                height: 5rem;
                display: flex;
                align-items: center;
                font-size: var(--fontsize-body-s);
            }
            & :global-nested(.radio-group) {
                font-size: var(--fontsize-body-xs);

                & .radio {
                    margin-bottom: 0.25rem;

                    &:last-child {
                        margin-inline-end: 0;
                    }
                }
            }
            & :global-nested(.icon-bar-btn) {
                background: inherit;

                &:hover,
                &:focus-visible {
                    background: var(--color-bg-inverted-secondary-hover);
                }
            }
        }
    }
</style>

<div class="read-aloud-settings-drawer">
    {#if !readAloudSettings.constraints?.voice?.disabled}
        <div class="control-row">
            <label for="voice">{__('Voice')}</label>
            <RadioGroup
                name="voice"
                value={voiceValue}
                options={voiceOptions}
                layout="grid"
                {disabled}
                on:change={handleVoiceChange}
            />
        </div>
    {/if}
    {#if !readAloudSettings.constraints?.speed?.disabled}
        <div class="control-row">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label>{__('Speed')}</label>
            <StepperArray
                options={speedKeys}
                value={speedValue}
                ariaLabelDecr={__('decrease reading speed')}
                ariaLabelIncr={__('increase reading speed')}
                {disabled}
                on:change={handleSpeedChange}
            />
        </div>
    {/if}
    {#if !readAloudSettings.constraints?.pitch?.disabled}
        <div class="control-row">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label>{__('Pitch')}</label>
            <StepperArray
                options={pitchKeys}
                value={pitchValue}
                ariaLabelDecr={__('decrease reading pitch')}
                ariaLabelIncr={__('increase reading pitch')}
                {disabled}
                on:change={handlePitchChange}
            />
        </div>
    {/if}
</div>
