<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;

    /**
     * Component to display test progress and/or test navigation
     * @property {String} serviceCallId id of test session
     * @fires 'overview' event forwarded from Steps component
     * @fires 'move' event forwarded from Steps component
     */
    import { createEventDispatcher } from 'svelte';
    import Steps from '../../navigator/progress/Steps.svelte';
    import stepProgressHelperFactory from '../stepProgressHelper.js';
    import { screenSize } from '../../../../screenSizeStore.js';

    const dispatch = createEventDispatcher();

    export let serviceCallId;
    export let disabled = false;
    export let showScore = false;

    /**
     * Fire 'overview' event
     */
    function handleMore() {
        dispatch('overview');
    }

    $: stepCreator = stepProgressHelperFactory({ showScore });
</script>

<style>
    .progress-container {
        @add-mixin flex-center-center;
        width: 100%;
        height: 100%;
        flex: 1 1 auto;
        padding-block: 0;
        padding-inline: 0.375rem 1rem;
    }

    /* Mobile UI modifications */
    @media screen and (--mq-maxwidth-medium) {
        .progress-container > :global(button) {
            margin: 0;
        }
    }
</style>

{#if !$screenSize.mobile}
    <div class="progress-container">
        <Steps on:move on:overview on:more={handleMore} {serviceCallId} {disabled} {stepCreator} />
    </div>
{/if}
