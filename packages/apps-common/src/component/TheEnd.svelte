<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-21 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to render final page for the test. Can be error or finish.
     * @property {String} title header of the message
     * @property {String} info optional informational message
     * @property {String} cause optional error cause message
     * @property {String} remediation optional error remediation message
     * @property {String} icon icon to be displayed
     * @property {Boolean} retry if true the reload button will be displayed
     */
    import { Icon, Button } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';
    import { breakpoints } from '@oat-sa-private/ui-identity';

    export let title;
    export let info;
    export let cause = false;
    export let remediation = false;
    export let icon = 'lightning-16';
    export let retry = false;
    export let withExitUrlRedirect = false;

    let windowWidth;
    $: fullwidth = windowWidth && windowWidth <= breakpoints.width.small;

    /**
     * Handle action
     */
    function handleClick() {
        window.location.reload();
    }

    /**
     * Enqueues the element focus
     * @param {HTMLElement} element element to focus
     */
    function focus(element) {
        element.tabIndex = '-1';
        setTimeout(() => element.focus(), 1);
    }
</script>

<style>
    .the-end {
        width: 100vw;
        height: 100vh;
        @add-mixin flex-center-center;
        padding: 0 6rem;
    }

    .container {
        display: flex;
        justify-content: center;
        align-items: flex-start;
    }

    .icon-container {
        width: 10rem;
        height: 10rem;
        margin: 0 4rem 0 0;

        & :global(.icon) {
            transform: translateX(4rem) translateY(3.5rem) scale(5);
        }
    }

    .info {
        max-width: 55rem;
        & > h1 {
            outline: none;
            margin: 0 var(--space-half) var(--space-2x) var(--space-half);
        }
        & > p {
            margin: 0 var(--space-half);
        }
        & > p:not(:last-child) {
            margin-bottom: 0;
        }
    }

    .button-container {
        margin-top: 2rem;
    }

    @media screen and (--mq-maxwidth-small) {
        .the-end {
            padding: 0 2rem;
        }

        .container {
            @add-mixin flex-center-center;
            flex-direction: column;
        }

        .icon-container {
            margin: 0 0 4rem 0;
        }
    }
</style>

<svelte:window bind:innerWidth={windowWidth} />

<div class="the-end">
    <div class="container">
        <div class="icon-container">
            <Icon name={icon} />
        </div>
        <div class="info">
            <h1 class="ui-heading-xl" use:focus>{title}</h1>
            {#if info}
                <p>{info}</p>
            {/if}
            {#if cause}
                <p>{cause}</p>
            {/if}
            {#if remediation && !withExitUrlRedirect}
                <p>{remediation}</p>
            {/if}
            {#if retry}
                <div class="button-container">
                    <Button
                        shape="pill"
                        size="small"
                        skin="secondary"
                        label={__('Reload the page')}
                        on:click={handleClick}
                        {fullwidth} />
                </div>
            {/if}
            <!-- This is needed to announce focused h1 by NVDA -->
            {#if !(cause || remediation || retry)}
                <div class="visually-hidden">{title}</div>
            {/if}
        </div>
    </div>
</div>
