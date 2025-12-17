<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import { Button } from '@oat-sa-private/ui-elements';
    import { screenSize } from '../../../../screenSizeStore.js';

    const dispatch = createEventDispatcher();

    export let disabled = false;

    /**
     * @fires 'submit' event
     */
    function handleSubmit() {
        if (disabled) {
            return;
        }
        dispatch('submit');
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
            label={__('Go back to the question')}
            ariaLabel={__('Go back to the question')}
            icon="revert-16"
            skin="secondary"
            shape="pill"
            size={navButtonSize}
            on:click={handleClose}
        />
    </span>
    <Button
        name="overview-submit"
        label={__('Submit this part')}
        ariaLabel={__('Submit this part')}
        shape="pill"
        size={navButtonSize}
        skin="secondary"
        icon="submit-16"
        iconSide="right"
        {disabled}
        on:click={handleSubmit}
    />
</div>
