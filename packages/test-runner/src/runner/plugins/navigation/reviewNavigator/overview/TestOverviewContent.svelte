<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2022 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { __, generateElementId } from '@oat-sa-private/ui-core';
    import { TabGroup, StepProgress, Notification } from '@oat-sa-private/ui-components';
    import { getTestStateStore } from '../../../../testsStateStore.js';
    import stepProgressHelperFactory from '../stepProgressHelper.js';
    import getItemViewPositions from '../../navigator/getItemViewPositions.js';
    import StepsFocusContainer from '../../navigator/StepsFocusContainer.svelte';
    import { getPartTitle } from '../../../../util/testPart.js';
    import { calculateTotalScore, isItemWaitingForExternalScore } from '../../../../util/testMap.js';
    import { Icon } from '@oat-sa-private/ui-elements';

    const dispatch = createEventDispatcher();

    export let serviceCallId;
    export let showScore = false;

    const testStateStore = getTestStateStore(serviceCallId);

    const tabKeys = Object.freeze({
        all: 'all',
        incorrect: 'incorrect'
    });
    let activeTab = tabKeys.all;
    let hasFocus = {};

    const { totalScore, totalMaxScore, waitingForExternalScore } =
        showScore && calculateTotalScore(testStateStore.getTestMap());
    const scoreOutcomes = showScore && (testStateStore.getTestMap().scoreOutcomes || {});
    const getStep = stepProgressHelperFactory({ showScore });

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
     * @param {Object} testMap - testMap object from store
     * @returns {Array} array of sections of parts with their steps for the tab, mapped to component's format
     */
    function getTabSteps(filterItemFunc, testMap) {
        const parts = Object.values(testMap.parts);
        return parts
            .map(part => {
                const viewPositions = getItemViewPositions(part);
                const sections = Object.values(part.sections);
                return {
                    partId: part.id,
                    partLabel: getPartTitle(part, testMap, true),
                    partHeaderId: generateElementId('partheader'),
                    hasSections: sections.length > 1,
                    sections: sections
                        .map(section => {
                            let items = Object.values(section.items);
                            if (filterItemFunc) {
                                items = items.filter(filterItemFunc);
                            }
                            return {
                                sectionId: section.id,
                                sectionLabel: section.label,
                                sectionHeaderId: generateElementId('sectionheader'),
                                steps: items.map(item => getStep(item, false, viewPositions[item.position]))
                            };
                        })
                        .filter(i => i.steps.length > 0)
                };
            })
            .filter(part => part.sections.length > 0);
    }

    /**
     * Check if item is incorrect
     * @param {Object} item - Item object from store
     * @param {Number} [item.score] - Reached point by test taker
     * @param {Number} [item.maxScore] - Max point
     * @returns {Boolean} if item is incorrect
     */
    function isItemIncorrect(item) {
        return item.maxScore && item.maxScore !== item.score && !isItemWaitingForExternalScore(item);
    }

    /**
     * Load data for Tabs and Sections and Steps from store and map it to component's format
     * @returns {Object} mapped data
     */
    function loadStepsState() {
        const testContext = testStateStore.getTestContext();
        const testMap = testStateStore.getTestMap();
        if (Object.keys(testContext).length === 0 || Object.keys(testMap).length === 0) {
            return {};
        }

        const currentItemPosition = testContext.itemPosition;
        const all = getTabSteps(null, testMap);

        const parts = {
            [tabKeys.all]: all
        };
        const tabs = [{ key: tabKeys.all, label: __('all questions') }];

        if (showScore) {
            parts[tabKeys.incorrect] = getTabSteps(isItemIncorrect, testMap);
            tabs.push({ key: tabKeys.incorrect, label: __('incorrect') });
        }

        return {
            currentItemPosition,
            hasParts: Object.keys(testMap.parts).length > 1,
            parts,
            tabs
        };
    }

    $: stepsState = $testStateStore ? loadStepsState() : {};
</script>

