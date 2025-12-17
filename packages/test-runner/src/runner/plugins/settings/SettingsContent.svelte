<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;

    import { __, generateElementId } from '@oat-sa-private/ui-core';
    import { Switch } from '@oat-sa-private/ui-elements';
    import settingsKeys from './settingsKeys.js';
    import { createEventDispatcher } from 'svelte';
    import { getTestSessionUserDataService } from '../../session/testSessionUserDataService.js';

    /**
     * The settings panel
     * @property {string} serviceCallId - id of test session
     * @fires 'change' when settings get update
     */
    export let serviceCallId;

    const dispatch = createEventDispatcher();
    const captionIds = {
        [settingsKeys.choiceElimination]: generateElementId(`caption-${settingsKeys.choiceElimination}`),
        [settingsKeys.choiceAnswerMasking]: generateElementId(`caption-${settingsKeys.choiceAnswerMasking}`)
    };
    const settingsStore = getTestSessionUserDataService(serviceCallId).getSettingsStore();
    const settings = settingsStore.get();

    /**
     * Setting groups
     */
    const groups = {
        general: 'general'
    };

    /**
     * Settings list by group
     */
    const settingGroups = {
        [groups.general]: [settingsKeys.choiceElimination, settingsKeys.choiceAnswerMasking]
    };

    /**
     * Dispatch any settings changes outside
     * @param {string} key - key of setting from settingsKeys
     * @param {*} value - value of setting
     */
    function handleChange(key, value) {
        /**
         * @event SettingsContent#change
         * @param {string} key - the key of the changed setting
         * @param {string} value - the updated value
         */
        dispatch('change', { key, value });
    }

    /**
     * Checks whether setting is enabled or not
     * @param {string} key - key of settings from settingsKeys
     * @returns {boolean} key is enabled or not
     */
    function isSettingVisible(key) {
        return settingsStore.isEnabled(key);
    }

    /**
     * Checks whether any setting in a group is enabled or not
     * @param {string} groupKey - key of group from groups
     * @returns {boolean} any key in a group is enabled or not
     */
    function isGroupVisible(groupKey) {
        return settingGroups[groupKey].some(isSettingVisible);
    }
</script>

<style>
    .content {
        padding: 0 var(--space-1x);
        @media screen and (--mq-minwidth-huge) {
            display: flex;
            padding: var(--space-2x) var(--space-9x);
            justify-content: space-around;

            & .group {
                max-width: 96rem;
            }
        }
    }

    .caption {
        margin: var(--space-1x) 0;
        color: var(--color-text-feedback);
        font-size: var(--fontsize-body-s);
    }

    .group {
        flex: 1 1 50%;
        margin: var(--space-4x) var(--space-3x) 0 var(--space-3x);

        & header {
            padding-bottom: var(--space-2x);
            font-weight: bold;
        }

        & > header {
            text-transform: uppercase;
            border-bottom: var(--border-medium) solid var(--color-border-default);
            margin-bottom: var(--space-4x);
        }
    }

    .panel {
        & header {
            padding-bottom: var(--space-1x5);
        }
    }
</style>

<div class="content">
    {#if isGroupVisible(groups.general)}
        <section class="group">
            <header>{__('My settings')}</header>
            {#if isSettingVisible(settingsKeys.choiceElimination)}
                <section class="panel">
                    <header>{__('Answer elimination')}</header>
                    <div>
                        <Switch
                            value={!!settings[settingsKeys.choiceElimination]}
                            checkedLabel={__('On')}
                            uncheckedLabel={__('Off')}
                            ariaLabelledBy={captionIds[settingsKeys.choiceElimination]}
                            on:change={e => handleChange(settingsKeys.choiceElimination, e.detail)} />
                        <p class="caption" id={captionIds[settingsKeys.choiceElimination]}>
                            {__('Answer elimination lets you exclude answer options that you are sure are incorrect.')}
                        </p>
                    </div>
                </section>
            {/if}
            {#if isSettingVisible(settingsKeys.choiceAnswerMasking)}
                <section class="panel">
                    <header>{__('Answer masking')}</header>
                    <div>
                        <Switch
                            value={!!settings[settingsKeys.choiceAnswerMasking]}
                            checkedLabel={__('On')}
                            uncheckedLabel={__('Off')}
                            ariaLabelledBy={captionIds[settingsKeys.choiceAnswerMasking]}
                            on:change={e => handleChange(settingsKeys.choiceAnswerMasking, e.detail)} />
                        <p class="caption" id={captionIds[settingsKeys.choiceAnswerMasking]}>
                            {__('Answer masking lets you hide answer options that you are sure are incorrect.')}
                        </p>
                    </div>
                </section>
            {/if}
        </section>
    {/if}
</div>
