<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to display step progress navigation for non-linear tests
     * @property {String} serviceCallId - id of test session
     * @property {String} containerWidth - available space for actual component rendering
     * @fires 'move' event with clicked item's position within the test
     * @fires 'more' event (forwarded from MoreButton)
     * @fires 'overview' event (forwarded from OverviewButton)
     */
    import { StepProgress } from '@oat-sa-private/ui-components';
    import { pxToRem, resizeObserver } from '@oat-sa-private/ui-core';
    import MoreButton from './MoreButton.svelte';
    import OverviewButton from './OverviewButton.svelte';
    import StepsFocusContainer from '../StepsFocusContainer.svelte';
    import { createEventDispatcher } from 'svelte';
    import { getTestStateStore } from '../../../../testsStateStore.js';
    import getItemViewPositions from '../getItemViewPositions.js';
    import getStep from '../stepProgressHelper.js';
    import { getTimersStore } from '../../../../timers/timersStore.js';
    import { isItemDisabled } from '../nonLinearNavigationHelper';

    export let serviceCallId;
    export let disabled = false;
    export let nonLinearRestricted = false;

    /**
     * @typedef StepCreator step state generator function
     * @param {Object} item - Item object from store
     * @param {Boolean} showBookmarkState
     * @param {Number} viewPosition - item position which is shown to the user
     * @returns {Object}  step data in the format of StepProgress component
     */
    /**
     * @type {StepCreator}
     */
    export let stepCreator = getStep;

    const dispatch = createEventDispatcher();
    const testStateStore = getTestStateStore(serviceCallId);
    const timersStore = getTimersStore(serviceCallId);

    let stepSections = [];
    let total;
    let range;
    let currentPosition;
    let testContext;
    let part;
    let stats;
    let itemViewPositions;
    let containerWidth = 0;
    let overviewButtonWidth = 0;
    let hasFocus = false;

    $: {
        testContext = $testStateStore ? testStateStore.getTestContext() : null;
        const testMap = $testStateStore ? testStateStore.getTestMap() : null;
        part = $testStateStore ? testStateStore.getCurrentTestPart() : null;
        stats = part && part.stats;

        //position relative to part
        currentPosition = testContext && part ? testContext.itemPosition - part.position : null;
        itemViewPositions = part ? getItemViewPositions(part) : {};

        //calculate sections containing steps depending on container width
        if (containerWidth && stats) {
            const stepsFitAmount = calculateStepFitQuantity(overviewButtonWidth);
            total = stats.total;
            range = calculatePositionRange(total, stepsFitAmount, currentPosition);
            stepSections = createStepSections(part, currentPosition, range, testMap, $timersStore);
        }
    }

    /**
     * Calculates amount of steps that will fit into container of a given width in px
     * @returns {Number} number of steps that will fit the given width
     */
    function calculateStepFitQuantity() {
        const oneStepWidth = 6.25;
        const advanceMargin = 1;
        const ellipsisWidth = 2.5;
        const overviewMargin = 1.375;
        const containerWidthRem =
            pxToRem(Math.trunc(containerWidth - overviewButtonWidth)) -
            ellipsisWidth * 2 -
            overviewMargin -
            advanceMargin;
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
     *  @param {Object} testPart testMap's test part
     *  @param {Number} positionInPart position index within the part
     *  @param {Object} stepRange object containing start and end position indexes
     *  @param {Object} testMap
     *  @returns {Array} array of section objects compatible with StepProgress component
     */
    function createStepSections(testPart, positionInPart, stepRange, testMap) {
        let sections = [];
        let connected = testPart.sections && Object.keys(testPart.sections).length > 1;

        Object.values(testPart.sections).forEach(section => {
            const steps = [];
            let sectionPosition = section.position - testPart.position;
            let current;
            let connectorStart = false;
            let connectorEnd = false;

            if (sectionPosition > stepRange.end) {
                return;
            }

            Object.values(section.items).forEach(item => {
                const itemIndex = item.position - testPart.position;
                if (itemIndex < stepRange.start) {
                    connectorStart = true;
                    sectionPosition++;
                    return;
                }
                if (itemIndex > stepRange.end) {
                    connectorEnd = true;
                    return;
                }
                const isTimedOut = timersStore.isPositionTimedOut(item.position, testMap);
                if (positionInPart === itemIndex) {
                    current = item.position;
                }
                if (nonLinearRestricted) {
                    item.disabled = isItemDisabled(item, currentPosition, testPart);
                }

                steps.push(stepCreator(item, true, itemViewPositions[item.position], isTimedOut));
            });

            if (steps.length) {
                sections.push({
                    connected,
                    steps,
                    current,
                    sectionPosition,
                    connectorStart,
                    connectorEnd
                });
            }
        });
        return sections;
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

    function handleWidthTrackerResize(entry) {
        window.requestAnimationFrame(() => {
            containerWidth = entry.target.getBoundingClientRect().width;
        });
    }

    function handleOverviewButtonResize(entry) {
        window.requestAnimationFrame(() => {
            overviewButtonWidth = entry.target.getBoundingClientRect().width;
        });
    }
</script>

<style>
    .width-tracker {
        @add-mixin flex-center-center;
        width: 100%;
        height: 100%;
        overflow: hidden;
        flex: 1 1 0;
        background: transparent;
        z-index: 1;
    }

    .steps-container {
        display: flex;
        /* if a11y spacing styles are inherited, Steps will have layout issues */
        letter-spacing: 0;
        word-spacing: 0;
    }
    .overview-container {
        margin-block: 0;
        margin-inline: 1.375rem 0;
    }
</style>

<div class="width-tracker" use:resizeObserver={{ callback: handleWidthTrackerResize }}>
    <div class="steps-container">
        <MoreButton active={range && range.start > 0} {disabled} on:more />
        {#if stepSections && stepSections.length > 0}
            <StepsFocusContainer bind:hasFocus>
                {#each stepSections as stepSection}
                    <StepProgress
                        {...stepSection}
                        {disabled}
                        firstFocusableKey={testContext ? testContext.itemPosition : void 0}
                        containerHasFocus={hasFocus}
                        on:move={handleMove} />
                {/each}
            </StepsFocusContainer>
        {/if}
        <MoreButton active={range && range.end < total - 1} {disabled} on:more />
    </div>
    <span class="overview-container" use:resizeObserver={{ callback: handleOverviewButtonResize }}>
        <OverviewButton on:overview {serviceCallId} {disabled} />
    </span>
</div>
