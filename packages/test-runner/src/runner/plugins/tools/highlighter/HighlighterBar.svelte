<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to show highlighter toolbar. Should be mounted in floating toolbar container.
     * @property {String} serviceCallId
     * @property {String} activeActionKey
     * @property {Object<String, Number>} highlightsPerColor
     * @fires 'action'
     * @fires 'close'
     */
    import { createEventDispatcher } from 'svelte';
    import { __, getActualKey } from '@oat-sa-private/ui-core';
    import { Icon } from '@oat-sa-private/ui-elements';
    import { FloatingBar } from '@oat-sa-private/ui-components';
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { actionKeys } from './highlighterActionKeys.js';

    export let serviceCallId;
    export let activeActionKey;
    export let highlightsPerColor = {};
    export let colors = [];

    const dispatch = createEventDispatcher();
    const statusStore = getTestSessionStatusStore(serviceCallId);
    const defaultColors = [actionKeys.highlightYellow];

    /**
     * Keydown handler
     * @param {KeyboardEvent} e event
     */
    function handleKeyDown(e) {
        const pressedKey = getActualKey(e);
        if (pressedKey === 'esc') {
            dispatch('close');
        }
    }

    /**
     * Action button click handler
     * @param {String} key
     */
    function handleActionClick(key) {
        dispatch('action', { key });
    }

    const colorItems = [...new Set([...defaultColors, ...colors])]
        .map(color => {
            const key = Object.keys(actionKeys).find(actionKey => actionKeys[actionKey] === color);
            if (!key) {
                return null;
            }
            return {
                key: actionKeys[key],
                class: `color-btn-${color}`
            };
        })
        .filter(Boolean);
</script>

