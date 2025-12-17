<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { focusTrap } from '@oat-sa-private/ui-core';
    import { Flyout } from '@oat-sa-private/ui-components';
    import AttachmentsList from './AttachmentsList.svelte';

    /**
     * Component is used to show attachments flyout.
     * @property {String} serviceCallId
     * @property {import('./plugin.js').Attachment[]} attachments
     * @property {DOMElement} reference
     * @property {Boolean} showNewTabLinks
     * @fires 'click'
     * @fires 'close'
     * @fires 'show'
     * @fires 'hide'
     */
    export let serviceCallId;

    /** @type {import('./plugin.js').Attachment[]} */
    export let attachments = [];

    export let reference;

    export let showNewTabLinks;

    const statusStore = getTestSessionStatusStore(serviceCallId);

    const modifiers = [
        {
            // https://popper.js.org/docs/v2/modifiers/offset/
            name: 'offset',
            options: {
                offset: [4, -4]
            }
        }
    ];
</script>

{#if $statusStore === testSessionStatus.interacting}
    <div class="attachments-flyout" use:focusTrap>
        <Flyout {reference} {modifiers} placement="bottom-start" trigger="click" on:show on:hide>
            <AttachmentsList {attachments} {showNewTabLinks} on:click on:close />
        </Flyout>
    </div>
{/if}
