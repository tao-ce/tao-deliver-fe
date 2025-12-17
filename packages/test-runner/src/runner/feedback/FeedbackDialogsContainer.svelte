<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;

    import { getNavigationFeedbacksStore } from './navigationFeedback.js';
    import FeedbackDialog from './FeedbackDialog.svelte';
    import SecurityMessage from '../plugins/security/Message.svelte';

    export let serviceCallId;

    const feedbacksStore = getNavigationFeedbacksStore(serviceCallId);
</script>

{#each $feedbacksStore.feedbacksArray as { key, config, onDone } (key)}
    {#if config && (!config.type || config.type !== 'security')}
        <FeedbackDialog {config} on:done={onDone} />
    {:else}
        <SecurityMessage {config} on:done={onDone} />
    {/if}
{/each}
