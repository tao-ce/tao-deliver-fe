<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to display step progress navigation for previewer test
     * @property {String} serviceCallId
     * @property {String} containerWidth - available space for actual component rendering
     * @fires 'move' event with clicked item's position within the test
     */
    import { StepProgress } from '@oat-sa-private/ui-components';
    import { pxToRem, __ } from '@oat-sa-private/ui-core';
    import { createEventDispatcher } from 'svelte';
    import { getTestStateStore } from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';
    import MoreButton from './MoreButton.svelte';
    import StepsFocusContainer from './StepsFocusContainer.svelte';

    export let serviceCallId;
    export let containerWidth;
    export let disabled = false;

    const dispatch = createEventDispatcher();
    const testStateStore = getTestStateStore(serviceCallId);

    let hasFocus = false;

    let stepSection;
    let total;
    let range;

    $: {
        const testContext = $testStateStore ? testStateStore.getTestContext() : null;
        const testMap = $testStateStore ? testStateStore.getTestMap() : null;

        //calculate sections containing steps depending on container width
        if (containerWidth && testContext && testMap) {
            const currentPosition = testContext ? testContext.itemPosition : null;
            const stepsFitAmount = calculateStepFitQuantity(parseInt(containerWidth, 10));
            total = testMap.stats.total;
            range = calculatePositionRange(total, stepsFitAmount, currentPosition);
            stepSection = createStepSection(currentPosition, range, testMap);
        }
    }

    /**
     * Calculates amount of steps that will fit into container of a given width in px
     * @param {Number} containerWidthPx width of container
     * @returns {Number} number of steps that will fit the given width
     */
    function calculateStepFitQuantity(containerWidthPx) {
        const oneStepWidth = 6.25;
        const advanceMargin = 1;
        const ellipsisWidth = 2.5;
        const containerWidthRem = pxToRem(parseInt(containerWidthPx, 10)) - ellipsisWidth * 2 - advanceMargin;
        return Math.floor(containerWidthRem / oneStepWidth);
    }

    /**
     * Calculates range of positions to display
     * @param {Number} itemsTotal amount of items
     * @param {Number} fitAmount amount of items that can be displayed
     * @param {Number} current current item position
     * @returns {Object} {start: startingPosition, end: endingPosition}
     */
    function calculatePositionRange(itemsTotal, fitAmount, current) {
        if (fitAmount >= itemsTotal) {
            return { start: 0, end: itemsTotal - 1 };
        } else {
            //if the amount is even make it odd
            if (fitAmount > 0 && fitAmount % 2 === 0) {
                fitAmount--;
            }
            const epsilon = Math.floor(fitAmount / 2);
            if (current - epsilon < 0) {
                return { start: 0, end: fitAmount - 1 };
            } else if (current + epsilon > itemsTotal - 1) {
                return { start: itemsTotal - fitAmount, end: itemsTotal - 1 };
            } else {
                return { start: current - epsilon, end: current + epsilon };
            }
        }
    }

    /**
     * Takes testPart and forms sections array to be used by StepProgress
     *  @param {Number} currentPosition
     *  @param {Object} stepRange object containing start and end position indexes
     *  @param {Object} testMap
     *  @returns {Array} array of section objects compatible with StepProgress component
     */
    function createStepSection(currentPosition, stepRange, testMap) {
        const steps = [];

        Object.values(testMap.parts).forEach(testPart => {
            Object.values(testPart.sections).forEach(section => {
                Object.values(section.items).forEach(item => {
                    if (item.position < stepRange.start || item.position > stepRange.end) {
                        return;
                    }
                    const viewPosition = item.position + 1;
                    steps.push({
                        key: item.position,
                        state: 'completed',
                        icon: null,
                        label: viewPosition,
                        ariaLabel: __('Question %d.', viewPosition)
                    });
                });
            });
        });

        if (steps.length) {
            return {
                steps,
                current: currentPosition,
                connected: false,
                connectorStart: false,
                connectorEnd: false
            };
        }
        return null;
    }

    /**
     * StepProgress move event handler
     * @param {CustomEvent} e
     */
    function handleMove(e) {
        dispatch('move', {
            position: e.detail.key
        });
    }
</script>

<MoreButton active={range && range.start > 0} {disabled} />
<StepsFocusContainer bind:hasFocus>
    {#if stepSection}
        <StepProgress
            {...stepSection}
            {disabled}
            firstFocusableKey={stepSection.current}
            containerHasFocus={hasFocus}
            on:move={handleMove} />
    {/if}
</StepsFocusContainer>
<MoreButton active={range && range.end < total - 1} {disabled} />
