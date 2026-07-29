<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
    import { endAssessment } from 'taoDeliverAppsCommon/util/endAssessment.js';

    /**
     * This component let's you manage the content of the menu panel
     * @property {Object} [jwtTokenHandler]
     * @property {string} [exitUrl] - if an exit url is defined the logout button is added
     * @property {string} [endAssessmentUrl] - LtiEndAssessment initiation URL
     * @property {Object[]} [links] - the list of links for the panel
     * @property {Object} [footer] - the footer configuration
     * @property {Object} [footer.logo] - a custom logo
     * @property {string} [footer.logo.src] - custom logo URL
     * @property {string} [footer.logo.alt] - custom logo alternative text
     * @property {Array} [footer.content] - list of content for the footer, each item can be a string or a link
     */
    export let jwtTokenHandler;
    export let exitUrl;
    export let endAssessmentUrl;

    export let links = [
        {
            label: __('Privacy Policy'),
            href: 'https://www.taotesting.com/privacy/'
        },
        {
            label: __('About'),
            href: 'https://www.taotesting.com/about-us/'
        }
    ];

    export let footer = {
        logo: {
            src: 'logo.svg',
            alt: __('TAO logo')
        },
        content: [
            `© TAO ${new Date().getFullYear()}`,
            {
                href: 'https://taotesting.com',
                label: 'Open Assessment Technologies S.A.'
            },
            __('All rights reserved')
        ]
    };

    function exit() {
        return endAssessment({ jwtTokenHandler, exitUrl, endAssessmentUrl });
    }
</script>

<style>
    div {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        & ul {
            list-style: none;
            padding: 0;
        }
        & .panel-menu {
            & li {
                text-transform: uppercase;
                padding: 1rem var(--space-2x);
                overflow: auto;

                & :global(a) {
                    @add-mixin outline-focus -1rem;

                    &:focus-visible:after {
                        border-color: var(--color-border-focus-inverted);
                    }
                }

                & a {
                    display: block;
                    text-decoration: none;
                }
            }
        }
        & .panel-actions {
            margin-block: auto 0;
            margin-inline: var(--space-1x5) var(--space-2x);
            display: flex;
            align-self: flex-end;
            & li {
                font-size: var(--fontsize-body-s);
                line-height: 3rem;
                padding: 0 var(--space-1x);
                & :global(a) {
                    @add-mixin outline-focus -0.5rem;

                    &:focus-visible:after {
                        border-color: var(--color-border-focus-inverted);
                    }
                }
            }
        }
        & footer {
            display: flex;
            flex-flow: row nowrap;
            justify-content: center;
            height: 10rem;
            border-top: 1px solid var(--color-gs-dark-secondary);
            margin-block: 0 var(--space-2x);
            margin-inline: var(--space-2x5) var(--space-3x);
            padding-top: var(--space-2x);
            /* avoid cascading a11y styles: */
            letter-spacing: 0;
            word-spacing: 0;

            & img {
                display: block;
                max-height: 5rem;
                margin: auto;
            }
            & p {
                margin-left: 2rem;
                font-size: var(--fontsize-body-xs);
                flex: 1 0 67%;
                line-height: 2.25rem;

                & :global(a) {
                    @add-mixin outline-focus -0.5rem;

                    &:focus-visible:after {
                        border-color: var(--color-border-focus-inverted);
                    }
                }
            }
        }
    }
</style>

<div>
    <ul class="panel-menu">
        {#each links as link}
            <li><a href={link.href} rel="noopener noreferrer" target="_blank">{link.label}</a></li>
        {/each}
    </ul>
    <ul class="panel-actions">
        {#if exitUrl}
            <li><a href={exitUrl} on:click|preventDefault={exit}>{__('Logout')}</a></li>
        {/if}
    </ul>
    <footer>
        {#if footer.logo}<img src={footer.logo.src} alt={footer.logo.alt} />{/if}
        {#if footer.content}
            <p>
                {#each footer.content as row, index}
                    {#if typeof row === 'object' && row.href}
                        <a href={row.href} rel="noopener noreferrer" target="_blank">{row.label}</a>
                    {:else}{row}{/if}
                    {#if index < footer.content.length - 1}<br />{/if}
                {/each}
            </p>
        {/if}
    </footer>
</div>
