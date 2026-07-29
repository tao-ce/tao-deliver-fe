<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
    import { getTestSessionUserDataService } from '../session/testSessionUserDataService.js';

    /**
     * FloatingToolbarAreas
     * This component renders the containers which some Test Runner plugins will use as their UI targets.
     */

    /**
     * The template fixes the UI layout of floating toolbars
     * - the order of rows
     * - the order of toolbars sharing a row
     */
    // prettier-ignore
    const template = Object.freeze([
        ['readAloud'],
        ['highlighter'],
        ['attachments']
    ]);

    export let serviceCallId;
    const toolsStore = getTestSessionUserDataService(serviceCallId).getToolsStore();

    // All of Test Runner's plugins. The ones which don't appear in the template will be ignored.
    export let plugins = {};

    function getPlugin(name) {
        return Object.values(plugins).find(plugin => plugin.getName() === name);
    }

    function getOpenedPlugins() {
        const flatTemplate = template.reduce((acc, el) => acc.concat(el), []);

        return flatTemplate.filter(pluginName => {
            const pluginState = toolsStore.getTestToolState(pluginName);
            return pluginState && pluginState.open;
        });
    }

    $: openedPlugins = $toolsStore && getOpenedPlugins();
</script>

<style>
    .floating-toolbars {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;

        /* children of .open elements are the toolbars added dynamically by plugins */
        & > div {
            margin-inline-start: 1rem;
            &.open:not(.toolbar-attachments) {
                margin-bottom: 0.5rem;
            }
        }
        /* forces next toolbar onto new row */
        & > .flex-break {
            width: 100%;
        }
    }
</style>

<div class="floating-toolbars">
    {#each template as row, i}
        {#each row as toolName}
            {#if getPlugin(toolName)}
                <div class="toolbar-{toolName}" class:open={openedPlugins.includes(toolName)}></div>
            {/if}
        {/each}
        {#if i + 1 < template.length}
            <div class="flex-break"></div>
        {/if}
    {/each}
</div>
