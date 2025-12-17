<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import { IconBarButton } from '@oat-sa-private/ui-elements';
    import { screenSize } from '../../screenSizeStore.js';

    /**
     * @property {String} heading
     */
    export let heading = __('Overlay');

    /**
     * @property {String} icon - base name of any icon from ui-identity
     * It's important that the icon exists in 16px and 24px sizes in the LDS
     */
    export let icon = 'remove';
    export let disableCloseBtn = false;

    $: iconSize = $screenSize.mobile ? '16' : '24';

    const dispatch = createEventDispatcher();

    /**
     * @fires 'close' event
     */
    function handleClose() {
        dispatch('close');
    }
</script>

<style>
    div {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 6rem;
        /* OverlayHeaderBar follows sizing of ui-components/HeaderBar */
        @media screen and (--mq-minwidth-medium) {
            height: 8rem;
        }

        & h2 {
            outline: none;
            order: 2;
            @media screen and (--mq-maxwidth-medium) {
                font-size: var(--fontsize-body-s);
            }
        }
        /* Re-order bar elements so programatically-focusable h2 can be first in DOM, with close button next */
        & .start {
            order: 1;
        }
        & .end {
            order: 3;
        }

        & .start,
        & .end {
            display: flex;
            justify-content: center;
            min-width: 6rem;
            @media screen and (--mq-minwidth-medium) {
                min-width: 8rem;
            }
        }
    }
</style>

<div class="inverted">
    <h2 class="ui-heading" id="a11y-overlay" tabindex="-1">{heading}</h2>
    <span class="start">
        <IconBarButton
            label={__('Close overlay')}
            size="base-{iconSize}"
            icon="{icon}-{iconSize}"
            dataTestId="closeoverlay"
            disabled={disableCloseBtn}
            on:click={handleClose} />
    </span>
    <span class="end">
        <slot name="bar-end" />
    </span>
</div>
