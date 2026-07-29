<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { __, generateElementId } from '@oat-sa-private/ui-core';
    import { Panel } from '@oat-sa-private/ui-components';
    import ContrastGroup from './groups/ContrastGroup.svelte';
    import PointerGroup from './groups/PointerGroup.svelte';
    import TextGroup from './groups/TextGroup.svelte';
    import ZoomGroup from './groups/ZoomGroup.svelte';
    import { settingsGroupKeys } from './pluginConfig.js';

    const dispatch = createEventDispatcher();

    const groupComponents = {
        [settingsGroupKeys.contrast]: ContrastGroup,
        [settingsGroupKeys.pointer]: PointerGroup,
        [settingsGroupKeys.text]: TextGroup,
        [settingsGroupKeys.zoom]: ZoomGroup
    };

    /**
     * Component of the a11y menu panel and its contents
     * @property {Boolean} open
     * @property {object} areaBroker
     * @property {object} pluginConfig
     * @property {object} initialSettingsState
     * @fires 'change' - corresponding to child controls
     * @fires 'toggle' - corresponding to details groups
     */
    export let open = false;
    export let areaBroker;
    export let pluginConfig = {};
    export let initialSettingsState = {};

    let headerElementId = generateElementId('a11y-panel-header');

    $: dispatch(open ? 'open' : 'close');
</script>

<style>
    .a11y-menu-panel {
        /* avoid cascading a11y styles: */
        line-height: 1.5;
        letter-spacing: 0;
        word-spacing: 0;
        color: var(--color-text-default);

        /* for this panel only, override default overlay style */
        --color-overlay: transparent;

        & h2 {
            line-height: 1.2;
            color: var(--color-text-default);
        }
        & :global(.panel) {
            --drawer-width: 42rem; /* 37rem in Figma, but a11y controls don't fit */
        }
        & :global(.panel .drawer .header) {
            --header-height: calc(4.5rem + var(--fontsize-heading-l));
        }
        & :global(.drawer.drawer.drawer) {
            /* use specificity to override component styles */
            background-color: var(--color-bg-info);
            border-inline-start: var(--border-thin) solid var(--color-gs-light-secondary);
        }
    }
    .a11y-menu-panel-content {
        height: 100%;
        padding: 0 2.5rem;

        & > :global(*) {
            margin-top: 2rem;
        }
        & > :global(:first-child) {
            margin-top: 0.25rem;
        }

        & :global(header) {
            padding: 0 0 0.5rem;
        }

        & :global(h3) {
            display: inline-block;
            margin: 0;

            & > :global(.icon),
            & > :global(span > .icon) {
                margin-inline-end: 0.75rem;
            }
        }

        & :global(h3.flex) {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        & :global(ul) {
            list-style: none;
            padding: 0;
            margin-block: 0;
            margin-inline: 0.5rem 0;

            & :global(li) {
                border-top: var(--border-thin) solid var(--color-gs-light-alternative-bg);
                padding-block: 0.5rem;
                &:first-child {
                    border-top: none;
                }
            }
        }

        &::after {
            content: '';
            display: block;
            height: 4rem;
        }
    }
</style>

<div class="a11y-menu-panel">
    <Panel bind:open side="end" inverted={false} role="toolbar" ariaLabelledBy={headerElementId}>
        <div slot="header" class="a11y-menu-panel-header">
            <h2 class="ui-heading-l" id={headerElementId}>{__('Accessibility tools')}</h2>
        </div>
        <section class="a11y-menu-panel-content">
            {#each pluginConfig.groups as groupName}
                <svelte:component
                    this={groupComponents[groupName]}
                    {areaBroker}
                    {pluginConfig}
                    {initialSettingsState}
                    on:toggle
                    on:change />
            {/each}
        </section>
    </Panel>
</div>
