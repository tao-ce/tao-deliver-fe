<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023-2024 (original work) Open Assessment Technologies SA ;
    import { Calculator, calculatorMinSize, DraggableModal } from '@oat-sa-private/ui-components';
    import { __, getDefaultRemSizePx } from '@oat-sa-private/ui-core';
    import { testLayoutStore, setActiveTool } from '../../../layout/testLayoutStore.js';

    /**
     * A component that displays a calculator.
     * @property {string} type the type of calculator to present, it can be either: 'basic', 'bodmas', 'scientific'
     * @property {number} decimals the number of decimals to present after the dot
     * @property {number} top the top offset of the containing DraggableModal (px)
     * @property {number} left the left offset of the containing DraggableModal (px)
     * @property {number} width the width of the containing DraggableModal (rem)
     * @property {number} height the height of the containing DraggableModal (rem)
     * @fires 'close' when the container modal is closed
     * @fires 'resize' when the container modal is resized
     * @fires 'move' when the container modal is moved
     * @fires 'command' when a command is invoked in the calculator
     * @fires 'change' when the expression is changed
     * @fires 'result' when the expression has been evaluated
     * @fires 'error' when an error occurred while evaluating the expression
     */

    // Minimal size that fits all calculator variants
    const defaultPxInRem = getDefaultRemSizePx();
    const minWidth = calculatorMinSize.width * defaultPxInRem;
    const minHeight = calculatorMinSize.height * defaultPxInRem;

    export let type = 'basic';
    export let decimals = 5;
    export let top = 0;
    export let left = 0;
    export let width = minWidth;
    export let height = minHeight;

    const title = __('Calculator');
</script>

<style>
    .calculator-wrapper {
        letter-spacing: 0;
        word-spacing: 0;
        position: fixed;
        z-index: calc(var(--layer-5) - 2);

        & :global(.header) {
            white-space: nowrap;
            overflow: hidden;
        }

        &.active {
            z-index: calc(var(--layer-5));
        }
    }
</style>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="calculator-wrapper" class:active={$testLayoutStore.activeTool === 'calculator'} on:mousedown={() => setActiveTool('calculator')}>
    <DraggableModal
        {title}
        {top}
        {left}
        {width}
        {height}
        {minWidth}
        {minHeight}
        noRemScaling={true}
        on:close
        on:resize
        on:move>
        <Calculator {type} {decimals} on:mount={() => setActiveTool('calculator')} on:result on:error />
    </DraggableModal>
</div>
