<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023-2026 (original work) Open Assessment Technologies SA ;

    import { createEventDispatcher } from 'svelte';
    import { Button } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';

    export let key;

    const dispatch = createEventDispatcher();
</script>

<style>
    .modalfeedback-nav {
        height: var(--nav-height, 9rem);
        @add-mixin flex-center-center;
    }
</style>

<div class="modalfeedback-nav">
    <Button shape="pill" size="small" label={__('Continue')} on:click={() => dispatch('modalFeedbackContinue', { key })} />
</div>
