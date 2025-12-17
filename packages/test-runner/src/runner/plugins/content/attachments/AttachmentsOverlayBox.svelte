<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { __, getActualKey, focusTrap } from '@oat-sa-private/ui-core';
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { OverlayBox } from '@oat-sa-private/ui-components';
    import AttachmentsList from './AttachmentsList.svelte';

    /**
     * Component is used to show attachments toolbar. Should be mounted in floating toolbar container.
     * @property {String} serviceCallId
     * @property {import('./plugin.js').Attachment[]} attachments
     * @property {Boolean} showNewTabLinks
     * @fires 'action'
     * @fires 'close'
     */
    export let serviceCallId;

    /** @type {import('./plugin.js').Attachment[]} */
    export let attachments;

    export let showNewTabLinks;

    const dispatch = createEventDispatcher();
    const statusStore = getTestSessionStatusStore(serviceCallId);

    const startActions = [];
    const endActions = [
        {
            key: 'close',
            icon: 'remove',
            label: __('Close')
        }
    ];

    /**
     * Keydown handler
     * @param {KeyboardEvent} e event
     */
    function handleKeyDown(e) {
        const pressedKey = getActualKey(e);
        if (pressedKey === 'esc') {
            dispatch('close');
        }
    }
</script>

<style>
    .attachments-bar {
        pointer-events: auto;
        position: absolute;
        top: -0.5rem;
        inset-inline-end: 0;

        & :global(.overlay-box-content) {
            background: var(--color-bg-info);
        }

        & :global(ul.attachments-list) {
            margin: 3rem;
            border: var(--border-thin) solid var(--color-gs-light-secondary);
            border-radius: var(--radius-large);
        }
    }
</style>

{#if $statusStore === testSessionStatus.interacting}
    <div class="attachments-bar" class:hidden={$statusStore === testSessionStatus.overlay} on:keydown={handleKeyDown} use:focusTrap>
        <OverlayBox
            {startActions}
            {endActions}
            heading={__('Attachments (%s)', attachments.length)}
            headingLevel={2}
            inverted={true}
            on:action>
            <AttachmentsList {attachments} {showNewTabLinks} on:click on:close />
        </OverlayBox>
    </div>
{/if}
