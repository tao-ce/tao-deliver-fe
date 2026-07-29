<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-21 (original work) Open Assessment Technologies SA ;
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';

    import blockTypes from './blockTypes.js';

    //the block tree that contains data to render, by type,
    //either some html, text or a component
    export let blockTree = [];

    const dispatch = createEventDispatcher();

    onMount(() => {
        dispatch('mount');
    });

    onDestroy(() => {
        dispatch('destroy');
    });
</script>

{#each blockTree as block}
    {#if block.type === blockTypes.html}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html block.content}
    {:else if block.type === blockTypes.text}
        {block.content}
    {:else if block.type === blockTypes.container || block.type === blockTypes.element}
        <svelte:component this={block.component} {...block.props}>
            {#if block.children}
                <svelte:self blockTree={block.children} />
            {/if}
        </svelte:component>
    {/if}
{/each}