<style>
    @define-mixin steps-width {
        width: calc(var(--steps-per-row) * var(--step-width));
    }

    .overview {
        --steps-margin: 1.125rem;
        --step-width: 7.25rem;
        --steps-per-row: 20;
        --overview-top-padding: var(--space-6x);

        padding-top: var(--overview-top-padding);
        padding-bottom: var(--space-6x);

        @media screen and (--mq-maxwidth-medium) {
            --steps-per-row: 5;
            --overview-top-padding: 0rem;
            padding-bottom: var(--space-2x);
        }
        @media screen and (--mq-minwidth-medium) and (--mq-maxwidth-large) {
            --steps-per-row: 10;
            --overview-top-padding: var(--space-4x);
            padding-bottom: var(--space-4x);
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
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
            font-weight: normal;
        }

        & .main {
            font-weight: bold;
        }
    }

    .inline-notification {
        @add-mixin steps-width;
        margin: min(1.25rem, calc(1.25rem - var(--overview-top-padding))) auto 1.25rem auto;

        @media screen and (--mq-maxwidth-medium) {
            width: auto;
            margin-left: 1.25rem;
            margin-right: 1.25rem;
        }
    }

    .total-score {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-bottom: var(--space-4x);
        line-height: 6rem;

        & .title {
            color: var(--color-text-feedback);
            font-size: var(--fontsize-heading);
            font-weight: normal;
            margin: 0;
            line-height: 3rem;
        }

        & .score-details {
            display: flex;
            gap: 2rem;
            margin: 0;

            & .passed {
                color: var(--color-success);
            }

            & .failed {
                color: var(--color-warning);
            }

            & .cut-score-feedback {
                display: flex;
                align-items: center;
            }
        }
    }
</style>

<div class="overview">
    {#if showScore}
        {#if waitingForExternalScore}
            <div class="inline-notification">
                <Notification
                    key={0}
                    title={__('There are still questions waiting to be scored')}
                    message={__(
                        'Your total score cannot be calculated until all of the questions have been scored. Please come back later to see your total score.'
                    )}
                    hierarchy="neutral"
                    closeable={false} />
            </div>
        {:else}
            <article class="total-score ui-heading-l">
                <h1 class="title">{__('Total score')}</h1>
                <p class="score-details">
                    <span>{totalScore} / {totalMaxScore}</span>
                    {#if (scoreOutcomes.isPassed ?? null) !== null}
                        {#if scoreOutcomes.isPassed}
                            <span class="cut-score-feedback passed"><Icon name="checkbox-check-24" />Pass</span>
                        {:else}
                            <span class="cut-score-feedback failed"><Icon name="warning-unframed-24" />Fail</span>
                        {/if}
                    {/if}
                </p>
            </article>
        {/if}
    {/if}
    {#if stepsState.tabs}
        <div class="tabs">
            <TabGroup tabs={stepsState.tabs} {activeTab} on:change={handleTabChange} />
        </div>
        <div>
            {#each stepsState.tabs as tab (tab.key)}
                <div role="tabpanel" class="tabpanel" class:hidden={tab.key !== activeTab}>
                    <StepsFocusContainer bind:hasFocus={hasFocus[tab.key]}>
                        {#each stepsState.parts[tab.key] as part (part.partId)}
                            {#if stepsState.hasParts}
                                <div class="ui-heading tabpanel-heading main" id={part.partHeaderId}>
                                    {part.partLabel}
                                </div>
                            {/if}
                            {#each part.sections as section (section.sectionId)}
                                {#if part.hasSections}
                                    <div class="ui-heading tabpanel-heading" id={section.sectionHeaderId}>
                                        {section.sectionLabel}
                                    </div>
                                {/if}
                                <StepProgress
                                    ariaLabelledBy={stepsState.hasSections ? section.sectionHeaderId : void 0}
                                    space="large"
                                    wrap={true}
                                    firstFocusableKey={stepsState.parts[tab.key][0].sections[0].steps[0].key}
                                    containerHasFocus={hasFocus[tab.key]}
                                    current={stepsState.currentItemPosition}
                                    steps={section.steps}
                                    on:move={handleStepMove} />
                            {/each}
                        {/each}
                    </StepsFocusContainer>
                </div>
            {/each}
        </div>
    {/if}
</div>
