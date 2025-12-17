<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
    import { onDestroy, onMount } from 'svelte';
    import { getPartTitle } from '../../../util/testPart.js';
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestStateStore, getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { getTimersStore } from '../../../timers/timersStore.js';
    import { getTimerLabelForLevel } from '../../../timers/timerLabel.js';
    import { screenSize } from '../../../screenSizeStore.js';

    export let serviceCallId;

    const titleTypes = {
        test: 'test',
        testPart: 'testPart',
        section: 'section',
        item: 'item'
    };

    const titleTypeWeights = {
        test: 3,
        testPart: 2,
        section: 1,
        item: 0
    };

    const defaultTitles = [
        { type: titleTypes.test },
        { type: titleTypes.testPart },
        { type: titleTypes.section },
        { type: titleTypes.item }
    ];

    export let titles = defaultTitles;

    const testStateStore = getTestStateStore(serviceCallId);
    const statusStore = getTestSessionStatusStore(serviceCallId);
    const timersStore = getTimersStore(serviceCallId);

    let withTimers = false;
    let windowWidth = window.innerWidth;
    let zoomLvl = 100;
    let mutationObserver;

    /**
     * Calculate titles from the test map based on titles format
     * @returns {Object[]} the titles
     */
    function calculateTitles() {
        const result = [];
        const testMap = testStateStore.getTestMap();
        const testContext = testStateStore.getTestContext();
        if (testMap) {
            let actualTitles = titles;
            const timerDatas = timersStore.getTimersForContext(testContext);

            if (timerDatas.some(({ level }) => Object.keys(titleTypes).includes(level)) && titles !== defaultTitles) {
                // 1. ignore order override
                // 2. show titles with timer or defined in claim
                actualTitles = defaultTitles.reduce((memo, { type }) => {
                    const hasTimer = timerDatas.some(timerData => timerData.level === type);
                    const title = titles.find(i => i.type === type);

                    if (title || (hasTimer && type !== titleTypes.item)) {
                        memo.push({
                            type,
                            label: title?.label
                        });
                    }
                    return memo;
                }, []);
            }

            for (const { type, label } of actualTitles) {
                if (!titleTypes[type]) {
                    continue;
                }

                const labelOverride = typeof label === 'string' ? label : null;
                let titleData;
                let timerData;
                switch (type) {
                    case titleTypes.test:
                        titleData = { label: labelOverride || testMap.title, type };
                        timerData = timerDatas.find(i => i.level === 'test');
                        break;

                    case titleTypes.testPart: {
                        const testPart = testStateStore.getCurrentTestPart();
                        if (anyTestPartHasTimer(testMap)) {
                            if (testPart) {
                                titleData = { label: labelOverride || getPartTitle(testPart, testMap), type };
                                timerData = timerDatas.find(i => i.level === 'testPart');
                            }
                        }
                        break;
                    }

                    case titleTypes.section: {
                        const section = testStateStore.getCurrentSection();
                        if (section) {
                            titleData = { label: labelOverride || section.label, type };
                            timerData = timerDatas.find(i => i.level === 'section');
                        }
                        break;
                    }

                    case titleTypes.item: {
                        const item = testStateStore.getCurrentItem();
                        if (item) {
                            titleData = { label: labelOverride || item.label, type };
                            timerData = timerDatas.find(i => i.level === 'item');
                        }
                        break;
                    }
                }

                if (titleData && titleData.label) {
                    if (timerData) {
                        const { label: timerLabel, ariaLabel: timerAriaLabel } = getTimerLabelForLevel(
                            timerData.level,
                            testContext,
                            timersStore
                        );
                        if (timerLabel) {
                            titleData.timer = {
                                label: timerLabel,
                                ariaLabel: timerAriaLabel,
                                timeLeft: timerData.timerValue.timeLeft
                            };
                            if (titleHasTimerLabel(titleData)) {
                                titleData.minWidth = (timerLabel.length * 8) / 10; //width of 1 letter is ~0.8rem
                            }
                        }
                    }
                    result.push(titleData);
                }
            }

            const lowestLevelTimerTitle = findLowestLevelTimerTitle(result, timerDatas);
            if (lowestLevelTimerTitle) {
                lowestLevelTimerTitle.timer.current = true;
            }
        }

        return result;
    }

    /**
     * Find item data for the lowest level (item,section,part,test)
     * @param {Object[]} titleDatas
     * @param {Object[]} timerDatas
     * @returns {Object|null}
     */
    function findLowestLevelTimerTitle(titleDatas, timerDatas) {
        //in case of title overrides, titleData for item may not exist, so check for item timer in timerDatas
        if (!timerDatas.find(i => i.level === 'item')) {
            const timeredSortedByType = titleDatas
                .filter(i => i.timer)
                .sort((a, b) => titleTypeWeights[a.type] - titleTypeWeights[b.type]);
            if (timeredSortedByType.length) {
                return timeredSortedByType[0];
            }
        }
        return null;
    }

    /**
     * Find item data that has a timer with smallest remaining times;
     * Does not include timed-out items, does not check extra
     * @param {Object[]} titleDatas
     * @returns {Object|null}
     */
    function findSmallestTimeTimerTitle(titleDatas) {
        const timeredItems = titleDatas.filter(i => i.timer);
        const minTimeLeft = Math.min(...timeredItems.map(a => a.timer.timeLeft));
        const timeredSortedByTime = timeredItems
            .filter(a => a.timer.timeLeft === minTimeLeft)
            .sort((a, b) => titleTypeWeights[a.type] - titleTypeWeights[b.type]);
        if (timeredSortedByTime.length) {
            return timeredSortedByTime[0];
        }
        return null;
    }

    /**
     * Does this breadcrumb item need a timer label
     * @param {Object} titleData
     * @returns {Boolean}
     */
    function titleHasTimerLabel(titleData) {
        return titleData.timer && titleData.type !== titleTypes.item;
    }

    /**
     * Does any part of this test have timer or not
     * @param {Object} testMap
     * @returns {Boolean}
     */
    function anyTestPartHasTimer(testMap) {
        return (
            testMap.parts &&
            Object.keys(testMap.parts)
                .map(partId => timersStore.getTimerFor('testPart', partId))
                .some(Boolean)
        );
    }

    /**
     * Set how title is shown on mobile screen
     * @param {Object[]} titleItems
     * @param {Boolean} isMobileSize
     * @returns {Object[]} the titles
     */
    function makeResponsive(titleItems = [], isMobileSize) {
        if (titleItems && titleItems.length) {
            if (isMobileSize) {
                const smallestTimeTimerTitle = findSmallestTimeTimerTitle(titleItems);
                if (smallestTimeTimerTitle && titleHasTimerLabel(smallestTimeTimerTitle)) {
                    titleItems = [smallestTimeTimerTitle];
                } else {
                    titleItems = [];
                }
            }
        }
        return titleItems;
    }

    onMount(() => {
        const bodyElement = document.body;
        mutationObserver = new MutationObserver(mutationsList => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-zoom-level') {
                    const dataZoomLevel = mutation.target.getAttribute('data-zoom-level');
                    zoomLvl = parseInt(dataZoomLevel, 10);
                }
            }
        });

        // Observer on data-zoom-level attribute
        mutationObserver.observe(bodyElement, { attributes: true, attributeFilter: ['data-zoom-level'] });
    });

    onDestroy(() => {
        if (mutationObserver) {
            mutationObserver.disconnect();
        }
    });

    $: mobileSize = ($screenSize && $screenSize.mobile) || (zoomLvl >= 200 && windowWidth <= 1600);
    $: items = $testStateStore && $timersStore ? makeResponsive(calculateTitles(), mobileSize) : [];

    $: withTimers = items.some(i => titleHasTimerLabel(i));
