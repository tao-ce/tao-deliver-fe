<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
    import { Progressbar } from '@oat-sa-private/ui-elements';
    import { slide } from 'svelte/transition';
    import { createEventDispatcher, beforeUpdate, onDestroy } from 'svelte';

    const dispatch = createEventDispatcher();

    export let bytesLoaded = 0;
    export let bytesTotal = 0;
    export let cancelable = true;
    export let durationMinimumMs = 3000; // only show the bar if estimated or real duration is longer than this

    let sufficientDurationForShow = false;
    let showProgressTimeout;

    /**
     * @typedef {Object} ProgressMeasure
     * @property {number} bytesLoaded
     * @property {number} bytesTotal
     * @property {number} timestamp
     */
    /** @type {ProgressMeasure[]} */
    const measures = [];

    /**
     * Calculate an upload duration estimate by comparing bytes over the first few progress measures
     * @returns {number}
     */
    function estimateDuration() {
        // start a timer to make the bar show if the upload is taking longer than the minimum, even without enough measures
        if (!showProgressTimeout) {
            showProgressTimeout = setTimeout(() => {
                sufficientDurationForShow = true;
            }, durationMinimumMs);
        }
        if (measures.length < 5) {
            return 0;
        }
        const dl = measures[measures.length - 1].bytesLoaded - measures[0].bytesLoaded;
        const dt = measures[measures.length - 1].timestamp - measures[0].timestamp;
        const avgBytesPerMs = dl / (dt + 1);
        const bytesRemaining = bytesTotal - bytesLoaded;
        const durationEstimateMs = avgBytesPerMs === 0 ? 0 : bytesRemaining / avgBytesPerMs;
        return durationEstimateMs;
    }

    // Conditional animation: slide out if loading completed, don't if component prematurely destroyed (user cancelled upload)
    function slideIfCompleted(node, slideParams) {
        if (bytesLoaded < bytesTotal) {
            return false;
        }
        return slide(node, slideParams);
    }

    beforeUpdate(() => {
        if (bytesTotal) {
            measures.push({ bytesLoaded, bytesTotal, timestamp: Date.now() });
            sufficientDurationForShow ||= estimateDuration() > durationMinimumMs;
        }
    });

    onDestroy(() => {
        clearTimeout(showProgressTimeout);
    });
</script>

<style>
    .upload-progress {
        min-height: 3rem;
        @add-mixin flex-center-center;

        & button {
            border: 0;
            background: 0;
            font: inherit;
            font-weight: bold;
            text-decoration: underline;
            color: var(--color-text-default);
            word-break: normal;
            cursor: pointer;

            &:hover,
            &:focus {
                color: var(--color-text-link-hover);
            }
            &:focus {
                outline: none;
            }
            &:focus-visible {
                @add-mixin simple-outline var(--color-border-focus), 0;
            }
        }
    }
</style>

{#if sufficientDurationForShow}
    <div class="upload-progress" in:slide={{ duration: 150 }} out:slideIfCompleted={{ duration: 500, delay: 5000 }}>
        <Progressbar value={bytesLoaded} max={bytesTotal} skin="tertiary" />
        {#if cancelable && bytesLoaded < bytesTotal}
            <button on:click={() => dispatch('cancel')}>{__('Cancel')}</button>
        {/if}
    </div>
{/if}
