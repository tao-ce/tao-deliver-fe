<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { Loading } from '@oat-sa-private/ui-components';
    import { __ } from '@oat-sa-private/ui-core';

    /**
     * @property {String} text - text inside spinner
     * @property {String} subtext - additional text outside of spinner
     */
    export let text = '';
    export let subtext = '';
    export let done = false;
</script>

<style>
    div {
        @add-mixin flex-center-center;
        flex-direction: column;
        height: 100%;
        width: 100%;
        position: fixed;
        top: 0;
        left: 0;
        background-color: var(--color-bg-default);
        z-index: var(--layer-front);
    }
    p {
        color: var(--color-text-default);
        margin-top: var(--space-2x);
        max-width: 56rem;
    }
</style>

<div class="transition">
    {#if !done}
        <Loading {text} ariaRole="alert" />
        <p>{subtext}</p>
    {:else}
        <a href="about:blank" class="booklet-download">{__('Download')}</a>
    {/if}
</div>
