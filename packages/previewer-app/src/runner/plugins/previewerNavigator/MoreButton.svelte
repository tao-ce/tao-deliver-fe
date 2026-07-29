<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;

    export let active = false;
    export let disabled = false;
</script>

<style>
    .more {
        width: 1.75rem;
        align-self: stretch;
        margin: 0 0.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .ellipsis-container {
        display: flex;
        height: 2rem;
        width: 1.75rem;
        justify-content: space-evenly;
        align-items: center;
        background-color: transparent;
        border: none;
        padding: 0;
        outline: none;
        cursor: pointer;

        &:disabled {
            cursor: not-allowed;
        }

        & span {
            width: 0.25rem;
            height: 0.25rem;
            background-color: var(--color-text-default);
        }
    }
</style>

<div class="more">
    {#if active}
        <button class="ellipsis-container" aria-hidden="true" tabindex="-1" {disabled}>
            <span></span>
            <span></span>
            <span></span>
        </button>
    {/if}
</div>
