<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2025 (original work) Open Assessment Technologies SA ;
    import { getContext } from 'svelte';
    import ItemBlocks from '../item/blocks/ItemBlocks.svelte';

    export let itemIdentifier;
    export let attributes = {};

    const itemContext = getContext(itemIdentifier);
    const writingMode = itemContext && itemContext.getWritingMode();

    //filter out content and blockTree from HTML attributes
    const figureProps = Object.keys(attributes)
        .filter(key => !['blockTree', 'content', 'imageElementWidth', 'imageElementHeight'].includes(key))
        .reduce((acc, key) => {
            acc[key] = attributes[key];
            return acc;
        }, {});

    if (attributes.imageElementWidth) {
        const size =
            (writingMode === 'vertical-rl') & attributes.imageElementWidth?.endsWith('%') &&
            !attributes.imageElementHeight
                ? 'height'
                : 'width';
        figureProps.style = [attributes.style, `${size}:${attributes.imageElementWidth};`].filter(Boolean).join(';');
    }
</script>

<style>
    figure {
        &.auto-width {
            display: grid;
            grid-template-columns: min-content;

            &.tao-centered {
                display: grid;
                justify-content: center;
            }
        }

        & :global(img) {
            max-inline-size: 100%;
        }

        & :global(figcaption) {
            font-size: var(--fontsize-body-xs);
            font-weight: normal; /* needed if inside Prompt */
            line-height: var(--fontsize-body);
            padding-block: 1rem 1.5rem;
            padding-inline: 1.5rem;
            background-color: inherit;
            color: inherit;
            min-inline-size: 10rem;
        }
    }

    /* responsive tables can shrink %-defined figures to zero if there is no min-width */
    :global(table) figure {
        min-width: 3rem;
    }
</style>

<figure {...figureProps}>
    {#if attributes.blockTree}
        <ItemBlocks blockTree={attributes.blockTree} />
    {/if}
    <slot />
</figure>
