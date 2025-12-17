<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
    /**
     * Component is used to control navigation through previewer test
     * @property {String} serviceCallId
     * @property {Boolean} [disabled=false] - disable all buttons
     * @fires 'move' navigation event
     */
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { getTestStateStore } from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';
    import { __, ResizeObserver } from '@oat-sa-private/ui-core';
    import { Button } from '@oat-sa-private/ui-elements';
    import Steps from './Steps.svelte';

    export let serviceCallId;
    export let disabled = false;

    const dispatch = createEventDispatcher();
    const testStateStore = getTestStateStore(serviceCallId);

    let containerWidth = 0;
    let stepsContainer;
    let resizeObserver;

    /**
     * Loads the test data for all test parts and calculates navigation state
     * @returns {Object} navigation options
     */
    function loadNavigationState() {
        const testMap = testStateStore.getTestMap();
        const testTotal = testMap && testMap.stats.total;
        const item = testStateStore.getCurrentItem();
        return {
            allowed: {
                previous: item && item.position > 0,
                next: item && item.position + 1 < testTotal
            }
        };
    }

    /**
     * @fires 'move' navigation event with directions set to 'previous'
     */
    function previous() {
        if (disabled) {
            return;
        }
        dispatch('move', { direction: 'previous', scope: 'item' });
    }

    /**
     * @fires 'move' navigation event with directions set to 'next'
     */
    function next() {
        if (disabled) {
            return;
        }
        dispatch('move', { direction: 'next', scope: 'item' });
    }

    $: navigationState = $testStateStore ? loadNavigationState() : null;

    $: if (stepsContainer) {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        resizeObserver = new ResizeObserver(([stepsContainerEntry]) => {
            window.requestAnimationFrame(
                () => (containerWidth = stepsContainerEntry.target.getBoundingClientRect().width)
            );
        });
        resizeObserver.observe(stepsContainer);
    }

    onDestroy(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
    });
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
                order: 1;
                flex-basis: 6rem;
                margin-block: 0;
                margin-inline: 0 2rem;
            }
            &.end {
                order: 3;
                flex-basis: 6rem;
                justify-content: flex-end;
                margin-block: 0;
                margin-inline: 2rem 0;
            }
            & > :global(button) {
                margin: 0;
            }
        }

        & :global(.progress-container) {
            order: 2;
        }
    }

    .progress-container {
        @add-mixin flex-center-center;
        width: 100%;
        height: 100%;
        flex: 1 1 auto;
        padding-block: 0;
        padding-inline: 0.375rem 1rem;

        & :global(.ellipsis-container) {
            cursor: default;
        }
    }

    .width-tracker {
        @add-mixin flex-center-center;
        width: 100%;
        height: 100%;
        overflow: hidden;
        flex: 1 1 0;
        background: transparent;
        z-index: 1;
    }
</style>

<div class="navigator">
    <div class="button-container end">
        {#if navigationState && navigationState.allowed.next}
            <Button
                name="next"
                ariaLabel={__('Go to next question')}
                shape="circular"
                size="medium"
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
                size="medium"
                skin="secondary"
                icon="arrow-left-16"
                iconRtlFlip={true}
                on:click={previous}
                {disabled} />
        {/if}
    </div>
    <div class="progress-container">
        <div class="width-tracker" bind:this={stepsContainer}>
            <Steps on:move {containerWidth} {serviceCallId} {disabled} />
        </div>
    </div>
</div>
