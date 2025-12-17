<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;
    import { ScrollableWrapper } from '@oat-sa-private/ui-elements';
    import ItemBlocks from '../item/blocks/ItemBlocks.svelte';

    export let attributes = {};

    // Child inlineChoiceInteraction's expanded Dropdown can be cut off if the ScrollableWrapper is active
    const containsDropdown =
        attributes.blockTree && JSON.stringify(attributes.blockTree).includes('inlineChoiceInteraction');

    //filter out content and blockTree from HTML attributes
    const tableProps = Object.keys(attributes)
        .filter(key => !['blockTree', 'content'].includes(key))
        .reduce((acc, key) => {
            acc[key] = attributes[key];
            return acc;
        }, {});
</script>

<style>
    .table-wrapper.with-dropdown {
        & :global(.scrollable-wrapper) {
            /* ScrollableWrapper will always exist, but we disable its scrollbars in certain conditions */
            overflow: visible;
        }
        & :global(.shadow) {
            display: none;
        }
    }
    table {
        & :global(td),
        & :global(th) {
            border: var(--border-thin) solid var(--color-border-info);
        }
        & :global(th) {
            text-align: center;
            background-color: var(--color-bg-table-heading);
        }
        &.tao-table-center,
        &.table-center {
            margin-left: auto;
            margin-right: auto;
        }
        &.tao-table-left,
        &.table-left {
            margin-left: 0;
            margin-right: auto;
        }
        &.tao-table-right,
        &.table-right {
            margin-left: auto;
            margin-right: 0;
        }
    }
</style>

<div class="table-wrapper" class:with-dropdown={containsDropdown}>
    <ScrollableWrapper>
        <table {...tableProps}>
            {#if attributes.blockTree}
                <ItemBlocks blockTree={attributes.blockTree} />
            {/if}
            <slot />
        </table>
    </ScrollableWrapper>
</div>
