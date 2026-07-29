<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
    import { Icon } from '@oat-sa-private/ui-elements';
    import { createEventDispatcher, onDestroy, onMount } from 'svelte';

    /**
     * Component is used to display scratchpad tools
     * @fires select event with selected tool
     * @property {Object[]} tools tools to render
     */

    //used to distinguish click and longpress
    const longpressInterval = 300;

    const dispatch = createEventDispatcher();

    export let tools = [];
    export let pointerDownCallback = () => {};

    let currentKey;
    let longpressTimerId;
    let containerElement;

    /**
     * Handler for tool selection
     */
    function handleToolSelection() {
        //currentKey is set when we mousedown some tool button and nullified on tool expansion
        //so if it's not null, we can treat it as usual click
        if (currentKey) {
            clearSelected();
            let foundTool = findToolByKey(currentKey);

            if (foundTool) {
                //there is a case for initial select of the tool with sub-options
                if (foundTool.onetime) {
                    handleToolExpansion();
                } else {
                    //mutate tools and send them up with select event
                    if (foundTool.parent) {
                        if (foundTool.parent.onetime) {
                            delete foundTool.parent.onetime;
                        }
                        foundTool.parent = Object.assign(foundTool.parent, foundTool);
                        delete foundTool.parent.parent;
                        foundTool.parent.selected = true;
                        delete foundTool.parent;
                    } else {
                        foundTool.selected = true;
                    }

                    collapseAllSubtools();
                    dispatch('select', { tools });
                    currentKey = null;
                }
            }
        }
    }

    /**
     * Handler for mousedown of tool's button
     * @param {String} key
     */
    function handleMousedown(key) {
        pointerDownCallback();
        currentKey = key;
        longpressTimerId = setTimeout(handleToolExpansion, longpressInterval);
    }

    /**
     * Handler for mouseup of tool's button
     */
    function handleMouseup() {
        if (longpressTimerId) {
            clearInterval(longpressTimerId);
            handleToolSelection();
        }
    }

    /**
     * Handler for tool's subtool expansion
     */
    function handleToolExpansion() {
        longpressTimerId = void 0;
        if (currentKey) {
            const foundTool = findToolByKey(currentKey);
            if (foundTool) {
                collapseAllSubtools();
                if (foundTool.opener) {
                    foundTool.expanded = true;
                    attachMousedownOutsideListener();
                }
            }
            tools = tools;
            currentKey = null;
        }
    }

    /**
     * Searches for tool with the key
     * @param {String} key
     * @returns {Object} tool object with parent attribute if found in subtool
     */
    function findToolByKey(key) {
        let foundTool;
        tools.forEach(tool => {
            if (tool.key === key) {
                foundTool = tool;
            } else if (tool.tools) {
                const foundSubTool = tool.tools.find(subTool => subTool.key === key);
                if (foundSubTool) {
                    foundSubTool.parent = tool;
                    foundTool = foundSubTool;
                }
            }
        });
        return foundTool;
    }

    /**
     * Sets all tools expanded prop to false
     */
    function collapseAllSubtools() {
        detachMousedownOutsideListener();
        tools.forEach(tool => {
            tool.expanded = false;
        });
    }

    /**
     * Sets selected prop to false to all tools
     */
    function clearSelected() {
        tools.forEach(tool => {
            tool.selected = false;
        });
    }

    /**
     * Handler for mousedown outside tools
     * @param {DOMEvent} e
     */
    function mousedownOutsideHandler(e) {
        if (!containerElement.contains(e.target)) {
            collapseAllSubtools();
            detachMousedownOutsideListener();
            tools = tools;
        }
    }

    /**
     * Attaches the mousedown listener to window
     */
    function attachMousedownOutsideListener() {
        window.addEventListener('mousedown', mousedownOutsideHandler);
    }

    /**
     * Removes the mousedown listener from window
     */
    function detachMousedownOutsideListener() {
        window.removeEventListener('mousedown', mousedownOutsideHandler);
    }

    onMount(() => {
        dispatch('mount', { tools });
    });

    //ensure we are clean
    onDestroy(() => {
        clearInterval(longpressTimerId);
        detachMousedownOutsideListener();
    });
