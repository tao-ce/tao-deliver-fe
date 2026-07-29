<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2025 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { __, visibilityObserver, generateElementId, resizeObserver } from '@oat-sa-private/ui-core';
    import {
        HeaderBar,
        Panel,
        TabGroup,
        Notification,
        NotificationContainer,
        clearNotifications
    } from '@oat-sa-private/ui-components';
    import Transition from './layout/Transition.svelte';
    import { testSessionStatus } from './session/sessionStates.js';
    import { reviewResponseDisplays } from './session/reviewResponseDisplays.js';
    import { getTestSessionStatusStore } from './testsStateStore.js';
    import { setScreenSize, screenSize } from './screenSizeStore.js';
    import Overlay from './layout/overlay/Overlay.svelte';
    import FloatingToolbarAreas from './layout/FloatingToolbarAreas.svelte';

    const dispatch = createEventDispatcher();

    /**
     * The test runner main layout component for review mode
     * @property {string} serviceCallId - id of test session
     * @property {boolean} [showResponse] - show "Answer" tab
     * @property {boolean} [showCorrect] - show "Correct" tab
     * @property {boolean} [showQuestion] - show "Question" tab
     * @property {boolean} [showScore] - in "Answer" tab, show the test-taker's score per item
     * @property {number} [score] - the total score achieved by the test-taker
     * @property {number} [maxScore] - the maximum score of the test
     * @property {boolean} [waitingForExternalScore] - show a message that scores are not ready yet
     * @property {Object} [scoringData] - object containing data added by scoring application for current item
     * @property {Object} [theme] - contains the test runner theming information
     * @property {boolean} [theme.hideMenuButton] - hide menu button from header
     * @property {Object} [plugins] - plugins object, in format { pluginName: PluginAPI }
     * @property {Object} [options] - options object (part of testRunnerConfiguration)
     */
    export let serviceCallId;
    export let showResponse = false;
    export let showCorrect = false;
    export let showQuestion = true;
    export let showScore = false;
    export let allItemsMode = false;
    export let score = 0;
    export let maxScore = 0;
    export let waitingForExternalScore = false;
    export let scoringData = {};
    export let theme = {};
    export let plugins = {};

    const status = getTestSessionStatusStore(serviceCallId);

    //list of main test runner areas
    const areas = {};

    // For header & footer scroll shadows:
    let fullyScrolledUp = true;
    let fullyScrolledDown = true;

    let menuPanelOpen = false;

    const panelId = generateElementId('panel');

    const showMenuButton = theme && !theme.hideMenuButton;
    // startActions configures the buttons at the start of the HeaderBar
    $: startActions = showMenuButton
        ? [
              {
                  key: 'menu',
                  icon: 'menu',
                  label: __('Main menu'),
                  ariaLabel: __('Main menu'),
                  dataTestId: 'mainmenu',
                  ariaHasPopup: true,
                  ariaControls: panelId,
                  ariaExpanded: menuPanelOpen
              }
              //ONLY FOR TESTING:
              //highlighter button is added only for Instructor in manual-scoring header, if "x-tao-option-highlighter" item category.
              //Learner doesn't have highlighter.
              //   {
              //       key: 'highlighter',
              //       icon: 'highlighter',
              //       label: __('highlighter')
              //   }
          ]
        : [];

    /**
     * Header Bar items click handler
     * @param {Event} event
     */
    function handleHeaderBarAction(event) {
        // forward all HeaderBar events to qti.js which will broadcast
        dispatch('toolbaraction', event.detail);

        if (event.detail.key === 'menu') {
            menuPanelOpen = true;
        }
    }

    /**
     * Returns if area should be hidden from testLayout based on areaHider plugin config
     * @param {string} areaId
     * @returns {boolean}
     */
    function isHiddenArea(areaId) {
        return plugins?.areaHider?.hiddenAreas?.includes(areaId);
    }

    // eslint-disable-next-line no-unused-vars
    let floatingToolsHeight = 0; // measured from element

    let windowWidth;
    let windowHeight;
    $: setScreenSize(windowWidth);

    $: headerBarHidden = $status === testSessionStatus.overlay && $screenSize.mobile;

    // innerHeight from svelte always return value in px. It creates situation where real test runner height differs from innerHeight after zooming/resizing. To avoid scrollbars, test runner height decreased on 1px.
    $: safeWindowHeight = windowHeight && windowHeight - 1;

    // Tab configuration

    $: reviewTabs = [
        showQuestion && {
            key: reviewResponseDisplays.question,
            label: allItemsMode ? __('Questions') : __('Question')
        },
        showResponse && {
            key: reviewResponseDisplays.answer,
            label: getAnswerTabLabel(score, maxScore, waitingForExternalScore)
        },
        showCorrect && {
            key: reviewResponseDisplays.correct,
            label: __('Correct')
        }
    ].filter(tab => tab);

    let activeTab;
    setActiveTab();
    $: setActiveTab(showResponse, showQuestion);

    function getAnswerTabLabel() {
        const answerLabel = allItemsMode ? __('Answers') : __('Answer');
        if (!showScore || !maxScore) {
            return answerLabel;
        }
        if (waitingForExternalScore) {
            return [answerLabel, { text: `( - / - )`, class: 'tablabel-waiting' }];
        }
        return [
            answerLabel,
            {
                text: `( ${score} / ${maxScore} )`,
                class: score === maxScore ? 'success' : score > 0 ? 'tablabel-partial' : 'warning'
            }
        ];
    }

    /**
     * Reset active tab, if show tab settings have changed
     */
    function setActiveTab() {
        if (showResponse) {
            activeTab = 'answer';
        } else if (showQuestion) {
            activeTab = 'question';
        } else {
            activeTab = 'correct';
        }
    }

    /**
     * Return with active response display name
     * @returns {string}
     */
    export const getResponseDisplay = () => activeTab;

    /**
     * TabGroup change event handler
     * @event changeResponseDisplay
     * @param {CustomEvent} e
     */
    function onTabChange(e) {
        if (activeTab !== e.detail.key) {
            activeTab = e.detail.key;
            dispatch('changeResponseDisplay', {
                displayName: activeTab
            });
        }
    }

    onMount(() => {
        /**
         * @event mount
         * @param {Object} areas - refs to main areas elements
         */
        setTimeout(() => dispatch('mount', { areas }), 0);
    });

    onDestroy(() => {
        clearNotifications();
    });
