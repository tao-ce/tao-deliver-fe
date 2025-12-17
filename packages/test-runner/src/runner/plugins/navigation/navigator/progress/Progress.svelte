<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;

    /**
     * Component to display test progress and/or test navigation
     * @property {String} serviceCallId id of test session
     * @fires 'overview' event forwarded from Steps component
     * @fires 'move' event forwarded from Steps component
     */
    import { createEventDispatcher } from 'svelte';
    import { Progressbar } from '@oat-sa-private/ui-elements';
    import Dots from './Dots.svelte';
    import Steps from './Steps.svelte';
    import Counter from './Counter.svelte';
    import { getTestStateStore } from '../../../../testsStateStore.js';
    import { screenSize } from '../../../../screenSizeStore.js';

    import { __ } from '@oat-sa-private/ui-core';

    const dispatch = createEventDispatcher();

    //component types
    const progressComponentTypes = Object.freeze({
        counter: 'counter',
        progressbar: 'progressbar',
        dots: 'dots',
        steps: 'steps',
        number: 'number'
    });

    //maximum values for DotsProgress
    const maxDots = Object.freeze({
        default: 18,
        tablet: 12
    });

    export let serviceCallId;
    export let liteMode;
    export let disabled = false;
    export let nonLinearRestricted = false;

    const testStateStore = getTestStateStore(serviceCallId);

    let part;
    let currentItem;
    let stats;
    let testContext;
    let currentPosition;
    let componentType = progressComponentTypes.counter;

    $: {
        part = $testStateStore ? testStateStore.getCurrentTestPart() : null;
        currentItem = $testStateStore ? testStateStore.getCurrentItem() : null;
        testContext = $testStateStore ? testStateStore.getTestContext() : null;

        if (part) {
            stats = part.stats;
            if (testContext) {
                currentPosition = testContext.itemPosition - part.position;
            }
        }

        componentType = $screenSize ? getProgressComponentType() : null;
    }

    /**
     * Fire 'overview' event
     */
    function handleMore() {
        dispatch('overview');
    }

    /**
     * Calculates component type to display progress based on screen size and display mode
     * @returns {String}
     */
    function getProgressComponentType() {
        let calculatedComponentType;
        if (liteMode) {
            calculatedComponentType = progressComponentTypes.dots;
            if ($screenSize.mobile) {
                calculatedComponentType = progressComponentTypes.progressbar;
            } else if ($screenSize.tabletPortrait) {
                if (stats && stats.total > maxDots.tablet) {
                    calculatedComponentType = progressComponentTypes.progressbar;
                }
            } else {
                if (stats && stats.total > maxDots.default) {
                    calculatedComponentType = progressComponentTypes.progressbar;
                }
            }
        } else {
            if (part && part.isLinear) {
                if (part.isAdaptive) {
                    calculatedComponentType = progressComponentTypes.number;
                } else {
                    calculatedComponentType = progressComponentTypes.counter;
                }
            } else {
                if (!$screenSize.mobile) {
                    calculatedComponentType = progressComponentTypes.steps;
                }
            }
        }

        return calculatedComponentType;
    }
</script>

<style>
    .progress-container {
        @add-mixin flex-center-center;
        width: 100%;
        height: 100%;
        flex: 1 1 auto;

        &.counter,
        &.number {
            justify-content: flex-start;
        }

        &.steps {
            padding-block: 0;
            padding-inline: 0.375rem 1rem;
        }
        &.overview-container {
            margin-block: 0;
            margin-inline: 1.375rem 0;
        }
    }

    /* Mobile UI modifications */
    @media screen and (--mq-maxwidth-medium) {
        .progress-container > :global(button) {
            margin: 0;
        }
    }
</style>

{#if stats && componentType}
    <div class="progress-container {componentType}">
        {#if componentType === progressComponentTypes.progressbar}
            <Progressbar skin="secondary" showLabel={false} max={stats.total} value={currentPosition + 1} />
        {:else if componentType === progressComponentTypes.counter}
            <Counter total={stats.total} position={currentPosition + 1} />
        {:else if componentType === progressComponentTypes.number}
            <div class="number">{__('Question')} {currentPosition + 1}</div>
        {:else if componentType === progressComponentTypes.dots}
            <Dots total={stats.total} {currentPosition} />
        {:else if componentType === progressComponentTypes.steps}
            <Steps on:move on:overview on:more={handleMore} {serviceCallId} {disabled} {nonLinearRestricted} />
        {/if}
    </div>
{/if}