</script>

<style>
    ol.tools-main {
        position: fixed;
        z-index: var(--layer-3);
        display: inline-block;
        padding: 0;
        margin: 0;
        list-style: none;

        & li {
            width: 5.5rem;
            height: 5.5rem;
            box-sizing: content-box;
            line-height: 1.5;

            & button {
                position: relative;
                display: inline-block;
                color: var(--color-text-default);
                background: var(--color-bg-info);
                border: none;
                padding: 0;
                width: 5.5rem;
                height: 5.5rem;

                @add-mixin outline-focus 0;

                &:hover,
                &:active,
                &:focus {
                    background: var(--color-bg-actionable-secondary-hover);
                }
            }
        }

        & > li {
            position: relative;
            border-right: var(--border-thin) solid var(--color-border-default);
            border-bottom: var(--border-thin) solid var(--color-border-default);

            & ol.tools-options {
                list-style-type: none;
                display: flex;
                flex-direction: row;
                position: absolute;
                left: calc(5.5rem + var(--border-thin));
                top: calc(-1 * var(--border-thin));
                padding: 0;
                margin: 0;

                & > li {
                    display: none;
                    border-top: var(--border-thin) solid var(--color-border-default);
                    border-bottom: var(--border-thin) solid var(--color-border-default);
                    &:last-child {
                        border-right: var(--border-thin) solid var(--color-border-default);
                    }
                }

                &:before {
                    position: absolute;
                    z-index: var(--layer-1);
                    left: -1.125rem;
                    top: 2.35rem;
                    width: 0;
                    height: 0;
                    border-left: 0.5rem solid var(--color-border-default);
                    border-top: 0.5rem solid transparent;
                    border-right: 0.5rem solid transparent;
                    border-bottom: 0.5rem solid transparent;
                    pointer-events: none;

                    content: '';
                }

                &.expanded {
                    & > li {
                        display: block;
                    }
                    &:before {
                        border-left: 0.5rem solid var(--color-text-inverted);
                    }
                }
            }

            & li:first-child {
                border-top: 0;
            }

            &.selected {
                & > button {
                    background: var(--color-bg-selected);
                    color: var(--color-text-inverted);
                    &:hover {
                        background-color: var(--color-bg-actionable-hover);
                    }
                    &:focus-visible:after {
                        border-color: var(--color-border-focus-inverted);
                        top: 0.5rem;
                        right: 0.5rem;
                        bottom: 0.5rem;
                        left: 0.5rem;
                    }
                }

                & ol.tools-options:before {
                    border-left: 0.5rem solid var(--color-text-inverted);
                }
            }
        }
    }
</style>

<ol class="tools-main" bind:this={containerElement}>
    {#each tools as tool}
        <li class:selected={tool.selected}>
            <button
                class:focus-visible={false}
                aria-label={tool.label}
                data-test-id={`scratchpadTool-${tool.key}`}
                on:mousedown|preventDefault={e => {
                    e.buttons === 1 && handleMousedown(tool.key);
                }}
                on:touchstart|preventDefault={() => handleMousedown(tool.key)}
                on:touchend={handleMouseup}
                on:mouseup={handleMouseup}><Icon name={tool.icon} /></button>
            {#if tool.tools}
                <ol
                    class="tools-options"
                    class:expanded={tool.expanded}
                    data-test-id={`scratchpadTool-subtools-${tool.key}`}>
                    {#each tool.tools as subTool}
                        <li class="sub-option">
                            <button
                                aria-label={subTool.label}
                                class:focus-visible={false}
                                data-test-id={`scratchpadTool-subtool-${subTool.key}`}
                                on:mousedown|preventDefault={e => {
                                    e.buttons === 1 && handleMousedown(subTool.key);
                                }}
                                on:touchstart|preventDefault={() => handleMousedown(subTool.key)}
                                on:touchend={handleToolSelection}
                                on:mouseup={handleToolSelection}>
                                <Icon name={subTool.icon} />
                            </button>
                        </li>
                    {/each}
                </ol>
            {/if}
        </li>
    {/each}
</ol>
