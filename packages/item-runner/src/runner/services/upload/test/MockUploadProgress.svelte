<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let cancelable = true;
</script>

<div class="mock-upload-progress" data-props={JSON.stringify($$props)}>
    {#if cancelable}
        <button on:click={() => dispatch('cancel')}>cancel</button>
    {/if}
</div>
