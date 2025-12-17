<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
    import { Flyout } from '@oat-sa-private/ui-components';
    import { Button } from '@oat-sa-private/ui-elements';

    /**
     * Inline Popup button for acting on a text selection
     * @property {HTMLElement|Range} reference - for Flyout, which will accept either type (anything having getBoundingClientRect)
     */
    export let reference; // Flyout will accept an HTMLElement or a Range (anything having getBoundingClientRect)

    const modifiers = [
        // https://popper.js.org/docs/v2/modifiers/flip/
        {
            name: 'flip',
            options: {
                fallbackPlacements: ['bottom-end', 'top-end', 'bottom-start', 'top-start', 'bottom', 'top']
            }
        }
    ];
</script>

<style>
    .comment-highlight-button-flyout :global(.flyout.flyout) {
        border: none;
        background: none;
        box-shadow: none;
        z-index: var(--layer-4);
    }
</style>

<div class="comment-highlight-button-flyout">
    <!-- the #key block ensures that with each new reference, the Flyout instantiates its Popper in the correct place -->
    {#key reference}
        <Flyout {reference} isOpen={!!reference} trigger="manual" placement="bottom-end" {modifiers}>
            <Button
                shape="pill"
                icon="comment-16"
                label={__('Write feedback')}
                skin="secondary"
                size="small"
                on:click />
        </Flyout>
    {/key}
</div>
