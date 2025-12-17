<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;

    import { __ } from '@oat-sa-private/ui-core';
    import { Icon } from '@oat-sa-private/ui-elements';
    import ItemBlocks from '../item/blocks/ItemBlocks.svelte';

    const iconNames = Object.freeze({
        'x-tao-modalFeedback-positive': 'checkbox-check-24',
        'x-tao-modalFeedback-negative': 'warning-unframed-24'
    });

    export let attributes = {};

    let blockTree = attributes.blockTree;
    let title = attributes.title;
    let styleClass = attributes.styleClass || '';

    let a11yHeaderElement;
    $: if (a11yHeaderElement) {
        a11yHeaderElement.focus();
    }
</script>

<style>
    .qti-modalFeedback {
        padding: 4rem;

        & .content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: calc(var(--item-container-height) - 8.25rem); /* minus padding and a bit more */
        }
        & .ui-heading-l {
            margin: 0 0 3rem 0;
            outline: none;
            font-size: var(--fontsize-heading-l);
            display: flex;
            flex-flow: row nowrap;
            gap: 1rem;
            align-items: center; /* align icon to text */
        }
        &.x-tao-modalFeedback-positive .ui-heading-l {
            color: var(--color-success);
        }
        &.x-tao-modalFeedback-negative .ui-heading-l {
            color: var(--color-partial);
        }
    }
</style>

<div class="qti-modalFeedback {styleClass || ''}">
    <div class="content">
        <h2 class="ui-heading-l" tabindex="-1" bind:this={a11yHeaderElement}>
            {#if iconNames[styleClass]}
                <Icon name={iconNames[styleClass]} ariaHidden={true} />
            {/if}
            {#if title}
                <span>{title}</span>
            {:else}
                <span class="visually-hidden">{__('Response feedback')}</span>
            {/if}
        </h2>
        <ItemBlocks {blockTree} />
    </div>
</div>
