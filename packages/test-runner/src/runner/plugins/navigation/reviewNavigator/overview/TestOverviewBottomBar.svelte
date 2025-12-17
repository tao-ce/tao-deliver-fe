<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2025 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import { Button } from '@oat-sa-private/ui-elements';
    import { screenSize } from '../../../../screenSizeStore.js';

    const dispatch = createEventDispatcher();

    export let isFinalDelivery = true;
    const closeButtonLabel = __('Go back to the question');
    const finishButtonLabel = isFinalDelivery ? __('Exit test review') : __('Continue to next test');

    /**
     * @fires 'finish' event
     */
    function handleFinish() {
        dispatch('finish');
    }

    /**
     * @fires 'close' event
     */
    function handleClose() {
        dispatch('close');
    }

    $: navButtonSize = $screenSize.mobile ? 'small' : 'medium';
</script>

<style>
    .overview-bottom-bar {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: flex-end;
        align-items: center;
        height: var(--testrunner-footer-height);
        min-height: var(--testrunner-footer-height);
        padding: 0 var(--space-2x);
        gap: 2rem;
    }

    .back-button :global(button) {
        border: none;
    }
</style>

<div class="overview-bottom-bar">
    <span class="back-button">
        <Button
            name="overview-close"
            label={closeButtonLabel}
            ariaLabel={closeButtonLabel}
            icon="revert-16"
            skin="secondary"
            shape="pill"
            size={navButtonSize}
            on:click={handleClose} />
    </span>
    <Button
        name="overview-finish"
        label={finishButtonLabel}
        ariaLabel={finishButtonLabel}
        shape="pill"
        size={navButtonSize}
        skin="secondary"
        on:click={handleFinish} />
</div>
