<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { createEventDispatcher } from 'svelte';
    import { defaultGapSize } from './sizes.js';

    const dispatch = createEventDispatcher();

    export let gapSize = defaultGapSize;
    export let gapOffset = 0;
    export let areaScrollHeight = 0;
    export let areaScrollTop = 0;
</script>

<style>
    .item-content-overlay {
        position: absolute;
        top: 0;
        left: 0;
        height: 100vh;
        width: 100%;
        pointer-events: all;
    }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="item-content-overlay not-printable"
    style={`height: ${areaScrollTop + gapOffset}px`}
    on:click={(evt) => {
        dispatch('topareaclick', {
            pageY: evt.pageY
        });
    }}
/>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="item-content-overlay not-printable"
    style={`
        height: ${areaScrollHeight - areaScrollTop - gapOffset - gapSize}px;
        transform: translateY(${gapOffset + gapSize + areaScrollTop}px);
    `}
    on:click={(evt) => {
        dispatch('bottomareaclick', {
            pageY: evt.pageY
        });
    }}
/>