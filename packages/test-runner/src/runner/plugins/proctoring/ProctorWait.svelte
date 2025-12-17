<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import { Loading, Notification } from '@oat-sa-private/ui-components';
    import { Button } from '@oat-sa-private/ui-elements';
    import { isPausedByProctorExecution } from '../../util/proctoring.js';
    import { getTestStateStore } from '../../testsStateStore.js';

    const dispatch = createEventDispatcher();

    export let serviceCallId;
    export let extraTimeStr;
    export let hideContent = false;

    const testStateStore = getTestStateStore(serviceCallId);
    let focusableResumeHeader;
    let focusablePausedHeader;

    $: canResume = $testStateStore && !isPausedByProctorExecution(testStateStore.getTestContext());

    //to notify user that test can be resumed, focus h2 text once it appears
    //relies on the fact that elements will be recreated on condition change
    $: if (focusableResumeHeader) {
        focusableResumeHeader.focus();
    }
    $: if (focusablePausedHeader) {
        focusablePausedHeader.focus();
    }

    function handleResumeButtonClick() {
        dispatch('resume');
    }
</script>

<style>
    .transition {
        @add-mixin flex-center-center;
        flex-direction: column;
        height: 100%;
        margin: 0 2rem;

        & :global(.notification-wrapper) {
            padding: 1rem 1.5rem;
        }
    }
    h2 {
        margin-bottom: 1rem;
        outline: none;
    }
    .notif-container {
        width: min(45rem, 100%);
    }
    .btn-container {
        padding-top: 4rem;
        width: min(45rem, 100%);
    }
</style>

<div class="proctor-wait transition">
    {#if !hideContent}
        {#if canResume}
            <h2 tabindex="-1" bind:this={focusableResumeHeader}>{__('Your test is ready')}</h2>
            {#if extraTimeStr}
                <div class="notif-container">
                    <Notification key={0} title={extraTimeStr} hierarchy="neutral" closeable={false} />
                </div>
            {/if}
            <div class="btn-container">
                <Button
                    name="proctor-resume"
                    label={__('Resume test')}
                    shape="pill"
                    size="small"
                    skin="primary"
                    fullwidth={true}
                    on:click={handleResumeButtonClick} />
            </div>
        {:else}
            <h2 tabindex="-1" bind:this={focusablePausedHeader}>{__('Your test is paused')}</h2>
            <Loading text={__('Please wait for the proctor to resume your test.')} lite={false} />
        {/if}
    {/if}
</div>
