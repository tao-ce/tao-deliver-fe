<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { __, generateElementId } from '@oat-sa-private/ui-core';
    import { TabGroup, StepProgress } from '@oat-sa-private/ui-components';
    import { getTestStateStore } from '../../../../testsStateStore.js';
    import getStep from '../stepProgressHelper.js';
    import getItemViewPositions from '../getItemViewPositions.js';
    import { isItemIncompleteOrUnseen } from '../../../../util/testPart.js';
    import StepsFocusContainer from '../StepsFocusContainer.svelte';
    import { getTimersStore } from '../../../../timers/timersStore.js';
    import { getTimerLabel, getExtraTimeApplicableLevels } from '../../../../timers/timerLabel.js';
    import { isItemDisabled } from '../nonLinearNavigationHelper';

    const dispatch = createEventDispatcher();

    export let serviceCallId;
    export let allowBookmarks = true;
    export let disabled = false;
    export let disableUnvisited = false;
    export let nonLinearRestricted = false;

    const testStateStore = getTestStateStore(serviceCallId);
    const timersStore = getTimersStore(serviceCallId); //even if there are no timers in this test, this store will exist and contain an empty structure

    const tabKeys = Object.freeze({
        all: 'all',
        bookmarked: 'bookmarked',
        incomplete: 'incomplete'
    });
    let activeTab = tabKeys.all;
    let hasFocus = {};

    /**
     * TabGroup change event handler
     * @param {CustomEvent} e
     */
    function handleTabChange(e) {
        activeTab = e.detail.key;
    }

    /**
     * StepProgress move event handler
     * @param {CustomEvent} e
     */
    function handleStepMove(e) {
        if (disabled) {
            return;
        }
        dispatch('move', {
            position: e.detail.key
        });
    }

    /**
     * @callback filterItemFunc
     * @param  {Object} item - Item object from store
     * @returns {Boolean} - true if passes filtering condition
     */
    /**
     * Maps store data for specific tab
     * @param {filterItemFunc} filterItemFunc - function to filter out items that are not needed
     * @param {Boolean} showBookmarkState
     * @param {Object} testPart - TestPart object from store
     * @param {Array} sectionsInTestPartArray - array of Section objects from store, for this testPart
     * @param {Object} testMap
     * @param {Object} testContext
     * @returns {Array} array of sections with their steps for the tab, mapped to component's format
     */
    function getTabSteps(filterItemFunc, showBookmarkState, testPart, sectionsInTestPartArray, testMap, testContext) {
        const viewPositions = getItemViewPositions(testPart);
        return sectionsInTestPartArray
            .map(section => {
                let items = getItemsInSection(testPart, section.id);
                if (filterItemFunc) {
                    items = items.filter(filterItemFunc);
                }
                return {
                    sectionId: section.id,
                    sectionLabel: section.label,
                    sectionHeaderId: generateElementId('sectionheader'),
                    timer: getSectionTimer(section, testContext),
                    steps: items.map(item => {
                        const isTimedOut = timersStore.isPositionTimedOut(item.position, testMap); //it's ok to not be reactive to timersStore
                        if (nonLinearRestricted) {
                            const currentPosition =
                                testContext && testPart ? testContext.itemPosition - testPart.position : null;
                            item.disabled = isItemDisabled(item, currentPosition, testPart);
                        }
                        const step = getStep(item, showBookmarkState, viewPositions[item.position], isTimedOut);
                        if (disableUnvisited && !['completed', 'visited'].includes(step.state)) {
                            step.disabled = true;
                        }
                        return step;
                    })
                };
            })
            .filter(i => i.steps.length > 0);
    }

    function getSectionTimer(section, testContext) {
        const sectionTimer = timersStore.getTimerFor('section', section.id);

        if (sectionTimer) {
            let label;
            let current;
            const isCurrentSection = testContext.sectionId === section.id;

            const extraTimeLevels = getExtraTimeApplicableLevels(testContext, timersStore);
            const extraTimerIfApplicable =
                isCurrentSection && extraTimeLevels.includes('section') ? timersStore.getTimerFor('extra') : null;

            if (
                sectionTimer.timerValue.timeLeft <= 0 &&
                (!extraTimerIfApplicable || extraTimerIfApplicable.timerValue.timeLeft <= 0)
            ) {
                label = __('OUT OF TIME');
                current = false;
            } else {
                const { label: timerLabel } = getTimerLabel(sectionTimer, extraTimerIfApplicable);
                label =
                    sectionTimer.timerValue.timeLeft < sectionTimer.timerValue.timeAssigned
                        ? __('%s left', timerLabel)
                        : timerLabel;
                current = isCurrentSection;
            }
            return {
                label,
                current
            };
        }
        return null;
    }

    /**
     * Calculate count of all steps shown on tab
     * @param {Array} tabSteps - array of sections with their steps for the tab, mapped to component's format
     * @returns {Number} count of all steps in the tab
     */
    function getTabStepsCount(tabSteps) {
        return tabSteps.reduce((acc, section) => acc + section.steps.length, 0);
    }

    /**
     * Select all items in section from store, as array
     * @param {Object} testPart - TestPart object from store
     * @param {String} sectionId
     * @returns {Array} array of Item objects from store
     */
    function getItemsInSection(testPart, sectionId) {
        return Object.values(testPart.sections[sectionId].items);
    }

    /**
     * Check if item from store should belong to bookmarked tab
     * @param {Object} item - Item object from store
     * @returns {Boolean} if item is bookmarked
     */
    function isBookmarked(item) {
        return item.flagged;
    }

    /**
     * Load data for Tabs and Sections and Steps from store and map it to component's format
     * @returns {Object} mapped data
     */
    function loadStepsState() {
        const testContext = testStateStore.getTestContext();
        const testMap = testStateStore.getTestMap();
        const testPart = testStateStore.getCurrentTestPart();
        if (!testContext || !testPart) {
            return {};
        }

        const currentItemPosition = testContext.itemPosition;
        const sectionsInTestPartArray = Object.values(testPart.sections);

        const sections = {};
        const tabs = [];
        const addTab = (key, label, steps) => {
            sections[key] = steps;
            tabs.push({ key, label });
        };

        const all = getTabSteps(null, true, testPart, sectionsInTestPartArray, testMap, testContext);
        addTab(tabKeys.all, __('all questions'), all);

        if (allowBookmarks) {
            const bookmarked = getTabSteps(
                isBookmarked,
                false,
                testPart,
                sectionsInTestPartArray,
                testMap,
                testContext
            );
            addTab(tabKeys.bookmarked, __('bookmarked (%d)', getTabStepsCount(bookmarked)), bookmarked);
        }

        const incomplete = getTabSteps(
            isItemIncompleteOrUnseen,
            false,
            testPart,
            sectionsInTestPartArray,
            testMap,
            testContext
        );
        addTab(tabKeys.incomplete, __('incomplete (%d)', getTabStepsCount(incomplete)), incomplete);

        return {
            currentItemPosition,
            hasSections: sectionsInTestPartArray.length > 1,
            sections,
            tabs
        };
    }

    $: stepsState = $testStateStore && $timersStore ? loadStepsState() : {};
