<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2025 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { __, visibilityObserver, generateElementId } from '@oat-sa-private/ui-core';
    import { HeaderBar, Panel, NotificationContainer, clearNotifications } from '@oat-sa-private/ui-components';
    import Transition from './layout/Transition.svelte';
    import ItemHanger from './layout/itemHanger/ItemHanger.svelte';
    import UserMenu from './layout/userMenu/UserMenu.svelte';
    import { testSessionStatus } from './session/sessionStates.js';
    import { isItemModalFeedbackState } from './util/testContext.js';
    import { getTestSessionStatusStore, getTestStateStore } from './testsStateStore.js';
    import { setScreenSize, screenSize } from './screenSizeStore.js';
    import { getTestSessionUserDataService } from './session/testSessionUserDataService.js';
    import { getNavigationFeedbacksStore } from './feedback';
    import Overlay from './layout/overlay/Overlay.svelte';
    import FloatingToolbarAreas from './layout/FloatingToolbarAreas.svelte';
    import { createToolbarItemsApi } from './layout/toolbarItems.js';
    import resizeObserve from '@oat-sa-private/tao-item-runner-qtinui/src/runner/interactions/util/actions/resizeObserve.js';
    import FeedbackDialogsContainer from './feedback/FeedbackDialogsContainer.svelte';
    import { testLayoutStore, clearTestLayoutStore } from './layout/testLayoutStore.js';

    const dispatch = createEventDispatcher();

    /**
     * The test runner main layout component
     * @property {string} serviceCallId - id of test session
     * @property {Object} [theme] - contains the test runner theming information
     * @property {Object} [theme.logo] - a custom logo
     * @property {string} [theme.logo.src] - custom logo source
     * @property {string} [theme.logo.alt] - custom logo alternative text
     * @property {boolean} [theme.hideMenuButton] - hide menu button from header
     * @property {boolean} [theme.showUserMenu] - hide user menu from header
     * @property {Object?} [testTaker] - user info
     * @property {Object[]} [itemHangerMessages] - list of item hanger messages
     * @property {Object} [plugins] - plugins object, in format { pluginName: PluginAPI }
     * @property {Object} [options] - options object (part of testRunnerConfiguration)
     */
    export let serviceCallId;
    export let theme = {};
    export let testTaker;
    export let itemHangerMessages = [];
    export let plugins = {};

    const status = getTestSessionStatusStore(serviceCallId);
    const testStateStore = getTestStateStore(serviceCallId);
    const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();
    const navigationFeedbacksStore = getNavigationFeedbacksStore(serviceCallId);

    //list of main test runner areas
    const areas = {};

    // For header & footer scroll shadows:
    let fullyScrolledUp = true;
    let fullyScrolledDown = true;

    const panelId = generateElementId('panel');
    const a11yPanelId = generateElementId('panel');

    let menuPanelOpen = false;

    const showUserMenu = theme && theme.showUserMenu;
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
          ]
        : [];

    // plugins toolbar init + store reactivity
    const toolbarItemsApi = createToolbarItemsApi(plugins, toolsStore);
    // endActions configures the buttons at the end of the HeaderBar
    $: endActions = toolbarItemsApi.getToolbarActions($toolsStore);

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
        return plugins.areaHider && plugins.areaHider.hiddenAreas && plugins.areaHider.hiddenAreas.includes(areaId);
    }

    // floating tools
    let floatingToolsHeight = 0; // measured from element

    let windowWidth;
    let windowHeight;
    $: setScreenSize(windowWidth);

    $: headerBarHidden = $status === testSessionStatus.overlay && $screenSize.mobile;

    // innerHeight from svelte always return value in px. It creates situation where real test runner height differs from innerHeight after zooming/resizing. To avoid scrollbars, test runner height decreased on 1px.
    $: safeWindowHeight = windowHeight && windowHeight - 1;

    $: modalFeedbackIsShown = $navigationFeedbacksStore && navigationFeedbacksStore.isAnyShown();
    $: if (modalFeedbackIsShown) {
        menuPanelOpen = false;
    }

    let logo = (theme && theme.logo) || {
        src: 'logo.svg',
        alt: __('TAO Logo')
    };

    $: isItemModalFeedback = $testStateStore && isItemModalFeedbackState(testStateStore.getTestContext());

    $: isMainAreaMain = [testSessionStatus.initial, testSessionStatus.loading, testSessionStatus.interacting].includes(
        $status
    );

    onMount(() => {
        /**
         * @event mount
         * @param {Object} areas - refs to main areas elements
         */
        setTimeout(() => dispatch('mount', { areas }), 0);
    });

    onDestroy(() => {
        clearNotifications();
        clearTestLayoutStore();
    });
