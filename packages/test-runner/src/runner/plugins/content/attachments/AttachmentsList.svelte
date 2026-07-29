<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onMount } from 'svelte';
    import { __, getActualKey } from '@oat-sa-private/ui-core';
    import { IconBarButton } from '@oat-sa-private/ui-elements';

    /**
     * Component is used to show attachments list
     * @property {import('./plugin.js').Attachment[]} attachments
     * @property {Boolean} showNewTabLinks
     * @fires 'click'
     * @fires 'close'
     */

    /** @type {import('./plugin.js').Attachment[]} */
    export let attachments;

    export let showNewTabLinks = true;

    const dispatch = createEventDispatcher();

    /**
     * Action button click handler
     * @param {String} id
     * @param {Boolean} inNewTab
     */
    function handleAttachmentClick(id, inNewTab) {
        dispatch('click', { id, inNewTab });
    }

    /**
     * Keydown handler
     * @param {KeyboardEvent} e event
     */
    function handleKeyDown(e) {
        const pressedKey = getActualKey(e);
        switch (pressedKey) {
            case 'esc': {
                dispatch('close');
                break;
            }
        }
    }

    let ulElt;

    onMount(() => {
        ulElt?.querySelector('button')?.focus();
    });
</script>

<style>
    ul {
        margin: 0;
        padding: 0 2rem;
        list-style: none;
        background: var(--color-bg-default);

        & li {
            padding: 2rem 0;
            display: flex;
            justify-content: space-between;

            & + li {
                border-top: var(--border-thin) solid var(--color-gs-light-secondary);
            }

            &:first-child {
                border-top-left-radius: var(--radius-large);
                border-top-right-radius: var(--radius-large);
            }
            &:last-child {
                border-bottom-left-radius: var(--radius-large);
                border-bottom-right-radius: var(--radius-large);
            }

            & :global(.icon-bar-btn .label) {
                text-transform: none;
                text-align: left;
                /* truncate text */
                width: 24ch;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }
    }
</style>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<ul class="attachments-list" bind:this={ulElt} on:keydown={handleKeyDown}>
    {#each attachments as attachment (attachment.id)}
        <li>
            <IconBarButton
                label={attachment.name}
                ariaLabel={__('Open attachment %s', attachment.name)}
                icon="attachment-16"
                shape="pill"
                showLabelText={true}
                on:click={() => handleAttachmentClick(attachment.id, false)} />
            {#if showNewTabLinks}
                <IconBarButton
                    ariaLabel={__('Open attachment %s in a new tab', attachment.name)}
                    icon="open-new-window-16"
                    shape="pill"
                    on:click={() => handleAttachmentClick(attachment.id, true)} />
            {/if}
        </li>
    {/each}
</ul>
