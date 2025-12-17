<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { visibilityObserver } from '@oat-sa-private/ui-core';

    /**
     * Overlay component which is rendered once in the app
     * Exposes 3 slots for inserting header, content & footer
     *
     * @property {Boolean} open - shows or hides the whole component (without ever unmounting, so the areaBroker can register the outer slots)
     */
    export let open = false;

    // For header & footer scroll shadows:
    let fullyScrolledUp = true;
    let fullyScrolledDown = true;
    let overlayContent;
</script>

<style>
    .overlay {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        background: var(--color-bg-default);
        opacity: 1;
        z-index: var(--layer-4);
        transition: opacity 0.4s, z-index 0.4s;

        /* combine aria-hidden (for SR blocking) */
        /* and opacity + z-index transition for the fade & hide */
        &[aria-hidden='true'] {
            opacity: 0;
            z-index: var(--layer-back);
        }
        @media screen and (--mq-minwidth-medium) {
            top: 8rem;
        }

        & > .overlay-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden auto;
        }

        & > header,
        & > footer {
            z-index: var(--layer-1);
        }
    }
</style>

<div class="overlay" aria-hidden={!open}>
    <header role="none" class:shadow-bottom={!fullyScrolledUp}>
        <slot name="header" />
    </header>
    <div class="overlay-content" role="main" aria-labelledby="a11y-overlay" bind:this={overlayContent}>
        <div
            class="scroll-first-child"
            use:visibilityObserver={overlayContent}
            on:isVisible={e => (fullyScrolledUp = e.detail)} />
        <slot name="content" />
        <div
            class="scroll-last-child"
            use:visibilityObserver={overlayContent}
            on:isVisible={e => (fullyScrolledDown = e.detail)} />
    </div>
    <footer class:shadow-top={!fullyScrolledDown}>
        <slot name="footer" />
    </footer>
</div>