</script>

<style>
    /* local vars */
    :root {
        --testrunner-header-height: 7rem;
        --testrunner-footer-height: 9rem;
        --testrunner-item-top-padding: 0rem;
        --testrunner-item-bottom-padding: 0rem;
        --testrunner-item-max-width: 170.75rem;
        --testrunner-item-vertical-writing-min-margin: 9rem; /* .writing-mode-vertical-rl item: 1.5rem for scroll-shadow, 8rem for bookmark icon */
    }
    .use-a11y-text-styles {
        font-size: var(--fontsize-body);
        line-height: var(--line-height-default);
        letter-spacing: var(--letter-spacing, 0);
        word-spacing: var(--word-spacing, 0);
    }
    .not-displayed {
        display: none;
    }
    .test-runner {
        &.with-item-hanger {
            --testrunner-item-top-padding: 2rem;
            &.with-floating-tools {
                --testrunner-item-bottom-padding: 2rem;
            }
        }
        &.with-floating-tools {
            --testrunner-item-top-padding: var(--floating-tools-height, 5.5rem);
        }

        @media screen and (--mq-maxwidth-medium) {
            --testrunner-header-height: 6rem;
            --testrunner-footer-height: 9rem;
        }
        /* this variable will be passed to itemRunner */
        --testrunner-item-container-height: calc(
            var(--window-height) - var(--testrunner-header-height) - var(--testrunner-footer-height) -
                var(--testrunner-item-top-padding) - var(--testrunner-item-bottom-padding)
        );
        --testrunner-item-container-width: min(var(--testrunner-item-max-width), 100vw);
        --testrunner-item-container-offset-right: calc(
            (100vw - var(--testrunner-item-container-width)) / 2 - 0.125rem
        ); /* centered horizontally */

        --testrunner-aside-top-padding: calc(2rem + var(--testrunner-item-top-padding));
        --testrunner-aside-bottom-padding: calc(2rem + var(--testrunner-item-bottom-padding));
    }
    .test-runner {
        height: 100%;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        overscroll-behavior: none;
        color: var(--color-text-default);
        container-type: inline-size; /* for @container queries of children */
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
    .top-bar {
        & :global(img) {
            max-height: calc(var(--testrunner-header-height) - 2rem);
        }
        & :global(aside) {
            display: flex;
        }
    }
    .item-modalfeedback-nav {
        z-index: var(--layer-4);
        height: var(--testrunner-footer-height);
    }

    main {
        height: 100%;
        position: relative;
        overflow: hidden auto; /* independent scroll without asides */
        background: var(--color-bg-default);

        &.collapsed {
            height: 0;
        }

        & .test-content-columns {
            /* 1 or more columns */
            display: flex;
            flex-direction: row;

            & > * {
                flex: 1 1 0; /* equal columns */
            }

            & .qti-item-container {
                min-height: 100%;
                padding-top: var(--testrunner-item-top-padding);
                padding-bottom: var(--testrunner-item-bottom-padding);
                position: relative;

                @media screen and (--mq-minwidth-huge) {
                    max-width: var(--testrunner-item-max-width);
                    margin: 0 auto;
                }
                &:empty {
                    padding: 0;
                }
            }
        }

        /* 2 or more columns, side-by-side */
        &.with-aside-start,
        &.with-aside-end {
            & .test-content-columns {
                height: 100%;

                & .qti-item-container {
                    @container (1201px <= width) {
                        overflow: hidden auto; /* independent scroll */
                        max-width: min(var(--testrunner-item-max-width), 50cqw);
                    }
                }

                & #test-content-aside-start,
                & #test-content-aside-end {
                    min-height: 100%;
                    height: var(--testrunner-item-container-height, 100%);
                    padding: var(--testrunner-aside-top-padding) 4rem var(--testrunner-aside-bottom-padding);

                    @container (width < 1536px) {
                        padding-inline: 2rem;
                    }
                    @container (1201px <= width) {
                        overflow: hidden auto; /* independent scroll */
                        max-width: min(var(--testrunner-item-max-width), 50cqw);
                    }
                }
            }
        }
    }

    @container (width < 1201px) {
        /* stacked columns */
        main {
            & .test-content-columns {
                display: block;
                height: auto;

                & .qti-item-container {
                    overflow: unset;
                }
            }

            &.with-aside-start,
            &.with-aside-end {
                height: auto;

                & .test-content-columns {
                    height: auto;

                    /* no independent scroll when stacked columns */
                    & .qti-item-container {
                        --testrunner-item-bottom-padding: 4rem;
                        padding-bottom: var(--testrunner-item-bottom-padding);
                    }
                    & #test-content-aside-start,
                    & #test-content-aside-end {
                        min-height: 100%;
                        height: var(--testrunner-item-container-height, 100%);
                        overflow: unset;
                        padding-inline: 4rem;

                        @container (width < 768px) {
                            padding-inline: 2rem;
                        }
                    }
                }
            }
        }
    }

    .panel-content {
        height: 100%;
    }

    .header-bar-content {
        width: 100%;
        display: flex;

        & :global(h1) {
            order: 1;
            overflow: hidden; /* so it can shrink horizontally and get ellipsis */
        }
        & :global(h1 ~ .livesave) {
            order: 2;
            padding-inline-start: 2rem;
        }
    }

    @media screen and (--mq-maxwidth-medium) {
        /* reduce space taken by LiveSaveIndicator */
        .header-bar-content {
            & :global(h1 ~ .livesave) {
                min-width: 4rem;
                & :global(.status) {
                    display: none;
                }
            }
        }
    }
    :global(body[data-zoom-level='150']),
    :global(body[data-zoom-level='175']),
    :global(body[data-zoom-level='200']) {
        /* reduce space taken by LiveSaveIndicator */
        & .header-bar-content {
            & :global(h1 ~ .livesave) {
                min-width: 4rem;
                & :global(.status) {
                    display: none;
                }
            }
        }
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

    .transition-wrapper {
        display: contents;
    }

    .floating-toolbars-wrapper {
        pointer-events: none; /* it may cover interactive elements */
        position: absolute;
        inset-inline-end: 0;
        top: 100%;
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

    /* see 'bookletExport' plugin */
    :global(body.booklet-export-mode) {
        & .qti-item-container {
            width: var(--testrunner-item-max-width);
        }
        & main {
            overflow-x: auto;
        }
    }

    /* see item-runner */
    :global(body.item-writing-mode-vertical-rl) {
        --testrunner-item-max-width: calc(100vw - 2 * var(--testrunner-item-vertical-writing-min-margin));
        & .qti-item-container {
            margin: 0 var(--testrunner-item-vertical-writing-min-margin);
        }
    }

    @media print {
        .test-runner,
        .test-content,
        main,
        .test-content-columns,
        .qti-item-container {
            height: auto !important;
            overflow: visible !important;
        }
        .test-runner,
        .test-content-columns {
            display: block !important; /* seems better for Firefox in some cases */
        }
        .feedback-dialogs-wrapper, /* Safari, x-tao-printable, Ctrl+P, pauseOnBlur+forceFullscreen: security modal will cut item content in the middle */
        .test-runner :global(.draggable-modal),
        .test-runner :global(.not-printable) {
            display: none !important;
        }
    }
</style>

<!-- TODO: this should be the primary place in the app where screen dimensions are measured, and set to the store.
Other instances of bind:inner* could be replaced by the screenSizeStore, if it is available. -->
<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<div
    class="test-runner use-a11y-text-styles {$status || testSessionStatus.initial}"
    class:with-item-hanger={itemHangerMessages.length}
    class:with-floating-tools={floatingToolsHeight > 0}
    style="
        --window-height:{safeWindowHeight ? `${safeWindowHeight}px` : '100vh'};
        --floating-tools-height:{floatingToolsHeight}px;
    "
    aria-hidden={modalFeedbackIsShown ? true : void 0}
    bind:this={areas.testRunner}
    class:not-displayed={isHiddenArea('testRunner')}>
    <div bind:this={areas.jumpMenu} class:not-displayed={isHiddenArea('jumpMenu')}></div>
    <div
        id="test-top-bar"
        class="top-bar not-printable"
        class:overlay={$status === testSessionStatus.overlay}
        class:shadow-bottom={!fullyScrolledUp}
        class:hidden={$status === testSessionStatus.proctorwait}
        bind:this={areas.topBar}
        class:not-displayed={isHiddenArea('topBar')}>
        <div class:hidden={headerBarHidden}>
            <HeaderBar
                on:action={handleHeaderBarAction}
                {startActions}
                {endActions}
                maxEndActions={$screenSize.mobile ? 4 : 9}
                logoSrc={logo.src}
                logoAltText={logo.alt}>
                <div class="header-bar-content" bind:this={areas.header} class:not-displayed={isHiddenArea('header')}></div>
                <div slot="aside-after">
                    {#if showUserMenu}
                        <UserMenu {testTaker} />
                    {/if}
                </div>
            </HeaderBar>
        </div>
        <div
            class="floating-toolbars-wrapper"
            bind:this={areas.tools}
            class:not-displayed={isHiddenArea('tools')}
            use:resizeObserve
            on:resized={e => (floatingToolsHeight = e.detail.height)}>
            <FloatingToolbarAreas {serviceCallId} {plugins} />
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
        role={isMainAreaMain ? 'main' : 'none'}
        tabindex={isMainAreaMain ? '0' : '-1'}
        aria-hidden={isMainAreaMain ? void 0 : 'true'}
        bind:this={areas.main}
        class:with-aside-start={$testLayoutStore.asideStart}
        class:with-aside-end={$testLayoutStore.asideEnd}
        class:collapsed={$status === testSessionStatus.loading}
        class:not-displayed={isHiddenArea('main')}>
        <div
            class="scroll-first-child"
            use:visibilityObserver={areas.main || void 0}
            on:isVisible={e => (fullyScrolledUp = e.detail)}></div>

        <!-- svelte-ignore a11y-missing-content -->
        <h2 id="a11y-main" class="visually-hidden" tabindex="-1"></h2>
        <!-- tabindex because it should be programmatically focusable -->

        <div class="test-content-columns">
            <aside
                id="test-content-aside-start"
                class="not-printable"
                class:not-displayed={!$testLayoutStore.asideStart || $status !== testSessionStatus.interacting}
                role={$status === testSessionStatus.overlay ? 'none' : 'aside'}
                aria-hidden={$status === testSessionStatus.overlay ? 'true' : void 0}
                bind:this={areas.asideStart}></aside>

            <div
                class="qti-item-container"
                class:hidden-item-container={$status === testSessionStatus.loading ||
                    $status === testSessionStatus.proctorwait}
                bind:this={areas.content}
                class:not-displayed={isHiddenArea('content')}
                aria-hidden={$status === testSessionStatus.loading ? 'true' : void 0}></div>

            <aside
                id="test-content-aside-end"
                class="not-printable"
                class:not-displayed={!$testLayoutStore.asideEnd || $status !== testSessionStatus.interacting}
                role={$status === testSessionStatus.overlay ? 'none' : 'aside'}
                aria-hidden={$status === testSessionStatus.overlay ? 'true' : void 0}
                bind:this={areas.asideEnd}></aside>
        </div>

        <div
            class="scroll-last-child"
            use:visibilityObserver={areas.main || void 0}
            on:isVisible={e => (fullyScrolledDown = e.detail)}></div>
        <!-- div.proctorwait and some floating tools also get injected here -->
    </main>

    <div class="transition-wrapper">
        {#if $status === testSessionStatus.loading}
            <Transition text={__('loading')} subtext={__('Please wait a little longer while your content loads')} />
        {/if}
    </div>

    <nav
        id="test-navigation"
        class="bottom-bar do-not-read not-printable"
        class:shadow-top={!fullyScrolledDown}
        class:hidden={$status === testSessionStatus.proctorwait || isItemModalFeedback}
        class:not-displayed={isHiddenArea('navigation')}
        aria-hidden="true"
        bind:this={areas.navigation}>
        <h2 class="visually-hidden">{__('Test Navigation')}</h2>
    </nav>

    <nav
        class="item-modalfeedback-nav"
        class:hidden={!isItemModalFeedback ||
            $status === testSessionStatus.proctorwait ||
            $status === testSessionStatus.overlay}
        class:shadow-top={!fullyScrolledDown}
        style="--nav-height: var(--testrunner-footer-height)"
        bind:this={areas.itemModalFeedbackNavigator}></nav>

    <div class="item-hanger-wrapper not-printable">
        {#if itemHangerMessages && itemHangerMessages.length}
            <ItemHanger messages={itemHangerMessages} bottom={floatingToolsHeight > 0} />
        {/if}
    </div>

    <Overlay open={$status === testSessionStatus.overlay}>
        <div slot="header" bind:this={areas.overlayHeader} class:not-displayed={isHiddenArea('overlayHeader')}></div>
        <div slot="content" bind:this={areas.overlayContent} class:not-displayed={isHiddenArea('overlayContent')}></div>
        <div slot="footer" bind:this={areas.overlayFooter} class:not-displayed={isHiddenArea('overlayFooter')}></div>
    </Overlay>
</div>

<!-- the following areas are outside areas.testRunner -->

<Panel bind:open={menuPanelOpen} id={panelId} side="start">
    <div
        class="panel-content use-a11y-text-styles"
        bind:this={areas.panel}
        class:not-displayed={isHiddenArea('panel')}></div>
</Panel>

<div class="panel-wrapper use-a11y-text-styles" bind:this={areas.a11yMenuPanel} id={a11yPanelId}></div>

<div class="feedback-dialogs-wrapper use-a11y-text-styles" bind:this={areas.feedbackDialogs}>
    <FeedbackDialogsContainer {serviceCallId} />
</div>