</script>

<style>
    .test-runner {
        /* local vars */
        --testrunner-header-height: 7rem;
        --testrunner-footer-height: 9rem;
        --testrunner-item-top-padding: 0rem;
        --testrunner-item-bottom-padding: 0rem;
        --testrunner-tabs-bottom-margin: 2rem;
        --testrunner-tabs-height: 5.5rem;
        --testrunner-item-max-width: 170.25rem;
        --testrunner-item-vertical-writing-min-margin: 9rem;

        /* this variable will be passed to itemRunner */
        --testrunner-item-container-height: calc(
            var(--window-height) - var(--testrunner-header-height) - var(--testrunner-footer-height) -
                var(--testrunner-item-top-padding) - var(--testrunner-item-bottom-padding) -
                var(--testrunner-tabs-height) - var(--testrunner-tabs-bottom-margin)
        );
        --testrunner-item-container-width: min(var(--testrunner-item-max-width), 100vw);
        --testrunner-item-container-offset-right: calc((100vw - var(--testrunner-item-container-width)) / 2 - 0.125rem);

        @media screen and (--mq-maxwidth-medium) {
            --testrunner-header-height: 6rem;
            --testrunner-footer-height: 9rem;
        }
    }

    .test-runner {
        height: 100%;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        overscroll-behavior: none;

        color: var(--color-text-default);
    }
    .top-bar {
        z-index: var(--layer-4);
        position: relative;
    }

    .bottom-bar {
        z-index: var(--layer-4);
    }
    .top-bar.overlay {
        z-index: calc(var(--layer-4) + 1);
    }
    .top-bar :global(img) {
        max-height: calc(var(--testrunner-header-height) - 2rem);
    }
    main {
        height: 100%;
        position: relative;
        overflow: hidden auto;
        background: var(--color-bg-default);
    }
    .qti-item-container {
        min-height: 100%;

        @media screen and (--mq-minwidth-huge) {
            padding: 0;
            max-width: var(--testrunner-item-max-width);
            margin: 0 auto;
        }
        &:empty {
            padding: 0;
        }
        & :global(.tabgroup) {
            & :global(.scrollbox) {
                margin-bottom: var(--testrunner-tabs-bottom-margin);
            }
            & :global(.tablabel-partial) {
                color: var(--color-partial);
            }
            & :global(.tablabel-waiting) {
                color: var(--color-text-disabled);
            }
        }
        & .item-content-container {
            position: relative;
        }
    }
    .panel-content {
        height: 100%;
    }

    .header-bar-content {
        width: 100%;
        white-space: nowrap;
    }

    .hidden-item-container {
        position: absolute;
        z-index: var(--layer-back);
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        overflow: visible;
    }
    .header-title {
        display: inline-block;
    }
    .header-label {
        display: inline-block;
        margin-block: 0;
        margin-inline: 0 1.5rem;
        padding: 0.4rem 0.7rem 0.3rem 0.7rem;
        border: var(--border-thin) solid var(--color-brand-hover);
        font-size: var(--fontsize-body-xs);
        line-height: 1;
        color: var(--color-brand-hover);
        white-space: nowrap;
        text-transform: uppercase;
    }
    .scorer-comments-overall {
        background: var(--color-bg-info);
        padding: 1.5rem 2rem;
        margin: 2rem 2rem 6rem;

        & h6 {
            margin-top: 1rem;
        }
        & pre {
            /* override some LDS <pre> styles */
            font-family: var(--font-ui);
            text-wrap: wrap;
        }
    }
    .inline-notification {
        margin: min(1.25rem, calc(1.25rem - var(--testrunner-tabs-bottom-margin))) 0 1.25rem 0;
        @media screen and (--mq-maxwidth-huge) {
            margin-left: 1.25rem;
            margin-right: 1.25rem;
        }
    }

    .transition-wrapper {
        display: contents;
    }

    .floating-toolbars-wrapper {
        pointer-events: none; /* it may cover interactive elements */
        inset-inline-end: 0;
        margin: 0 4rem; /* should not cover item scrollbar */
        @media screen and (--mq-maxwidth-small) {
            margin: 0 1rem;
        }
    }

    /* override NotificationContainer's default positioning */
    .notification-container-wrapper {
        pointer-events: none; /* it may cover interactive elements */
        position: absolute;
        width: 100%;
        inset-inline-end: 0;
        top: calc(var(--testrunner-header-height) + var(--testrunner-item-top-padding));
        margin: 0 3rem; /* should not cover item scrollbar */
        z-index: calc(var(--layer-5) + 1);
        @media screen and (--mq-maxwidth-small) {
            margin: 0;
        }
        & :global(.notification-wrapper) {
            pointer-events: initial;
        }
    }

    :global(.modal-wrapper.modal-wrapper) {
        z-index: var(--layer-5);
    }

    /* see item-runner */
    :global(body.item-writing-mode-vertical-rl) {
        --testrunner-item-max-width: calc(100vw - 2 * var(--testrunner-item-vertical-writing-min-margin));
        & .qti-item-container {
            margin: 0 var(--testrunner-item-vertical-writing-min-margin);
        }
    }
