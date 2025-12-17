<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2022 (original work) Open Assessment Technologies SA ;

    import { getContext } from 'svelte';
    import ItemBlocks from '../item/blocks/ItemBlocks.svelte';

    export let id;
    //prompt content is a tree of blocks
    export let blockTree = [];

    const itemRunnerConfigContext = getContext('itemRunnerConfig') || {};
    const stylePromptAsHeader = !!itemRunnerConfigContext.options?.stylePromptAsHeader;
</script>

<style>
    .qti-prompt {
        line-height: var(--line-height-heading);
        margin-block-end: var(--space-2x);

        &.ui-heading-l {
            /* @see ancestor Item.svelte styles for this var */
            font-size: var(--item-fontsize-heading-l, var(--fontsize-heading-l));
        }

        &:empty {
            margin-block-end: 0;
        }
    }

    :global(.writing-mode-vertical-rl) {
        & .qti-prompt {
            line-height: var(--line-height-default-ruby); /* enough for ruby tags */
        }
    }
</style>

<div class="qti-prompt cf" class:ui-heading-l={stylePromptAsHeader} {id}>
    <ItemBlocks {blockTree} />
</div>
