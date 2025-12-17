<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import ItemBlocks from '../../item/blocks/ItemBlocks.svelte';

    export let choice;
</script>

{#if choice.blockTree}
    <ItemBlocks blockTree={choice.blockTree} />
{:else}{choice.content}{/if}
