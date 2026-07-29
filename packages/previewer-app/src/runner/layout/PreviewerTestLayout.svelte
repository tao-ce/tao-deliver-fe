<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onMount } from 'svelte';
    import { __, visibilityObserver } from '@oat-sa-private/ui-core';
    import Transition from './Transition.svelte';
    import { testSessionStatus } from '@oat-sa-private/tao-test-runner-qtinui/src/runner/session/sessionStates.js';
    import { getTestSessionStatusStore } from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';

    const dispatch = createEventDispatcher();

    /**
     * @type {String}
     */
    export let serviceCallId;

    const status = getTestSessionStatusStore(serviceCallId);

    //list of main test runner areas
    const areas = {};

    // For header & footer scroll shadows:
    let fullyScrolledUp = true;
    let fullyScrolledDown = true;
    let windowHeight;

    // to avoid accidental scrollbars when zooming/resizing
    $: safeWindowHeight = windowHeight && windowHeight - 1;

    onMount(() => {
        /**
         * @event mount
         * @param {Object} areas - refs to main areas elements
         */
        setTimeout(() => dispatch('mount', { areas }), 0);
    });
</script>

<style>
    .test-runner {
        /* local vars */
        --window-height: 100vh;
        --testrunner-header-height: 7rem;
        --testrunner-footer-height: 9rem;
        --testrunner-item-max-width: 170.75rem;

        /* this variable will be passed to itemRunner */
        --testrunner-item-container-height: calc(
            var(--window-height) - var(--testrunner-header-height) - var(--testrunner-footer-height)
        );
        --testrunner-item-container-width: min(var(--testrunner-item-max-width), 100vw);
        --testrunner-item-container-offset-right: calc((100vw - var(--testrunner-item-container-width)) / 2 - 0.125rem);
    }
    .test-runner {
        height: 100%;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        overscroll-behavior: none;
    }

    .top-bar {
        z-index: var(--layer-4);
        position: relative;
    }
    .bottom-bar {
        z-index: var(--layer-4);
    }
    main {
        height: 100%;
        position: relative;
        overflow: hidden auto;
        background: var(--color-bg-default);
        color: var(--color-text-default);
    }
    .qti-item-container {
        min-height: 100%;
        position: relative;
        margin: 0 auto;
        max-width: var(--testrunner-item-max-width);
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
</style>

<svelte:window bind:innerHeight={windowHeight} />

<div
    class="test-runner {$status || testSessionStatus.initial}"
    style={safeWindowHeight ? `--window-height:${safeWindowHeight}px;` : ''}
    bind:this={areas.testRunner}>
    <div id="test-top-bar" class="top-bar" class:shadow-bottom={!fullyScrolledUp} bind:this={areas.topBar}></div>

    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <main id="test-main" tabindex="0" bind:this={areas.main}>
        <div
            class="scroll-first-child"
            use:visibilityObserver={areas.main || void 0}
            on:isVisible={e => (fullyScrolledUp = e.detail)}></div>

        <div class="qti-item-container" class:hidden-item-container={$status === 'loading'} bind:this={areas.content}></div>

        {#if $status === 'loading'}
            <Transition text={__('loading')} subtext={__('Please wait a little longer while your content loads')} />
        {/if}

        <div
            class="scroll-last-child"
            use:visibilityObserver={areas.main || void 0}
            on:isVisible={e => (fullyScrolledDown = e.detail)}></div>
    </main>

    <nav
        id="test-navigation"
        class="bottom-bar do-not-read"
        class:shadow-top={!fullyScrolledDown}
        bind:this={areas.navigation}></nav>
</div>
