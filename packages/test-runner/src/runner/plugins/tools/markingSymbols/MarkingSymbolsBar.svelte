<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;

    /**
     * Component is used to show marking symbols toolbar. Should be mounted in the test main area.
     * @property {String} serviceCallId
     * @property {Array<Object>} symbols
     * @property {Array<Object>} sections
     * @property {String} activeSymbolId
     * @property {Object<String, Number>} countsBySymbol
     * @fires 'select'
     * @fires 'close'
     */
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { __, getActualKey } from '@oat-sa-private/ui-core';
    import { Icon, IconBarButton } from '@oat-sa-private/ui-elements';
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestSessionStatusStore } from '../../../testsStateStore.js';

    export let serviceCallId;
    export let symbols = [];
    export let sections = [];
    export let activeSymbolId = null;
    export let countsBySymbol = {};

    const dispatch = createEventDispatcher();
    const statusStore = getTestSessionStatusStore(serviceCallId);
    const margin = 8;

    let barElement;
    let drag = {
        x: 0,
        y: 0,
        startX: 0,
        startY: 0,
        baseX: 0,
        baseY: 0,
        isDragging: false,
        startRect: null,
        pointerId: null
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    function handleDragStart(event) {
        if (event.button !== 0) {
            return;
        }
        if (event.target.closest('button')) {
            return;
        }
        const rect = barElement?.getBoundingClientRect() || null;
        drag = {
            ...drag,
            startRect: rect,
            startX: event.clientX,
            startY: event.clientY,
            baseX: drag.x,
            baseY: drag.y,
            isDragging: true,
            pointerId: event.pointerId
        };
        event.preventDefault();
    }

    function handleDragMove(event) {
        if (!drag.isDragging || drag.pointerId !== event.pointerId) {
            return;
        }
        const rect = drag.startRect;
        if (!rect) {
            return;
        }
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        const minX = margin - rect.left;
        const maxX = window.innerWidth - margin - rect.right;
        const minY = margin - rect.top;
        const maxY = window.innerHeight - margin - rect.bottom;
        const clampedDx = clamp(dx, minX, maxX);
        const clampedDy = clamp(dy, minY, maxY);
        drag = {
            ...drag,
            x: drag.baseX + clampedDx,
            y: drag.baseY + clampedDy
        };
    }

    function handleDragEnd(event) {
        if (!drag.isDragging || (drag.pointerId !== null && event.pointerId !== drag.pointerId)) {
            return;
        }
        drag = {
            ...drag,
            isDragging: false,
            startRect: null,
            pointerId: null
        };
    }

    onDestroy(() => {
        drag = {
            ...drag,
            isDragging: false,
            startRect: null,
            pointerId: null
        };
    });

    /**
     * Keydown handler
     * @param {KeyboardEvent} e event
     */
    function handleKeyDown(e) {
        const pressedKey = getActualKey(e);
        if (pressedKey === 'esc') {
            dispatch('close');
        }
    }

    /**
     * Action button click handler
     * @param {String} symbolId
     */
    function handleSymbolClick(symbolId) {
        dispatch('select', { symbolId });
    }

    function getSymbolLabel(symbol) {
        return symbol.label || symbol.name || symbol.id || '';
    }

    function getSymbolColor(symbol) {
        return symbol.color || '#000000';
    }

    function getSymbolIcon(symbol) {
        if (symbol.icon) {
            return symbol.icon;
        }
        return symbol.shapeId ? `marker-${symbol.shapeId}-12` : '';
    }
</script>

<style>
    :global(.toolbar-markingSymbols) {
        position: fixed;
        top: calc(var(--testrunner-header-height, 0rem) + 0.5rem);
        inset-inline-end: 4rem;
        width: 0;
        height: 0;
        margin: 0 !important;
        overflow: visible;
        pointer-events: none;
        z-index: var(--layer-4);
    }

    @media screen and (--mq-maxwidth-small) {
        :global(.toolbar-markingSymbols) {
            inset-inline-end: 1rem;
        }
    }

    .marking-symbols-bar {
        position: absolute;
        top: 0;
        inset-inline-end: 0;
        pointer-events: auto;
        min-width: 36rem;
        max-height: calc(100vh - var(--testrunner-header-height, 0rem) - 1rem);
        overflow: auto;
        background: var(--color-bg-default);
        border-radius: var(--radius-xlarge);
        box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.18);
        will-change: transform;
    }

    .marking-symbols-bar.dragging {
        cursor: grabbing;
    }

    header.panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem 2rem 1.25rem;
        text-transform: uppercase;
        font-weight: bold;
        font-size: var(--fontsize-body-s);
        letter-spacing: 0.03em;
        cursor: grab;
        user-select: none;
    }

    header.panel-header.dragging {
        cursor: grabbing;
    }

    .symbols {
        padding: 0 0 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }

    .symbol-btn {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 2rem;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        color: var(--color-text-default);
        font-size: var(--fontsize-body-s);
    }

    .divider {
        height: 0.1rem;
        margin: 0.75rem 2rem 0.25rem;
        background: var(--color-text-default);
        width: 90%;
        margin-inline: auto;
        opacity: 0.1;
    }

    .symbol-btn:focus {
        outline: none;
    }

    .symbol-btn:focus-visible {
        @add-mixin simple-outline var(--color-border-focus);
    }

    .symbol-btn.active {
        background: var(--color-bg-selection);
    }

    .symbol-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.6rem;
        height: 2.6rem;
        flex: 0 0 auto;
    }

    .symbol-icon :global(svg) {
        width: 100%;
        height: 100%;
        min-width: 0;
    }

    .symbol-label {
        flex: 1 1 auto;
        line-height: 1.3;
        white-space: normal;
    }

    .symbol-count {
        min-width: 2rem;
        text-align: right;
        font-weight: bold;
        color: var(--color-text-disabled);
    }
</style>

<svelte:window on:pointermove={handleDragMove} on:pointerup={handleDragEnd} on:pointercancel={handleDragEnd} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    bind:this={barElement}
    class="marking-symbols-bar"
    class:hidden={$statusStore === testSessionStatus.overlay}
    class:dragging={drag.isDragging}
    style={`transform: translate(${drag.x}px, ${drag.y}px);`}
    on:keydown={handleKeyDown}>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <header class="panel-header" class:dragging={drag.isDragging} on:pointerdown={handleDragStart}>
        <span>{__('Marking symbols')}</span>
        <IconBarButton
            icon="remove-16"
            size="base-16"
            ariaLabel={__('Close')}
            dataTestId="markingSymbols-close"
            on:click={() => dispatch('close')} />
    </header>
    <div class="symbols">
        {#each sections && sections.length ? sections : [{ symbols }] as section, sectionIdx}
            {#if sectionIdx > 0}
                <div class="divider" aria-hidden="true"></div>
            {/if}
            {#each section.symbols as symbol (symbol.id)}
                <button
                    type="button"
                    class="symbol-btn"
                    class:active={activeSymbolId === symbol.id}
                    on:click={() => handleSymbolClick(symbol.id)}>
                    <span class="symbol-icon" style={`color: ${getSymbolColor(symbol)}`}>
                        <Icon name={getSymbolIcon(symbol)} ariaHidden={true} />
                    </span>
                    <span class="symbol-label">{getSymbolLabel(symbol)}</span>
                    <span class="symbol-count">{countsBySymbol[symbol.id] || 0}</span>
                </button>
            {/each}
        {/each}
    </div>
</div>
