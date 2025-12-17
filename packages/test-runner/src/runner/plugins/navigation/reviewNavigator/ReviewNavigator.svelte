<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to control navigation through test, show test taker progress and overview
     * @property {String} serviceCallId - id of test session
     * @property {Boolean} [disabled=false] - disable all buttons
     * @fires 'move' navigation event
     * @fires 'overview' event (to show progress overview)
     */
    import { createEventDispatcher } from 'svelte';
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestStateStore, getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { __ } from '@oat-sa-private/ui-core';
    import { screenSize } from '../../../screenSizeStore.js';
    import { Button } from '@oat-sa-private/ui-elements';
    import Progress from './progress/Progress.svelte';
    import OverviewButton from '../navigator/progress/OverviewButton.svelte';

    const dispatch = createEventDispatcher();

    export let serviceCallId;
    export let disabled = false;
    export let showScore = false;
    export let isFinalDelivery = true;

    let item;
    const scope = 'item';

    const testStateStore = getTestStateStore(serviceCallId);
    const testStatusStore = getTestSessionStatusStore(serviceCallId);
    const finishButtonLabel = isFinalDelivery ? __('Exit test review') : __('Continue to next test');

    /**
     * Loads the testPart data and calculates navigation state
     * @returns {Object} navigation options
     */
    function loadNavigationState() {
        // Each key represents a button
        const allowedNavigation = {
            previous: false,
            next: true,
            overview: false,
            finishTest: false
        };

        const testMap = testStateStore.getTestMap();
        const testTotal = testMap && testMap.stats.total;

        item = testStateStore.getCurrentItem();

        if (item) {
            if (item.position > 0) {
                allowedNavigation.previous = true;
            }

            // Properties for last item in part
            if (item.position + 1 >= testTotal) {
                allowedNavigation.next = false;
                allowedNavigation.finishTest = true;
            }

            allowedNavigation.overview = true;
        }

        return {
            allowed: allowedNavigation
        };
    }

    /**
     * @fires 'move' navigation event with directions set to 'previous'
     */
    function previous() {
        if (disabled) {
            return;
        }
        dispatch('move', { direction: 'previous', scope });
    }

    /**
     * @fires 'move' navigation event with directions set to 'next'
     */
    function next() {
        if (disabled) {
            return;
        }
        dispatch('move', { direction: 'next', scope });
    }

    /**
     * @fires 'finish' navigation event
     */
    function handleFinish() {
        if (disabled) {
            return;
        }
        dispatch('finish');
    }

    //calculating navigation state on every testStateStore change
    $: navigationState = $testStateStore ? loadNavigationState() : null;

    $: navButtonSize = $screenSize.mobile || $screenSize.tabletPortrait ? 'small' : 'medium';
</script>

<style>
    .navigator {
        background: var(--color-bg-default);
        display: flex;
        flex-wrap: nowrap;
        justify-content: space-between;
        align-items: center;
        height: var(--testrunner-footer-height);
        min-height: var(--testrunner-footer-height);
        overflow-y: hidden;
        user-select: none;
        padding: 0 var(--space-2x);

        & .button-container {
            display: flex;
            flex: 0 0 auto;
            &.start {
                flex-basis: 8rem;
                margin-block: 0;
                margin-inline: 0 2rem;
            }
            &.end {
                margin-block: 0;
                margin-inline: 2rem 0;
            }
            & > :global(button) {
                margin: 0;
            }
        }
    }
    /* Non-mobile */
    @media screen and (--mq-minwidth-medium) {
        .navigator {
            & .button-container.start {
                order: 1;
            }
            & :global(.progress-container) {
                order: 2;
            }
            & .button-container.end {
                order: 3;
            }
        }
    }

    /* Mobile */
    @media screen and (--mq-maxwidth-medium) {
        .navigator {
            & .button-container.start {
                order: 1;
                flex: 1 0 0;
            }
            & .overview-btn-container {
                order: 2;
                margin: 0 var(--space-half);
            }
            & .button-container.end {
                order: 4;
                flex: 1 0 0;
                justify-content: flex-end;
            }
        }
    }
</style>

{#if $testStatusStore !== testSessionStatus.overlay}
    <div class="navigator">
        <div class="button-container end">
            {#if navigationState && navigationState.allowed.finishTest}
                <Button
                    name="finish"
                    label={finishButtonLabel}
                    ariaLabel={finishButtonLabel}
                    shape="pill"
                    size={navButtonSize}
                    skin="secondary"
                    on:click={handleFinish}
                    {disabled} />
            {:else if navigationState && navigationState.allowed.next}
                <Button
                    name="next"
                    ariaLabel={__('Go to next question')}
                    shape="circular"
                    size={navButtonSize}
                    skin="primary"
                    icon="arrow-right-16"
                    iconRtlFlip={true}
                    on:click={next}
                    {disabled} />
            {/if}
        </div>

        <div class="button-container start">
            {#if navigationState && navigationState.allowed.previous}
                <Button
                    name="prev"
                    ariaLabel={__('Go to previous question')}
                    shape="circular"
                    size={navButtonSize}
                    skin="secondary"
                    icon="arrow-left-16"
                    iconRtlFlip={true}
                    on:click={previous}
                    {disabled} />
            {/if}
        </div>

        {#if $screenSize.mobile}
            <div class="overview-btn-container">
                <OverviewButton on:overview {serviceCallId} {disabled} />
            </div>
        {/if}
        <Progress on:move on:overview {serviceCallId} {disabled} {showScore} />
    </div>
{/if}
