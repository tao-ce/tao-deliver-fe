<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;

    import { Button, IconBarButton } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';
    import { createEventDispatcher } from 'svelte';

    export let itemTitle;

    export let showResponsePanel = false;

    $: showResponsePanelButtonLabel = showResponsePanel ? __('hide response panel') : __('show response panel');

    const dispatch = createEventDispatcher();

    function toggleResponsePanel() {
        dispatch('toggleResponsePanel');
    }

    function close() {
        dispatch('close');
    }
</script>

<style>
    .previewer-header-bar {
        height: 7rem;
        display: flex;
        flex-direction: row;

        & .bar-section {
            flex-grow: 1;
            display: flex;

            & .item-name {
                vertical-align: text-top;
                line-height: 2.5rem;
            }
        }

        & .bar-main-section {
            align-items: center;
            gap: var(--space-1x);
        }

        & .bar-reverse-direction {
            display: flex;
            justify-content: flex-end;
            align-items: center;

            & :global(button) {
                background: none;
                margin-right: 1rem;
            }
        }

        & .mobile-toggle-response-panel {
            display: none;
        }
    }

    @media only screen and (--mq-maxwidth-large) {
        .previewer-header-bar {
            & .toggle-response-panel {
                display: none;
            }

            & .mobile-toggle-response-panel {
                display: block;
            }
        }
    }
</style>

<div class="previewer-header-bar">
    <div class="bar-section bar-main-section">
        <IconBarButton icon="remove-16" on:click={close} ariaLabel={__('close item preview')} />
        <div class="item-name">{itemTitle}</div>
    </div>
    <div class="bar-section bar-reverse-direction">
        <div class="toggle-response-panel">
            <Button
                label={__('RESPONSE PANEL')}
                icon="list-16"
                shape="pill"
                iconSide="right"
                size="small"
                inverted="true"
                dataTestId="toggle-response-panel"
                ariaLabel={showResponsePanelButtonLabel}
                on:click={toggleResponsePanel} />
        </div>
        <div class="mobile-toggle-response-panel">
            <IconBarButton icon="list-16" ariaLabel={showResponsePanelButtonLabel} on:click={toggleResponsePanel} />
        </div>
    </div>
</div>
