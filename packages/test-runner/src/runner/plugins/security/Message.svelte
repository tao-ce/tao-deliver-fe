<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { onMount, createEventDispatcher } from 'svelte';
    import { Button } from '@oat-sa-private/ui-elements';
    import { __, generateElementId, focusTrap } from '@oat-sa-private/ui-core';
    import { actions } from '../../feedback/navigationFeedbackConfigs';

    const dispatch = createEventDispatcher();

    export let config = {};
    // For ARIA ids
    const messageId = generateElementId('description');
    let dialogElement;

    const okButton = {
        key: actions.proceed,
        label: __('ok'),
        skin: 'primary',
        dataTestId: 'ok'
    };

    /**
     * Fires events & closes this overlay
     * @fires close
     */
    function handleBtnClick() {
        dispatch('done', { action: okButton.key });
    }

    onMount(() => {
        setTimeout(() => {
            if (dialogElement && dialogElement.querySelectorAll('button').length) {
                dialogElement.querySelectorAll('button')[0].focus();
            }
        }, 400);
    });
</script>

<style>
    .message-modal {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: var(--color-bg-default);
        @add-mixin flex-center-center;
        flex-direction: column;
        height: 100%;
        z-index: var(--layer-5);

        & .actions {
            margin-top: 3rem;
        }

        & :global(button) {
            min-width: 20rem;
            max-height: 5rem;
            font-size: 80%;
        }
    }
</style>

<div
    class="message-modal"
    role="dialog"
    tabindex="-1"
    aria-describedby={config.message ? messageId : null}
    bind:this={dialogElement}>
    {#if config.message}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <p class="ui-heading-l" id={messageId}>{@html config.message}</p>
    {/if}
    <slot></slot>
    <div class="actions" use:focusTrap>
        <Button {...okButton} shape="pill" on:click={() => handleBtnClick()} />
    </div>
</div>
