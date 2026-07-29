<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
    /* eslint-disable */
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    function dispatchReady() {
        dispatch('ready');
    }
    function dispatchError() {
        dispatch('error');
    }
</script>

<div class="item-mock">
    <button data-test-id="dispatchReady" on:click={dispatchReady} />
    <button data-test-id="dispatchError" on:click={dispatchError} />
</div>
