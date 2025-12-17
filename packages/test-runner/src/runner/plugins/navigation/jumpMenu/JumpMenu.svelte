<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { getTestStateStore, getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { createEventDispatcher, tick } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';

    export let serviceCallId;
    export let items = [];

    // Expose refresh trigger for when menu items changed between $testStateStore changes
    export function refresh() {
        setAvailableItems();
    }

    const testStateStore = getTestStateStore(serviceCallId);
    const testStatusStore = getTestSessionStatusStore(serviceCallId);

    const dispatch = createEventDispatcher();

    let availableItems = [];

    $: currentItem = $testStateStore ? testStateStore.getCurrentItem() : null;
    $: currentTestMap = $testStateStore ? testStateStore.getTestMap() : null;
    $: currentTestPart = $testStateStore ? testStateStore.getCurrentTestPart() : null;
    // After $testStateStore was updated UI can be not updated => tick is necessity
    $: $testStateStore ? tick().then(() => setAvailableItems()) : '';

    /**
     * Fires when menu item was pressed
     * @param {string} itemType - item type(e.g toolbox or navigation)
     */
    function handleJumpLinkAction(itemType) {
        dispatch('focusElement', { itemType });
    }

    /**
     * Fires when menu item was focused
     * @param {string} itemType - item type(e.g toolbox or navigation)
     */
    function handleJumpLinkFocus(itemType) {
        dispatch('highlight', { itemType });
    }

    /**
     * Fires when menu item was focused out
     * @param {string} itemType - item type(e.g toolbox or navigation)
     */
    function handleJumpLinkFocusOut(itemType) {
        dispatch('unhighlight', { itemType });
    }

    /**
     * Filter items by status and availability.
     * If item has specific selectors should check that at least one of them is available.
     * For example for toolbox should be taken area and try to query by selector.
     * If there arent any selectors should be return true because registered area in areaBroker always available
     */
    function setAvailableItems() {
        availableItems = items.filter(item => {
            // filtering by status
            if (!item.availableStatuses.includes($testStatusStore)) {
                return false;
            }

            return item.getFocusableElement(item.area);
        });
    }
</script>

<style>
    .jump-menu {
        position: absolute;
        z-index: var(--layer-5);
        top: 0;
        left: 0;

        & ul {
            list-style: none;
            margin: 0;
            padding: 0;

            & li button {
                height: 0;
                display: block;
                padding: 0;
                color: var(--color-text-active);
                background: var(--color-brand);
                font-family: var(--font-ui);
                font-size: var(--fontsize-body);
                border: none;
                outline: none;
                pointer-events: none;
                opacity: 0;

                &:focus {
                    height: 9rem;
                    margin: 0.5rem;
                    padding: var(--space-1x) var(--space-5x);
                    opacity: 1;
                }
            }
        }
    }
</style>

<div role="region" class="jump-menu" aria-labelledby="a11y-jump-menu">
    <h2 id="a11y-jump-menu" class="visually-hidden">{__('Jump Menu')}</h2>
    <ul>
        {#each availableItems as item (item.type)}
            <li>
                <button
                    data-test-id="jump-{item.type}"
                    on:click={() => handleJumpLinkAction(item.type)}
                    on:focus={() => handleJumpLinkFocus(item.type)}
                    on:focusout={() => handleJumpLinkFocusOut(item.type)}>
                    {__('Jump to')}
                    <strong>{item.getLabel(currentItem, currentTestPart, currentTestMap)}</strong>
                </button>
            </li>
        {/each}
    </ul>
</div>