</script>

<style>
    h1 {
        /* reset typographical styles of h1 */
        font-size: var(--fontsize-body);
        font-weight: normal;
        margin: 0;
    }

    .breadcrumb {
        display: flex;
        margin: 0;
        padding: 0;
        width: 100%;
    }

    [role='listitem'] {
        overflow: visible;
        flex-shrink: 6;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: var(--min-width, 0);
        padding: var(--border-medium);

        &:first-child {
            flex-shrink: 4;
        }
        &:last-child {
            flex-shrink: 1;
        }

        /* Fix to not cut borders */
        & > :global-nested(*) {
            @add-mixin outline-focus 0rem;
        }
    }

    .with-timers [role='listitem'] {
        position: relative;
        padding-bottom: 2rem;
    }

    .separator {
        padding: 0 0.45rem;
        padding-inline: 1rem;
        flex: none;
    }

    .label {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .timer-label {
        color: var(--color-brand);
        font-size: var(--fontsize-body-xs);
        position: absolute;
        inset-inline-start: 0.25rem;
        bottom: 0;

        &.timer-current {
            font-weight: bold;
        }
    }
</style>

<svelte:window bind:innerWidth={windowWidth} />

{#if $statusStore === testSessionStatus.interacting || $statusStore === testSessionStatus.overlay}
    <h1 class:with-timers={withTimers}>
        <span class="breadcrumb" role="list" aria-label={__('breadcrumb')}>
            {#each items as item, index}
                {#if index > 0}
                    <span aria-hidden="true" class="separator">/</span>
                {/if}
                <span
                    role="listitem"
                    class="content"
                    aria-current={items.length === index + 1 ? 'location' : void 0}
                    style={item.minWidth ? `--min-width: ${item.minWidth}rem` : void 0}>
                    <span class="label">{item.label}</span>
                    {#if titleHasTimerLabel(item)}
                        <span class="timer-label" class:timer-current={item.timer.current} role="timer" aria-live="off">
                            <span aria-hidden="true">{item.timer.label}</span>
                            <span class="visually-hidden">{item.timer.ariaLabel}</span>
                        </span>
                    {/if}
                </span>
            {/each}
        </span>
    </h1>
{/if}
