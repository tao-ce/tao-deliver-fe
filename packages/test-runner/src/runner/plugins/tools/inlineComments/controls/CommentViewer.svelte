<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { __, remToPx } from '@oat-sa-private/ui-core';
    import { Flyout } from '@oat-sa-private/ui-components';

    /**
     * Inline Popup component (like a tooltip) for comments attached to highlight nodes
     * @property {HTMLElement|Range} reference - for Flyout, which will accept either type (anything having getBoundingClientRect)
     * @property {string} commentValue - set as read-only text
     */
    export let reference; // in this component it's always an element
    export let commentValue;

    const dispatch = createEventDispatcher();

    let commentWrapper;

    $: open = !!(reference && commentValue);

    // Firefox & Safari do not fire it when focused element is removed
    function handleFocusout() {
        setTimeout(() => {
            if (open && commentWrapper !== document.activeElement && !commentWrapper.contains(document.activeElement)) {
                dispatch('close');
            }
        }, 200);
    }

    /**
     * When window is clicked and it's not within the displayed comment, close (parent should manage it)
     * @param {MouseEvent} e
     * @fires 'close'
     */
    function handleWindowClick(e) {
        if (commentWrapper && !commentWrapper.parentNode.contains(e.target)) {
            dispatch('close');
        }
    }

    /**
     * Escape key should close open comment (parent should manage it)
     * @param {KeyboardEvent} e
     * @fires 'close'
     */
    function handleWindowKeydown(e) {
        if (open && e.key === 'Escape') {
            dispatch('close');
        }
    }

    const modifiers = [
        // https://popper.js.org/docs/v2/modifiers/offset/
        {
            name: 'offset',
            options: {
                offset: [0, remToPx(0.5)]
            }
        },
        // https://popper.js.org/docs/v2/modifiers/flip/
        {
            name: 'flip',
            options: {
                fallbackPlacements: ['bottom-start', 'top-start', 'bottom-end', 'top-end', 'bottom', 'top']
            }
        },
        {
            name: 'preventOverflow',
            options: {
                mainAxis: true,
                altAxis: true,
                tether: false
            }
        }
    ];
</script>

<style>
    .comment-viewer {
        max-width: 52.5rem;
        max-height: calc(var(--testrunner-item-container-height) - 20rem);
        overflow-y: auto;
        padding: 0.5rem 1rem;
        background-color: var(--color-bg-inverted);
        color: var(--color-text-inverted);
        border-radius: 0.5rem;
        font-size: var(--fontsize-body);

        & pre {
            /* override some LDS <pre> styles */
            font-family: var(--font-ui);
            font-size: var(--fontsize-body);
            text-wrap: wrap;
            margin: 0;
        }
    }

    .comment-highlight-viewer-flyout :global(.flyout.flyout) {
        border: none;
        background: none;
        box-shadow: none;
        z-index: var(--layer-4);
    }
</style>

<svelte:window on:click={handleWindowClick} on:keydown={handleWindowKeydown} />

<div class="comment-highlight-viewer-flyout">
    <!-- the #key block ensures that with each new reference, the Flyout instantiates its Popper in the correct place -->
    {#key reference}
        <Flyout isOpen={open} {reference} trigger="manual" position="bottom-start" {modifiers}>
            <div
                class="comment-viewer"
                role="tooltip"
                id={reference?.getAttribute('aria-describedby')}
                bind:this={commentWrapper}
                on:focusout={handleFocusout}>
                <p class="visually-hidden">{__("Grader's comment:")}</p>
                <!-- careful with template whitespace inside <pre> -->
                <pre>{commentValue?.trim() || ''}</pre>
            </div>
        </Flyout>
    {/key}
</div>
