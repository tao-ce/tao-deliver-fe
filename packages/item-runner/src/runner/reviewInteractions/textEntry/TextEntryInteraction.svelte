<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    import TextEntryInteraction from '../../interactions/textEntry/TextEntryInteraction.svelte';
</script>

<style>
    /* override regular input styles */
    .text-entry-review-interaction {
        display: inline-block;

        & :global(.qti-textEntryInteraction input[readonly]) {
            pointer-events: all;
            color: var(--color-text-default);
        }

        & :global(.qti-textEntryInteraction input[readonly]:not(.valid)) {
            border: var(--border-thin) solid var(--color-border-warning);
            box-shadow: 0 0 0 var(--border-thin) var(--color-border-warning) inset;
        }
    }
</style>

<div class="text-entry-review-interaction">
    <!-- No placeholder, cause in readonly, it can't be distinguished from response -->
    <TextEntryInteraction
        {...$$props}
        readonly
        placeholderText=""
    />
</div>