<style>
    .highlighter-bar {
        & :global-nested(.color-btn),
        & :global-nested(.eraser-btn) {
            height: 5.5rem;
            width: 5.5rem;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            position: relative;

            &.active:before {
                content: '';
                position: absolute;
                top: 0.625rem;
                bottom: 0.625rem;
                left: 0.625rem;
                right: 0.625rem;
                border-width: var(--border-medium);
                border-style: solid;
                border-radius: var(--radius-circular);
            }
            &:focus {
                outline: none;
            }
        }

        & :global-nested(.color-btn) {
            &.color-btn-yellow {
                --hl-btn-color: var(--hl-bg-yellow);
            }
            &.color-btn-pink {
                --hl-btn-color: var(--hl-bg-pink);
            }
            &.color-btn-blue {
                --hl-btn-color: var(--hl-bg-blue);
            }
            &.color-btn-green {
                --hl-btn-color: var(--hl-bg-green);
            }
            &.color-btn-orange {
                --hl-btn-color: var(--hl-bg-orange);
            }
            & > span {
                height: 2rem;
                width: 2rem;
                line-height: 2rem;
                margin: auto auto;
                font-size: var(--fontsize-body-xs);
                color: var(--color-text-default);
                display: block;
                border-radius: var(--radius-circular);
                background-color: var(--hl-btn-color);
                user-select: none;
            }
            &:hover > span,
            &:focus-visible > span {
                height: 3rem;
                width: 3rem;
                line-height: 3rem;
            }
            &.active:before {
                border-color: var(--hl-btn-color);
            }
        }

        & :global(.eraser-btn) {
            color: var(--color-text-inverted);

            &:hover > :global(svg),
            &:focus-visible > :global(svg) {
                transform: scale(1.5);
            }

            &.active:before {
                border-color: var(--color-border-inverted);
            }
        }

        & :global-nested(.clear-btn) {
            color: var(--color-text-inverted);
            background-color: transparent;
            border: none;
            font-size: var(--fontsize-body-s);
            cursor: pointer;
            padding: 0 1.5rem;
            height: 100%;
            user-select: none;

            &:focus {
                outline: none;
            }
            &:focus-visible > span {
                @add-mixin simple-outline var(--color-border-focus-inverted);
            }
            &:hover {
                text-decoration: underline;
            }
        }
    }

    /************************************/
    /* Global styles set by highlighter */
    /************************************/
    /* Color definitions for toolbar, highlight spans, user selection  */
    :root {
        --hl-bg-yellow: hsl(52, 100%, 67%);
        --hl-border-yellow: hsl(52, 100%, 19%);
        --hl-bg-pink: hsl(309, 100%, 87%);
        --hl-border-pink: hsl(309, 100%, 25%);
        --hl-bg-blue: hsl(206, 100%, 82%);
        --hl-border-blue: hsl(206, 100%, 25%);
        --hl-bg-green: hsl(126, 100%, 75%);
        --hl-border-green: hsl(126, 100%, 25%);
        --hl-bg-orange: hsl(39, 100%, 50%);
        --hl-border-orange: hsl(39, 100%, 25%);
        --hl-txt-color: var(--color-gs-dark);
    }

    /* Highlighted text inside item */
    :global(.highlighter-txt[data-color='yellow']) {
        --hl-bg-color: var(--hl-bg-yellow);
        --hl-border-color: var(--hl-border-yellow);
    }
    :global(.highlighter-txt[data-color='pink']) {
        --hl-bg-color: var(--hl-bg-pink);
        --hl-border-color: var(--hl-border-pink);
    }
    :global(.highlighter-txt[data-color='blue']) {
        --hl-bg-color: var(--hl-bg-blue);
        --hl-border-color: var(--hl-border-blue);
    }
    :global(.highlighter-txt[data-color='green']) {
        --hl-bg-color: var(--hl-bg-green);
        --hl-border-color: var(--hl-border-green);
    }
    :global(.highlighter-txt[data-color='orange']) {
        --hl-bg-color: var(--hl-bg-orange);
        --hl-border-color: var(--hl-border-orange);
    }
    :global(.highlighter-txt) {
        color: var(--hl-txt-color); /* force text inside to be of contrasting color with background */
        background-color: var(--hl-bg-color);
        box-shadow:
            0rem 0.125rem var(--hl-bg-color),
            0rem -0.125rem var(--hl-bg-color);
        outline: 0.125rem solid var(--hl-border-color);
    }

    /* Item container style when yellow color tool is toggled on */
    :global(.highlighter-mode-yellow) {
        --hl-sel-color: var(--hl-bg-yellow);
    }
    :global(.highlighter-mode-pink) {
        --hl-sel-color: var(--hl-bg-pink);
    }
    :global(.highlighter-mode-blue) {
        --hl-sel-color: var(--hl-bg-blue);
    }
    :global(.highlighter-mode-green) {
        --hl-sel-color: var(--hl-bg-green);
    }
    :global(.highlighter-mode-orange) {
        --hl-sel-color: var(--hl-bg-orange);
    }
    :global(.highlighter-mode-yellow),
    :global(.highlighter-mode-pink),
    :global(.highlighter-mode-green),
    :global(.highlighter-mode-orange),
    :global(.highlighter-mode-blue) {
        cursor: text;

        /* Whitelisted nodes: sync with `containersWhiteList` in highlighter options */
        &,
        & :global(.qti-interaction > .qti-prompt),
        & :global(.qti-gapMatchInteraction > .qti-flow-container > .answer-area),
        & :global(.qti-hottextInteraction > .qti-flow-container) {
            &::selection,
            & :global(::selection) {
                color: var(--hl-txt-color);
                background-color: var(--hl-sel-color);
            }
        }

        /* Blacklisted nodes: sync with `containersBlackList` in highlighter options */
        & :global(.qti-interaction),
        & :global(.qti-gapMatchInteraction > .qti-flow-container > .answer-area .gap),
        & :global(.qti-hottextInteraction > .qti-flow-container .qti-hottext),
        & :global(.qti-audio-container),
        & :global(.qti-video-container),
        & :global(mjx-container) {
            &::selection,
            & :global(::selection) {
                color: unset;
                background-color: var(--color-bg-selection);
            }
        }
    }

    /* Item container style when eraser tool is toggled on */
    :global(.highlighter-mode-eraser) {
        cursor: text;
    }
</style>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="highlighter-bar" class:hidden={$statusStore === testSessionStatus.overlay} on:keydown={handleKeyDown}>
    <FloatingBar title={__('Highlighter')}>
        {#each colorItems as item}
            <button
                class={`color-btn ${item.class}`}
                class:active={activeActionKey === item.key}
                on:click={() => handleActionClick(item.key)}>
                <span>{highlightsPerColor[item.key] || 0}</span>
            </button>
        {/each}
        <button
            class="eraser-btn"
            class:active={activeActionKey === actionKeys.eraser}
            on:click={() => handleActionClick(actionKeys.eraser)}><Icon name="eraser-16" ariaHidden={true} /></button>

        <button class="clear-btn" on:click={() => handleActionClick(actionKeys.clearAll)}
            ><span>{__('clear all')}</span></button>
    </FloatingBar>
</div>