</script>

<style>
    @define-mixin steps-width {
        width: calc(var(--steps-per-row) * var(--step-width));
    }

    :global(body[data-zoom-level='110']) {
        & .overview {
            --steps-per-row: 19;
            @media screen and (--mq-maxwidth-medium) {
                --steps-per-row: 5;
            }
            @media screen and (--mq-minwidth-medium) and (--mq-maxwidth-large) {
                --steps-per-row: 10;
            }
            @media screen and (--mq-minwidth-large) and (--mq-maxwidth-huge) {
                --steps-per-row: 15;
            }
        }
    }

    :global(body[data-zoom-level='125']) {
        & .overview {
            --steps-per-row: 16;
            @media screen and (--mq-maxwidth-medium) {
                --steps-per-row: 5;
            }
            @media screen and (--mq-minwidth-medium) and (--mq-maxwidth-large) {
                --steps-per-row: 10;
            }
            @media screen and (--mq-minwidth-large) and (--mq-maxwidth-huge) {
                --steps-per-row: 14;
            }
        }
    }

    :global(body[data-zoom-level='150']) {
        & .overview {
            --steps-per-row: 14;
            @media screen and (--mq-maxwidth-medium) {
                --steps-per-row: 4;
            }
            @media screen and (--mq-minwidth-medium) and (--mq-maxwidth-large) {
                --steps-per-row: 8;
            }
            @media screen and (--mq-minwidth-large) and (--mq-maxwidth-huge) {
                --steps-per-row: 11;
            }
        }
    }

    :global(body[data-zoom-level='175']) {
        & .overview {
            --steps-per-row: 12;
            @media screen and (--mq-maxwidth-medium) {
                --steps-per-row: 3;
            }
            @media screen and (--mq-minwidth-medium) and (--mq-maxwidth-large) {
                --steps-per-row: 6;
            }
            @media screen and (--mq-minwidth-large) and (--mq-maxwidth-huge) {
                --steps-per-row: 10;
            }
        }
    }

    :global(body[data-zoom-level='200']) {
        & .overview {
            --steps-per-row: 11;
            @media screen and (--mq-maxwidth-medium) {
                --steps-per-row: 3;
            }
            @media screen and (--mq-minwidth-medium) and (--mq-maxwidth-large) {
                --steps-per-row: 4;
            }
            @media screen and (--mq-minwidth-large) and (--mq-maxwidth-huge) {
                --steps-per-row: 7;
            }
        }
    }

    .overview {
        --steps-margin: 1.125rem;
        --step-width: 7.25rem;
        --steps-per-row: 20;

        padding: var(--space-6x) 0;

        @media screen and (--mq-maxwidth-medium) {
            --steps-per-row: 5;
            padding: 0 0 var(--space-2x) 0;
        }
        @media screen and (--mq-minwidth-medium) and (--mq-maxwidth-large) {
            --steps-per-row: 10;
            padding: var(--space-4x) 0;
        }
        @media screen and (--mq-minwidth-large) and (--mq-maxwidth-huge) {
            --steps-per-row: 15;
        }
    }

    .tabs {
        @add-mixin steps-width;
        margin: 0 auto;
        position: relative;
        padding: 0 var(--steps-margin);

        @media screen and (--mq-maxwidth-medium) {
            width: auto;
            padding: 0;
        }
    }

    .tabpanel {
        @add-mixin steps-width;
        margin: 0 auto;

        & .tabpanel-heading {
            margin: var(--space-4x) var(--steps-margin) var(--space-1x5) var(--steps-margin);
            padding-bottom: 0.875rem;
            border-bottom: var(--border-thin) solid var(--color-border-default);
            color: var(--color-text-default);
            font-weight: normal;
            display: flex;
            justify-content: space-between;
            gap: 1rem;
        }

        & .label {
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
            flex-shrink: 1;
        }

        & .timer-label {
            font-size: var(--fontsize-body-xs);
            color: var(--color-text-disabled);
            flex-shrink: 0;

            &.timer-current {
                color: var(--color-brand);
                font-weight: bold;
            }
        }
    }
