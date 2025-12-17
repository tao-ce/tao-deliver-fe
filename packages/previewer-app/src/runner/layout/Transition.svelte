<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { fade } from 'svelte/transition';
    import { onMount, onDestroy } from 'svelte';
    import { Loading } from '@oat-sa-private/ui-components';

    /**
     * This component displays the Item Transition (loading spinner)
     * Every time an Item Transition is shown, it's a new instance of this component.
     * So the subtext reveal is done by a one-time animation.
     *
     * @property {String} text - text inside spinner
     * @property {String} subtext - additional text outside of spinner
     */
    export let text = '';
    export let subtext = '';
    export let delay = 4500;

    let revealTimeout;
    let lite = true;

    onMount(() => {
        revealTimeout = setTimeout(() => {
            lite = false;
        }, delay);
    });
    onDestroy(() => {
        clearTimeout(revealTimeout);
    });
</script>

<style>
    div {
        @add-mixin flex-center-center;
        flex-direction: column;
        height: 100%;
        position: sticky;
        top: 0;
        left: 0;
    }
    p {
        color: var(--color-text-default);
        margin-top: var(--space-2x);
        max-width: 56rem;
    }
</style>

<div class="transition">
    <Loading {text} {lite} ariaRole="alert" />
    <p in:fade={{ delay, duration: 500 }}>{subtext}</p>
</div>
