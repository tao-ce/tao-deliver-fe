<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script context="module">
    let moduleHandleResponse;
    let moduleHandleState;

    export function triggerHandleResponse(state) {
        moduleHandleResponse(state);
        moduleHandleResponse = null;
    }
    export function triggerHandleState(state) {
        moduleHandleState(state);
        moduleHandleState = null;
    }
</script>

<script>
    import { createEventDispatcher, onMount } from 'svelte';

    const dispatch = createEventDispatcher();

    export let container;
    export let handleState;
    export let handleResponse;
    moduleHandleState = handleState;
    moduleHandleResponse = handleResponse;

    onMount(() => {
        dispatch('mount');
    });
</script>

<div class="mock-audio-interaction" bind:this={container}>
    {JSON.stringify($$restProps)}
</div>
