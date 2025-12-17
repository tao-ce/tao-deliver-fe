<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2025 (original work) Open Assessment Technologies SA ;
    import Prompt from '../../interactions/Prompt.svelte';
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { Icon } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';
    import { getContext } from 'svelte';
    import PlagiarismReport from '../util/plagiarism/PlagiarismReport.svelte';
    import { normalizeReports } from '../util/plagiarism/plagiarism.js';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let classes = '';
    export let dir;

    // data attributes
    export let dataAttrs = {};

    export let prompt;

    // store
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    let value;

    $: $interactionStateStore && loadResponse();

    /**
     * Loads response from store and set value
     */
    function loadResponse() {
        value = interactionStateStore.getResponseValue();
    }

    const itemContext = getContext(itemIdentifier);
    const isReviewAnswerMode = itemContext && itemContext.getReviewSessionSubstate() === 'answer';

    const { plagiarismReports } = (itemContext && itemContext.getExtraData()) || {};
    const plagiarismReportList = normalizeReports(responseIdentifier, plagiarismReports);
</script>

<style>
    .selected-file-container {
        text-align: center;

        & p {
            background-color: var(--color-bg-selected);
            color: var(--color-text-selected);
            padding: var(--space-1x5) var(--space-2x);
            text-align: left;

            & :global(svg) {
                margin-right: var(--space-1x);
            }

            & a {
                color: var(--color-text-link-secondary);
                &:hover {
                    color: var(--color-text-link-secondary-hover);
                }
            }
        }

        &.empty p {
            background-color: var(--color-bg-warning);
        }
    }
</style>

<div
    class="qti-interaction qti-reviewInteraction qti-blockInteraction qti-uploadInteraction {classes}"
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}
    {#if isReviewAnswerMode}
        {#each plagiarismReportList as report}
            <PlagiarismReport {report} />
        {/each}
    {/if}
    <div class="selected-file-container" class:empty={!value}>
        <p tabIndex="-1">
            {#if value}
                <Icon name="check-16" />
                <span>{__('Answer file selected:')}</span>
                <a href={value.link} download={value.name} target="_blank" rel="noreferrer">{value.name}</a>
            {:else}
                <Icon name="remove-16" />
                <span>{__('No answer file selected')}</span>
            {/if}
        </p>
    </div>
</div>
