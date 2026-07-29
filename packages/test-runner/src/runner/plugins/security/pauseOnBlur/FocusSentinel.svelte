<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';

    /**
     * A11y component. Only appears when focused by the keyboard. For use at the top and bottom of the document.
     * @property {Boolean} isTop - positioning option
     */
    export let isTop = true;

    let hasFocus = false;

    function handleFocus() {
        hasFocus = true;
    }

    function handleBlur() {
        hasFocus = false;
    }
</script>

<style>
    .focus-sentinel {
        position: absolute;
        left: -9999px;
        width: 100%;
        padding: 0.5rem 2rem;
        background: rgba(0, 0, 0, 0.7);
        color: var(--color-text-inverted);
        text-align: center;
        z-index: var(--layer-5);

        &:focus-visible {
            left: 0;
        }
        &.top {
            top: 0;
        }
        &.bottom {
            bottom: 0;
        }
    }
</style>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<div
    class="focus-sentinel"
    class:top={isTop}
    class:bottom={!isTop}
    tabindex="0"
    on:focus={handleFocus}
    on:blur={handleBlur}>
    {#if hasFocus}
        <span>
            {__('You are about to leave the document and the test will be paused.')}
            {#if isTop}
                {__('Press Tab to keep focus within the document and resume the test.')}
            {:else}
                {__('Press Shift+Tab to keep focus within the document and resume the test.')}
            {/if}
        </span>
    {/if}
</div>
