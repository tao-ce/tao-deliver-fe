<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;

    /**
     * Component to display a bar with message,
     * absolutely positioned near the top or bottom of the Test Runner layout
     * @property {ItemHangerMessage[]} messages - the messages content
     * @property {boolean} bottom - display the bar at the bottom of the screen
     */

    /**
     * @typedef {Object} ItemHangerMessage
     * @property {String} content - the message content
     * @property {Boolean} colored - use primary color, otherwise black color; `false` by default
     * @property {Boolean} isTimer - special handling of timer message
     * @property {String} timerAriaLabel - aria-label for timer message
     */
    /**
     * @type {ItemHangerMessage[]}
     */
    export let messages;
    export let bottom = false;

    $: if (!messages) {
        messages = [];
    }

    $: message = messages
        .filter(i => !i.isTimer)
        .map(i => i.content)
        .join(' - ');
    $: timerMessage = messages.find(i => i.isTimer);
</script>

<style>
    .item-hanger {
        pointer-events: none;
        position: absolute;
        top: var(--testrunner-header-height);
        width: 100%;
        text-align: center;
        line-height: 2.5rem;
        z-index: var(--layer-2);
        border-top: var(--border-thin) solid var(--color-border-default);
        border-image: linear-gradient(
                90deg,
                var(--color-bg-default),
                var(--color-border-default),
                var(--color-bg-default)
            )
            1;

        & p {
            pointer-events: auto;
            font-size: var(--fontsize-body-s);
            max-width: calc(100% - 8rem);
            min-width: 10rem;
            border-radius: 0 0 var(--radius-large) var(--radius-large);
            padding: 0.25rem 1rem 0.25rem 1rem;
            margin: 0;
            display: inline-flex;
            justify-content: center;
        }

        &.colored {
            border-top-color: var(--color-brand);
            border-image: linear-gradient(90deg, var(--color-bg-default), var(--color-brand), var(--color-bg-default)) 1;
            & p {
                background: var(--color-brand);
            }
        }

        &.bottom {
            top: auto;
            bottom: var(--testrunner-footer-height);
            border-top: none;
            border-bottom: var(--border-thin) solid var(--color-border-default);

            & p {
                border-radius: var(--radius-large) var(--radius-large) 0 0;
            }
        }
    }
</style>

<div class="item-hanger" class:bottom class:colored={messages.some(i => i.colored)}>
    <p class="inverted">
        {#if message}
            <span role="alert">{message}</span>
        {/if}
        {#if message && timerMessage}
            <span>&nbsp;-&nbsp;</span>
        {/if}
        {#if timerMessage}
            <span role="timer" aria-live="off">
                <span aria-hidden="true">{timerMessage.content}</span>
                <span class="visually-hidden">{timerMessage.timerAriaLabel}</span>
            </span>
        {/if}
    </p>
</div>
