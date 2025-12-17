<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { Avatar, Flyout } from '@oat-sa-private/ui-components';
    import { __, generateElementId, getActualKey } from '@oat-sa-private/ui-core';
    import { IconBarButton } from '@oat-sa-private/ui-elements';
    import { screenSize } from '../../screenSizeStore.js';

    /**
     * @typedef TestTaker
     * @property {string?} id - login username
     * @property {string?} name - full name
     * @property {string?} firstName
     * @property {string?} lastName
     */
    /**
     * @type {TestTaker}
     */
    export let testTaker;

    const isAnonymous = !testTaker || !testTaker.id;
    const fullname = !isAnonymous && getFullname();
    const username = !isAnonymous && testTaker.id;

    function getFullname() {
        if (testTaker.firstName && testTaker.lastName) {
            return `${testTaker.firstName} ${testTaker.lastName}`;
        }
        return testTaker.name || testTaker.firstName || testTaker.lastName || '';
    }

    const flyoutModifiers = [{ name: 'preventOverflow', options: { padding: 16 } }]; //see popperjs
    const flyoutContentId = generateElementId('menu');
    let isFlyoutOpen = false;
    let containerElement;
    let buttonElement;

    $: buttonIconSize = $screenSize.mobile ? '16' : '24';
    $: buttonElement = containerElement && containerElement.querySelector('.icon-bar-btn');

    /**
     * @param {KeyboardEvent} e
     */
    function handleButtonKeydown(e) {
        const keyname = getActualKey(e);
        if (keyname === 'esc') {
            isFlyoutOpen = false;
        }
    }
</script>

<style>
    .user-menu {
        margin-inline-start: 1rem;

        & [role='menu'] {
            padding: 1.5rem;
            display: grid;
            gap: 1rem;
            grid-template-columns: auto 1fr;
            align-items: center;
            min-width: 30rem;
            max-width: min(45rem, 90vw);

            & .username {
                font-size: var(--fontsize-body-s);
                color: var(--color-gs-dark-secondary);
            }
        }
    }
</style>

{#if !isAnonymous}
    <div class="user-menu" bind:this={containerElement}>
        <IconBarButton
            label={__('User: %s', fullname || username)}
            ariaExpanded={isFlyoutOpen}
            ariaHasPopup={true}
            ariaControls={flyoutContentId}
            size="base-{buttonIconSize}"
            on:keydown={handleButtonKeydown}>
            <Avatar name={fullname} seed={username} size="normal" />
        </IconBarButton>

        <Flyout reference={buttonElement} bind:isOpen={isFlyoutOpen} trigger="click" modifiers={flyoutModifiers}>
            <div role="menu" id={flyoutContentId}>
                <Avatar name={fullname} seed={username} size="normal" />
                <div>
                    <div class="ui-heading">{fullname}</div>
                    <div class="username">{username}</div>
                </div>
            </div>
        </Flyout>
    </div>
{/if}