</style>

<div class="overview">
    {#if stepsState.tabs}
        <div class="tabs">
            <TabGroup tabs={stepsState.tabs} {activeTab} on:change={handleTabChange} />
        </div>
        <div>
            {#each stepsState.tabs as tab (tab.key)}
                <div role="tabpanel" class="tabpanel" class:hidden={tab.key !== activeTab}>
                    <StepsFocusContainer bind:hasFocus={hasFocus[tab.key]}>
                        {#each stepsState.sections[tab.key] as section (section.sectionId)}
                            {#if stepsState.hasSections}
                                <div class="ui-heading tabpanel-heading" id={section.sectionHeaderId}>
                                    <div class="label">{section.sectionLabel}</div>
                                    {#if section.timer}
                                        <div class="timer-label" class:timer-current={section.timer.current}>
                                            {section.timer.label}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                            <StepProgress
                                ariaLabelledBy={stepsState.hasSections ? section.sectionHeaderId : void 0}
                                space="large"
                                wrap={true}
                                firstFocusableKey={stepsState.sections[tab.key][0].steps[0].key}
                                containerHasFocus={hasFocus[tab.key]}
                                current={stepsState.currentItemPosition}
                                steps={section.steps}
                                {disabled}
                                on:move={handleStepMove} />
                        {/each}
                    </StepsFocusContainer>
                </div>
            {/each}
        </div>
    {/if}
</div>
