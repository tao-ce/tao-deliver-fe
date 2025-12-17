<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-21 (original work) Open Assessment Technologies SA ;
    import { visibilityObserver } from '@oat-sa-private/ui-core';
    import { breakpoints } from '@oat-sa-private/ui-identity';

    export let attributes = {};

    let columnElement = null;
    // For top and bottom scroll shadows:
    let fullyScrolledUp = true;
    let fullyScrolledDown = true;

    let windowWidth = window.innerWidth;
</script>

<style>
    /*top and bottom shadows at the same time. Based on LDS mixins*/
    .bottom-shadow::after {
        content: '';
        height: 2rem;
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        z-index: var(--layer-2);
        @add-mixin shadow-bottom-inset;
        pointer-events: none;
    }
    .top-shadow::before {
        content: '';
        height: 2rem;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        z-index: var(--layer-2);
        @add-mixin shadow-top-inset;
        pointer-events: none;
    }
    :global(.scrollable-container:focus-visible) {
        & .scrollable {
            outline: none;
            @add-mixin simple-outline;
        }
    }

    @media print {
        .bottom-shadow::after,
        .top-shadow::before {
            display: none;
        }
    }
</style>

{#if windowWidth && windowWidth <= breakpoints.width.medium}
    <div {...attributes}>
        <slot />
    </div>
{:else}
    <div {...attributes}>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <div
            class="scrollable-container"
            class:bottom-shadow={!fullyScrolledDown}
            class:top-shadow={!fullyScrolledUp}
            bind:this={columnElement}
            tabindex="0">
            <div class="scrollable">
                <div
                    class="scroll-first-child"
                    use:visibilityObserver={columnElement || void 0}
                    on:isVisible={e => (fullyScrolledUp = e.detail)} />
                <slot />
                <div
                    class="scroll-last-child"
                    use:visibilityObserver={columnElement || void 0}
                    on:isVisible={e => (fullyScrolledDown = e.detail)} />
            </div>
        </div>
    </div>
{/if}
