<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
    import { Icon } from '@oat-sa-private/ui-elements';

    const statuses = Object.freeze({
        pending: {
            className: 'pending',
            iconName: 'timer-16',
            text: __('A plagiarism check is in progress, awaiting the results.')
        },
        error: {
            className: 'error',
            iconName: 'lightning-16',
            text: __('The plagiarism check could not be performed. Please contact an administrator.')
        },
        suspicious: {
            className: 'suspicious',
            iconName: 'warning-16',
            text: __('Suspicion of plagiarism:'),
            showLink: true
        },
        clear: {
            className: 'clear',
            iconName: 'check-16',
            text: __('No suspicion of plagiarism.')
        }
    });

    /**
     * Message display component
     * @property {String} status - status of the plagiarism check. Must be a key of 'statuses' object.
     * @property {String} href - attribute for <a> tag
     */
    export let status;
    export let href;

    $: uiValues = status && statuses[status];
</script>

<style>
    .plagiarism-message {
        background: var(--color-bg-info);
        color: var(--color-text-info);
        margin: 0;
        padding-block: 1rem;
        padding-inline: 2rem;

        &.suspicious,
        &.error {
            color: var(--color-text-warning);
        }
        & a {
            color: var(--color-text-warning);
            &:hover {
                color: var(--color-alert-hover);
            }
        }
        & :global(.icon) {
            margin-block: 0;
            margin-inline: 0 1rem;
        }
    }
</style>

{#if uiValues}
    <p class="plagiarism-message {uiValues.className}">
        <Icon name={uiValues.iconName} />
        {uiValues.text}
        {#if uiValues.showLink && href}
            <a {href} target="_blank">{__('view report')}</a>
        {/if}
    </p>
{/if}
