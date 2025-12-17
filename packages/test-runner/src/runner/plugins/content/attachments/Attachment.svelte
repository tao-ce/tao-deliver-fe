<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
    import { createEventDispatcher, onMount } from 'svelte';
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { OverlayBox } from '@oat-sa-private/ui-components';
    import DocumentViewer from '@oat-sa-private/ui-components/documentViewer/DocumentViewer.svelte';

    /**
     * This component renders a single item attachment (pdf, image...)
     * @property {import('./plugin.js').Attachment} attachment
     * @property {*} assetManager
     * @property {String} serviceCallId
     * @property {Boolean} isFlyoutOpen
     * @property {Boolean} openInNewTab
     * @fires 'mount'
     * @fires 'toggle-menu'
     * @fires 'close'
     */

    /** @type {import('./plugin.js').Attachment} */
    export let attachment = {};

    export let assetManager;

    export let serviceCallId;

    export let isFlyoutOpen = false;

    export let openInNewTab;

    const statusStore = getTestSessionStatusStore(serviceCallId);

    let boxElt;
    let flyoutAnchorElt;

    const dispatch = createEventDispatcher();

    $: startActions = [
        {
            key: 'toggle-menu',
            icon: 'ul',
            label: __('More attachments'),
            ariaLabel: __('More attachments'),
            ariaHasPopup: true,
            ariaExpanded: isFlyoutOpen,
            toggled: isFlyoutOpen
        }
    ];
    const endActions = [
        {
            key: 'close',
            icon: 'remove',
            label: __('Close attachment'),
            ariaLabel: __('Close attachment')
        }
    ];

    /**
     * Button action handler
     * @param {CustomEvent} e
     */
    function handleOverlayBoxAction(e) {
        const { key } = e.detail;
        if (key === 'toggle-menu') {
            e.stopPropagation();
            dispatch('toggle-menu');
        } else if (key === 'close') {
            dispatch('close');
        }
    }

    onMount(() => {
        boxElt.scrollIntoView?.({
            block: 'nearest',
            inline: 'center',
            behavior: 'smooth'
        });
        flyoutAnchorElt = boxElt.querySelector('.icon-bar-btn');

        // delay this event so that plugin listener attached with $on is activated
        setTimeout(() => {
            dispatch('mount', { flyoutAnchorElt });
        }, 0);
    });
</script>

<style>
    .attachment-box {
        position: relative;

        & :global(.overlay-box-header .heading-container) {
            justify-content: flex-start;
            padding-inline-start: 1rem;
        }
        & :global(.overlay-box-content) {
            padding: 0;
        }
        & .pdf-attachment :global(.document-wrapper) {
            max-height: calc(var(--testrunner-item-container-height) - 16rem);
        }
        & .image-attachment {
            max-width: 100%;
        }
    }
</style>

<div class="attachment-box" bind:this={boxElt}>
    {#if $statusStore === testSessionStatus.interacting}
        <OverlayBox
            {startActions}
            {endActions}
            heading={attachment.name}
            headingLevel={3}
            ariaLabel={__('Attachment: %s', attachment.name)}
            role="none"
            inverted={false}
            invertedActions={false}
            on:action={handleOverlayBoxAction}>
            {#key attachment.url}
                {#if attachment.type.toLowerCase() === 'application/pdf'}
                    <div class="pdf-attachment">
                        <DocumentViewer
                            {...attachment}
                            src={attachment.url}
                            title={attachment.name}
                            options={{ workerSrc: assetManager.resolve('pdf.worker.min.js') }}
                            buttons={{ download: false, openInNewTab, errorOpenInNewTab: true }}
                            on:pagechange
                            on:zoomchange
                            on:scrollchange
                            on:error />
                    </div>
                {:else if attachment.type.toLowerCase().startsWith('image/')}
                    <img class="image-attachment" src={assetManager.resolve(attachment.url)} alt={attachment.name} />
                {/if}
            {/key}
        </OverlayBox>
    {/if}
</div>
