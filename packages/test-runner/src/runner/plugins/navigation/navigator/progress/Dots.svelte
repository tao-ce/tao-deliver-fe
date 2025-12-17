<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;

    /**
     * Component displays step progress in a form of dots.
     * Simplified progress display to be used in lite mode
     * @property {Object} stats stats object from testPart
     */
    import { __ } from '@oat-sa-private/ui-core';

    export let total;
    export let currentPosition = 0;
</script>

<style>
    ol {
        list-style-type: none;
        margin: 0;
        padding: 0;
        display: inline-flex;
        align-items: flex-start;
        justify-content: center;

        & li {
            display: flex;
            height: 3rem;
            width: 3rem;
            border: 0.25rem solid var(--color-text-default);
            border-radius: var(--radius-circular);
            margin: 0.75rem;
            background-color: var(--color-bg-default);

            &.viewed {
                background-color: var(--color-text-default);
            }
        }
    }
</style>

{#if total}
    <div>
        <span class="visually-hidden">{__('Question %d of %d', 1 + currentPosition, total)}</span>
        <ol class="dots">
            {#each Array(total) as val, i (`${total}-${i}`)}
                <li class:viewed={i <= currentPosition} />
            {/each}
        </ol>
    </div>
{/if}
