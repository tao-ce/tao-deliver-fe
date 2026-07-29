<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2025 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to control navigation through test, show test taker progress and overview
     * @property {String} serviceCallId - id of test session
     * @property {Boolean} [liteMode=false] - simplified mode of progress display
     * @property {Boolean} [disabled=false] - disable all buttons
     * @property {Boolean} [bookmarkDisabled=false] - disable bookmark button
     * @property {Boolean} [disableNext=false] - disable next/forward navigation independently
     * @property {Boolean} [disablePrevious=false] - disable previous/backward navigation independently
     * @property {Number} [linearNavDelayBeforeEnabled=null] - delay in milliseconds before enabling navigation in linear mode
     * @property {Boolean} [hideBookmarks=false] - if true, hides the bookmark button and bookmarked tab in overview
     * @fires 'move' navigation event
     * @fires 'overview' event (to show progress overview)
     * @fires 'bookmark' event
     */
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestStateStore, getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { __ } from '@oat-sa-private/ui-core';
    import { screenSize } from '../../../screenSizeStore.js';
    import { Button } from '@oat-sa-private/ui-elements';
    import Progress from './progress/Progress.svelte';
    import AttemptsNavigator from './progress/AttemptsNavigator.svelte';
    import OverviewButton from './progress/OverviewButton.svelte';

    const dispatch = createEventDispatcher();
    let isNextButtonEnabled = true;

    export let serviceCallId;
    export let liteMode = false;
    export let disabled = false;
    export let bookmarkDisabled = false;
    export let nonLinearRestricted = false;
    export let linearNavDelayBeforeEnabled = null;
    export let itemSessionStatusStore = null;
    export let disableNext = false;
    export let disablePrevious = false;
    export let hideBookmarks = false;

    let item;
    let testPart;
    const scope = 'item';

    const testStateStore = getTestStateStore(serviceCallId);
    const testStatusStore = getTestSessionStatusStore(serviceCallId);
    let navigationTimeout;
    let navigationState = null;

    /**
     * Loads the testPart data and calculates navigation state
     * @returns {Object} navigation options
     */
    function loadNavigationState() {
        if (navigationTimeout) {
            clearTimeout(navigationTimeout);
        }

        // Each key represents a button
        const allowedNavigation = {
            previous: false,
            next: true,
            finishTestPart: false,
            finishTest: false,
            skip: false,
            attempt: false,
            attemptsDone: false,
            overview: false
        };

        let isLast = false;
        let canNavigateFreely = false;
        let remainingAttempts = -1;

        const testMap = testStateStore.getTestMap();
        const testTotal = testMap && testMap.stats && testMap.stats.total;

        item = testStateStore.getCurrentItem();
        testPart = testStateStore.getCurrentTestPart();

        if (linearNavDelayBeforeEnabled !== null && testPart && testPart.isLinear) {
            isNextButtonEnabled = false;
            navigationTimeout = setTimeout(() => {
                isNextButtonEnabled = true;
            }, linearNavDelayBeforeEnabled);
        } else {
            isNextButtonEnabled = true;
        }

        if (item && testPart) {
            canNavigateFreely = !testPart.isLinear;
            remainingAttempts = Number.isInteger(item.remainingAttempts) ? item.remainingAttempts : -1;

            // Properties only used in attempts mode
            if (remainingAttempts > -1) {
                allowedNavigation.attempt = true;

                //TODO: read allowSkipping from current item
                const testContext = testStateStore.getTestContext();
                if (testContext.allowSkipping !== false) {
                    allowedNavigation.skip = true;
                }

                if (remainingAttempts === 0 || (itemSessionStatusStore && !itemSessionStatusStore.isInteracting)) {
                    allowedNavigation.attempt = false;
                    allowedNavigation.attemptsDone = true;
                }
                canNavigateFreely = !testPart.isLinear && (allowedNavigation.skip || allowedNavigation.attemptsDone);
            }

            // Properties for any mode
            if (!testPart.isLinear) {
                if (item.position - testPart.position > 0) {
                    allowedNavigation.previous = true;
                }
            }

            // Properties for last item in part
            if (item.position - testPart.position + 1 >= testPart.stats.total) {
                isLast = true;
                if (testPart.isLinear || liteMode || remainingAttempts === 0) {
                    allowedNavigation.next = false;
                    allowedNavigation.finishTestPart = true;
                    if (item.position + 1 >= testTotal) {
                        allowedNavigation.finishTest = true;
                    }
                }
            }

            allowedNavigation.overview = !testPart.isLinear && !liteMode;

            return {
                allowed: allowedNavigation,
                isLinear: testPart.isLinear,
                isLast,
                remainingAttempts,
                canNavigateFreely,
                bookmark: {
                    shown: !hideBookmarks && !liteMode && !testPart.isLinear && item && !item.informational,
                    toggled: item && item.flagged
                }
            };
        } else {
            return null;
        }
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
     * @fires 'review' navigation event in case of non-linear testPart and non-lite mode
     */
    function next() {
        if (disabled) {
            return;
        }
        if (
            item &&
            item.position - testPart.position + 1 >= testPart.stats.total &&
            navigationState.allowed.finishTestPart === false
        ) {
            //non-linear and non-lite mode
            dispatch('review');
        } else {
            dispatch('move', { direction: 'next', scope });
        }
    }

    /**
     * @fires 'move' navigation event with directions set to 'previous'
     * @fires 'overview' component event
     */
    function submitTestPart() {
        if (disabled) {
            return;
        }
        if (testPart.isLinear || liteMode) {
            dispatch('move', { direction: 'next', scope });
        } else {
            dispatch('overview');
        }
    }

    /**
     * @fires 'bookmark' event
     */
    function bookmark() {
        if (!disabled && !bookmarkDisabled) {
            dispatch('bookmark');
        }
    }

    //calculating navigation state on every testStateStore and itemSessionStatus (if available) change
    $: if ($testStateStore && (!itemSessionStatusStore || $itemSessionStatusStore)) {
        navigationState = loadNavigationState();
    } else {
        navigationState = null;
    }

    $: navButtonSize = $screenSize.mobile || $screenSize.tabletPortrait ? 'small' : 'medium';
    $: overviewDisabled = disabled || disableNext || disablePrevious;
    $: progressDisabled = disabled || disableNext || disablePrevious;
    $: forwardActionDisabled = disabled || disableNext;
    $: nextButtonDisabled = disabled || !isNextButtonEnabled || disableNext;

    onDestroy(() => {
        if (navigationTimeout) {
            clearTimeout(navigationTimeout);
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

        & :global(button[name='bookmark']) {
            &:focus:not(:hover) {
                background: var(--color-bg-default);
            }
            &:focus-visible:not(:hover) {
                background: var(--color-bg-actionable-secondary-hover);
            }
        }

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
            & :global(button[name='bookmark']) {
                position: absolute;
                bottom: calc(var(--testrunner-footer-height) + var(--space-2x));
                inset-inline-end: var(--space-2x);
                margin: 0;
            }
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
            & :global(button[name='bookmark']) {
                order: 3;
                margin: 0 var(--space-1x);
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
        {#if navigationState && navigationState.bookmark.shown}
            <Button
                name="bookmark"
                ariaLabel={navigationState.bookmark.toggled
                    ? __('Remove bookmark from this question')
                    : __('Bookmark this question')}
                shape="circular"
                size={navButtonSize}
                skin={bookmarkDisabled ? 'visually-disabled' : 'secondary'}
                icon={navigationState.bookmark.toggled ? 'bookmark-fill-16' : 'bookmark-outline-16'}
                {disabled}
                on:click={bookmark} />
        {/if}

        {#if navigationState && navigationState.remainingAttempts > -1}
            <AttemptsNavigator
                {serviceCallId}
                {navigationState}
                {navButtonSize}
                {screenSize}
                {disabled}
                on:previous={previous}
                on:next={next}
                on:attempt={next}
                on:skip
                on:submitpart={submitTestPart}
                on:overview />
        {:else}
            <div class="button-container end">
                {#if navigationState && navigationState.allowed.finishTest}
                    <Button
                        name="finish"
                        label={__('Finish the test')}
                        ariaLabel={__('Finish the test')}
                        shape="pill"
                        size={navButtonSize}
                        skin="primary"
                        icon="finish-16"
                        iconSide="right"
                        on:click={submitTestPart}
                        disabled={forwardActionDisabled} />
                {:else if navigationState && navigationState.allowed.finishTestPart}
                    <Button
                        name="submit"
                        label={__('Submit test part')}
                        ariaLabel={__('Submit test part')}
                        shape="pill"
                        size={navButtonSize}
                        skin="primary"
                        icon="submit-16"
                        iconSide="right"
                        on:click={submitTestPart}
                        disabled={forwardActionDisabled} />
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
                        disabled={nextButtonDisabled} />
                {/if}
            </div>

            {#if navigationState && !navigationState.isLinear}
                <div class="button-container start">
                    {#if navigationState.allowed.previous}
                        <Button
                            name="prev"
                            ariaLabel={__('Go to previous question')}
                            shape="circular"
                            size={navButtonSize}
                            skin="secondary"
                            icon="arrow-left-16"
                            iconRtlFlip={true}
                            on:click={previous}
                            disabled={disabled || disablePrevious} />
                    {/if}
                </div>
            {/if}

            {#if $screenSize.mobile && navigationState && navigationState.allowed.overview}
                <div class="overview-btn-container">
                    <OverviewButton on:overview {serviceCallId} disabled={overviewDisabled} />
                </div>
            {/if}
            <Progress
                on:move
                on:overview
                {serviceCallId}
                {liteMode}
                disabled={progressDisabled}
                {nonLinearRestricted} />
        {/if}
    </div>
{/if}
