<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import { Icon } from '@oat-sa-private/ui-elements';

    const dispatch = createEventDispatcher();

    /**
     * Details component - can expand to reveal additional slotted contents
     *
     * @property {string} key - so that events can be recognised by parent
     * @property {object} config
     * @property {boolean} config.collapsible
     * @property {boolean} config.collapsed - initial value, can be overridden
     * @property {boolean} collapsed - dynamic value
     * @property {boolean} outlined - for styling
     * @property {string} ariaLabelCollapse - aria-label when <summary> is focused and open
     * @property {string} ariaLabelExpand - aria-label when <summary> is focused and closed
     */
    export let key;

    export let config = { collapsible: true };

    export let collapsed = false;
    let open = !(config.collapsed || collapsed);

    export let outlined = false;

    export let ariaLabelCollapse;
    export let ariaLabelExpand;

    let detailsElement;

    $: summaryAriaLabel = open ? ariaLabelCollapse : ariaLabelExpand;
    $: summaryIcon = open ? 'chevron-up-12' : 'chevron-down-12';

    /**
     * Handle the native toggle event of the <details>
     * @fires 'toggle'
     */
    function handleToggle() {
        open = detailsElement.open;
        dispatch('toggle', {
            key,
            collapsed: !open
        });
    }
</script>

<style>
    .a11y-group {
        color: var(--color-text-default);
        background: var(--color-bg-default);
        border: var(--border-thin) solid var(--color-gs-light-secondary); /* overridden below */
        border-radius: 3rem;
        padding-inline-start: 1.5rem;
        padding-inline-end: 2rem;

        &.outlined {
            outline: var(--border-medium) solid var(--color-border-selected);
            outline-offset: calc(-1 * var(--border-thin));
        }

        /* :global to use mixin without warning */
        & :global(summary),
        & :global(.summary) {
            color: var(--color-text-default);
            height: 5rem;
            list-style: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            margin-block: 0.5rem;
            margin-inline: -0.5rem;
            padding-inline: 0.5rem;
            @add-mixin outline-focus 0rem;

            & :global(:first-child) {
                flex-grow: 1;
            }
        }
        & summary::-webkit-details-marker {
            display: none;
        }
    }
    .a11y-group :global(*) {
        box-sizing: border-box; /* fix a chrome bug where content-box is applied */
    }
</style>

{#if config.collapsible}
    <details class="a11y-group" class:outlined {open} bind:this={detailsElement} on:toggle={handleToggle}>
        <summary aria-label={summaryAriaLabel} title={summaryAriaLabel}>
            <slot name="summary" />
            <Icon name={summaryIcon} ariaHidden={true} />
        </summary>
        <!-- `hidden` is to solve `focusTrap` keyboard navigation -->
        <div class:hidden={!open}>
            <slot />
        </div>
    </details>
{:else}
    <div class="a11y-group" class:outlined>
        <div class="summary">
            <slot name="summary" />
        </div>
        <slot />
    </div>
{/if}
