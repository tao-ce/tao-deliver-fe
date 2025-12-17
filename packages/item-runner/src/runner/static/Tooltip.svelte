<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    import { Tooltip } from '@oat-sa-private/ui-components';

    export let attributes = {};

    //anchor element svelte binding
    let anchorElement;
</script>

<style>
    .tooltip-target {
        color: var(--color-text-default);
        text-decoration: underline;
        cursor: pointer;

        &:hover {
            color: var(--color-text-link-hover);
        }
        &:focus-visible {
            color: var(--color-text-link-hover);
        }

        @add-mixin outline-focus 0;
    }
</style>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<span class="tooltip-target" bind:this={anchorElement} tabindex="0">
    {attributes.content ? attributes.content : ''}
</span>

<Tooltip text={attributes.text} {anchorElement} />