</style>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<div
    class="test-runner use-a11y-text-styles {$status || testSessionStatus.initial}"
    style="
        --window-height:{safeWindowHeight ? `${safeWindowHeight}px` : '100vh'};
    "
    bind:this={areas.testRunner}>
    <div bind:this={areas.jumpMenu}></div>
    <div
        id="test-top-bar"
        class="top-bar"
        class:overlay={$status === testSessionStatus.overlay}
        class:shadow-bottom={!fullyScrolledUp}
        bind:this={areas.topBar}>
        <div class:hidden={headerBarHidden}>
            <HeaderBar on:action={handleHeaderBarAction} {startActions} maxEndActions={10}>
                <div class="header-bar-content">
                    <div class="header-label">{__('Review')}</div>
                    <div class="header-title" bind:this={areas.header}></div>
                </div>
                <div
                    class="floating-toolbars-wrapper"
                    bind:this={areas.tools}
                    class:not-displayed={isHiddenArea('tools')}
                    use:resizeObserver
                    on:resized={e => (floatingToolsHeight = e.detail.height)}>
                    <FloatingToolbarAreas {serviceCallId} {plugins} />
                </div>
            </HeaderBar>
        </div>
    </div>

    <!-- This should be the only NotificationContainer rendered in the app.
    Its API methods allow any code to add or remove Notifications here. -->
    <div class="notification-container-wrapper not-printable">
        <NotificationContainer />
    </div>

    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <main
        id="test-main"
        aria-labelledby="a11y-main"
        role={$status === testSessionStatus.overlay ? 'none' : 'main'}
        tabindex={$status === testSessionStatus.overlay ? '-1' : '0'}
        aria-hidden={$status === testSessionStatus.overlay ? 'true' : void 0}
        bind:this={areas.main}
        on:fullyScrolledUp={e => (fullyScrolledUp = e.detail)}
        on:fullyScrolledDown={e => (fullyScrolledDown = e.detail)}>
        <div
            class="scroll-first-child"
            use:visibilityObserver={areas.main || void 0}
            on:isVisible={e => (fullyScrolledUp = e.detail)}></div>
        <!-- svelte-ignore a11y-missing-content -->
        <h2 id="a11y-main" class="visually-hidden" tabindex="-1"></h2>
        <!-- tabindex because it should be programmatically focusable -->

        <div class="qti-item-container">
            <TabGroup
                tabs={reviewTabs}
                {activeTab}
                on:change={onTabChange}
                disabled={$status !== testSessionStatus.interacting} />

            <!-- block to be moved out of TestReviewLayout, as it should appear above each rendered item -->
            {#if !allItemsMode && activeTab === 'answer' && scoringData?.comments?.overall}
                <div class="scorer-comments-overall">
                    <h6>{__('Overall feedback')}</h6>
                    <!-- careful with template whitespace inside <pre> -->
                    <pre class="content">{scoringData.comments.overall.content || ''}</pre>
                </div>
            {/if}

            <!-- block to be moved out of TestReviewLayout, as it should appear above each rendered item -->
            {#if !allItemsMode && showScore && waitingForExternalScore}
                <div class="inline-notification" class:hidden={activeTab !== 'answer'}>
                    <Notification
                        key={0}
                        title={__('Awaiting manual scoring')}
                        message={__(
                            'All or part of this question needs to be manually scored. Please check back later to view the score.'
                        )}
                        hierarchy="neutral"
                        closeable={false} />
                </div>
            {/if}
            <div
                class="item-content-container"
                class:hidden-item-container={$status === testSessionStatus.loading}
                bind:this={areas.content}
                aria-hidden={$status === testSessionStatus.loading ? true : void 0}></div>
        </div>

        <div class="transition-wrapper">
            {#if $status === testSessionStatus.loading}
                <Transition text={__('loading')} subtext={__('Please wait a little longer while your content loads')} />
            {/if}
        </div>

        <div
            class="scroll-last-child"
            use:visibilityObserver={areas.main || void 0}
            on:isVisible={e => (fullyScrolledDown = e.detail)}></div>
    </main>

    <nav
        id="test-navigation"
        class="bottom-bar"
        class:shadow-top={!fullyScrolledDown}
        aria-hidden="true"
        bind:this={areas.navigation}>
        <h2 class="visually-hidden">{__('Test Navigation')}</h2>
    </nav>

    <Overlay open={$status === testSessionStatus.overlay}>
        <div slot="header" bind:this={areas.overlayHeader}></div>
        <div slot="content" bind:this={areas.overlayContent}></div>
        <div slot="footer" bind:this={areas.overlayFooter}></div>
    </Overlay>
</div>

<Panel bind:open={menuPanelOpen} id={panelId}>
    <div class="panel-content" bind:this={areas.panel}></div>
</Panel>
