<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script context="module">
    let moduleHandleResponse;
    export function triggerHandleResponse(state) {
        moduleHandleResponse(state);
        moduleHandleResponse = null;
    }
</script>

<script>
    import { createEventDispatcher, onMount } from 'svelte';

    const dispatch = createEventDispatcher();

    export let container;
    export let handleResponse;
    moduleHandleResponse = handleResponse;

    onMount(() => {
        dispatch('mount');
    });
</script>

<div class="mock-audio-interaction" bind:this={container}>
    {JSON.stringify($$restProps)}
</div>
