<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;

    /**
     * Component displays test navigation in the special case where multiple attempts can be taken on an item
     * @property {String} serviceCallId - id of test session
     * @property {Object} navigationState - hash of which actions are allowed
     * @property {String} navButtonSize
     * @property {String} screenSize
     * @property {Boolean} disabled - is navigation disabled
     * @fires 'previous' navigation event
     * @fires 'next' navigation event
     * @fires 'skip' navigation event
     * @fires 'attempt' navigation event
     * @fires 'submitpart' navigation event
     * @fires 'overview' event (to show progress overview)
     */
    import { createEventDispatcher } from 'svelte';
    import { getTestStateStore } from '../../../../testsStateStore.js';
    import { __ } from '@oat-sa-private/ui-core';
    import { Button } from '@oat-sa-private/ui-elements';
    import Counter from './Counter.svelte';
    import OverviewButton from './OverviewButton.svelte';

    const dispatch = createEventDispatcher();

    export let serviceCallId;
    export let navigationState;
    export let navButtonSize = 'small';
    export let disabled = false;

    const testStateStore = getTestStateStore(serviceCallId);

    let part, stats, testContext, currentPosition;
    $: {
        part = $testStateStore ? testStateStore.getCurrentTestPart() : null;
        testContext = $testStateStore ? testStateStore.getTestContext() : null;

        if (part) {
            stats = part.stats;
            if (testContext) {
                currentPosition = testContext.itemPosition - part.position;
            }
        }
    }
</script>

<style>
    .button-container {
        display: flex;
        flex: 0 0 auto;

        &.start {
            flex-basis: 8rem;
            margin-block: 0;
            margin-inline: 0 2rem;
        }
        &.center :global(button) {
            margin: 0 1rem;
        }
        &.end {
            margin-block: 0;
            margin-inline: 2rem 0;
            display: flex;
            flex: 0 0 auto;

            & > :global(button[name='skip']) {
                margin-block: 0;
                margin-inline: 0 1rem;
                order: -1;
            }
        }
        & > :global(button) {
            margin: 0;
        }
    }

    /* Non-mobile */
    @media screen and (--mq-minwidth-medium) {
        .button-container.start {
            order: 1;
        }
        .button-container.center {
            order: 2;
        }
        .button-container.end {
            order: 3;
        }
    }

    /* Mobile */
    @media screen and (--mq-maxwidth-medium) {
        .button-container.start {
            order: 1;
            flex: 1 0 0;
        }
        .button-container.center {
            order: 2;
            margin: 0 var(--space-half);
        }
        /* order: 3 is for button[name='bookmark'] in TestNavigator */
        .button-container.end {
            order: 4;
            flex: 1 0 0;
            justify-content: flex-end;
        }
    }
</style>

{#if navigationState}
    <div class="button-container end">
        {#if navigationState.isLast && navigationState.allowed.attemptsDone}
            {#if navigationState.allowed.finishTest}
                <Button
                    name="finish"
                    label={__('Finish the test')}
                    shape="pill"
                    size={navButtonSize}
                    skin="primary"
                    icon="finish-16"
                    iconSide="right"
                    on:click={() => dispatch('submitpart')}
                    {disabled} />
            {:else if navigationState.allowed.finishTestPart}
                <Button
                    name="submit"
                    label={__('Submit test part')}
                    shape="pill"
                    size={navButtonSize}
                    skin="primary"
                    icon="submit-16"
                    iconSide="right"
                    on:click={() => dispatch('submitpart')}
                    {disabled} />
            {/if}
        {/if}

        {#if navigationState.allowed.attempt}
            <Button
                name="attempt"
                label={__('Attempt (%d left)', navigationState.remainingAttempts)}
                ariaLabel={__(
                    'Attempt. You have %d attempts left for this question.',
                    navigationState.remainingAttempts
                )}
                shape="pill"
                size={navButtonSize}
                skin="primary"
                on:click={() => dispatch('attempt')}
                {disabled} />
        {:else if navigationState.allowed.attemptsDone && !navigationState.isLast}
            <Button
                name="next"
                label={__('Next question')}
                ariaLabel={__('Go to next question')}
                shape="pill"
                size={navButtonSize}
                skin="primary"
                icon="arrow-right-16"
                iconSide="right"
                iconRtlFlip={true}
                on:click={() => dispatch('skip', { direction: 'next' })}
                {disabled} />
        {/if}

        {#if navigationState.isLinear && navigationState.allowed.skip && !navigationState.isLast}
            <Button
                name="skip"
                label={__('Skip question')}
                shape="pill"
                size={navButtonSize}
                skin="secondary"
                on:click={() => dispatch('skip', { direction: 'next' })}
                {disabled} />
        {/if}
    </div>

    <div class="button-container start">
        {#if navigationState.isLinear}
            <Counter total={stats.total} position={currentPosition + 1} />
        {/if}
    </div>

    <div class="button-container center">
        {#if !navigationState.isLinear}
            {#if navigationState.allowed.previous && navigationState.canNavigateFreely}
                <Button
                    name="prev"
                    ariaLabel={__('Go to previous question')}
                    shape="circular"
                    size="small"
                    skin="secondary"
                    icon="arrow-left-16"
                    iconRtlFlip={true}
                    on:click={() => dispatch('skip', { direction: 'previous' })}
                    {disabled} />
            {/if}

            {#if navigationState.allowed.overview}
                <OverviewButton {serviceCallId} {disabled} on:overview />
            {/if}

            {#if navigationState.allowed.skip && !navigationState.isLast}
                {#if !navigationState.allowed.attemptsDone}
                    <Button
                        name="skip"
                        ariaLabel={__('Skip question')}
                        shape="circular"
                        size="small"
                        skin="secondary"
                        icon="arrow-right-16"
                        iconRtlFlip={true}
                        on:click={() => dispatch('skip', { direction: 'next' })}
                        {disabled} />
                {:else}
                    <Button
                        name="next"
                        label={__('Next question')}
                        ariaLabel={__('Go to next question')}
                        shape="circular"
                        size="small"
                        skin="secondary"
                        icon="arrow-right-16"
                        iconRtlFlip={true}
                        on:click={() => dispatch('next')}
                        {disabled} />
                {/if}
            {/if}
        {/if}
    </div>
{/if}
