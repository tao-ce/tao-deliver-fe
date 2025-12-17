<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023-2024 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import settingsKeys from '../../../settings/settingsKeys.js';

    import ControlRow from './generic/ControlRow.svelte';
    import ColourSwitcher from './generic/ColourSwitcher.svelte';
    import CursorSvg from './util/CursorSvg.svelte';

    const dispatch = createEventDispatcher();

    /**
     * @property {object} initialState
     */
    export let initialState;

    export let areaBroker;
    const targetElement = areaBroker?.getContainer();

    // colors
    const defaultColorKey = 'default';
    const colors = {
        default: {
            label: __('Default'),
            fill: 'white',
            stroke: 'black'
        },
        white: {
            label: __('White'),
            fill: 'white',
            stroke: 'black'
        },
        black: {
            label: __('Black'),
            fill: 'black',
            stroke: 'white'
        },
        yellow: {
            label: __('Yellow'),
            fill: 'yellow',
            stroke: 'black'
        },
        green: {
            label: __('Green'),
            fill: 'lime',
            stroke: 'black'
        },
        red: {
            label: __('Red'),
            fill: 'red',
            stroke: 'black'
        }
    };
    let colorSelected = defaultColorKey;

    const normalizedColors = Object.keys(colors).map(key => ({
        // properties for ColourSwitcher
        key,
        label: colors[key].label,
        colour: `--cursor-color-${key}`,
        // properties for colorHandler
        id: key
    }));

    // sizes
    const sizes = {
        pointer: [
            { w: 12, h: 16 },
            { w: 22, h: 32 },
            { w: 44, h: 64 },
            { w: 66, h: 96 },
            { w: 88, h: 128 }
        ],
        hand: [
            { w: 14, h: 16 },
            { w: 29, h: 32 },
            { w: 58, h: 64 },
            { w: 87, h: 96 },
            { w: 116, h: 128 }
        ]
    };
    const minStepperValue = 0;
    const maxStepperValue = sizes.pointer.length - 1;
    const step = 1;
    let stepperValue = 0;

    let cursorSvg = null;

    function addCursor(position) {
        if (!cursorSvg) {
            // Create the component if it doesn't exist yet
            cursorSvg = new CursorSvg({
                target: targetElement,
                props: {
                    size: sizes.pointer[stepperValue],
                    color: colors[colorSelected],
                    targetElement,
                    position
                }
            });
            cursorSvg.addSvgCursor();
        } else {
            // Or change its type
            cursorSvg.$set({
                size: sizes.pointer[stepperValue],
                color: colors[colorSelected],
                position
            });
            cursorSvg.addSvgCursor();
        }
    }

    function removeCursor() {
        if (cursorSvg) {
            cursorSvg.$destroy();
            cursorSvg = null;
        }
    }

    function handleMouseChange(position) {
        if (colorSelected === defaultColorKey && stepperValue === minStepperValue) {
            removeCursor();
            return;
        }
        addCursor(position);
    }
    let nonDefault = initialState?.nonDefault;

    /**
     * Handle the input being changed
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleMouseSizeChange(event) {
        stepperValue = event.detail.value;
        const position = event.detail.position;

        handleMouseChange(position);

        dispatch('change', {
            key: settingsKeys.mousePointer,
            state: {
                size: sizes.pointer[stepperValue].h,
                color: colorSelected,
                nonDefault: stepperValue !== minStepperValue
            }
        });
    }

    function handleMouseColorChange(event) {
        colorSelected = event.detail.value;
        const position = event.detail.position;

        handleMouseChange(position);

        dispatch('change', {
            key: settingsKeys.mousePointer,
            state: {
                size: sizes.pointer[stepperValue].h,
                color: colorSelected,
                nonDefault: colorSelected !== defaultColorKey
            }
        });
    }

    onMount(() => {
        if (initialState?.color) {
            handleMouseColorChange({ detail: { value: initialState.color } });
        }
        if (initialState?.size) {
            let stepperValueForSize = sizes.pointer.findIndex(s => s.h === initialState.size);
            if (stepperValueForSize < 0) {
                stepperValueForSize = minStepperValue;
            }
            handleMouseSizeChange({ detail: { value: stepperValueForSize } });
        }
    });

    onDestroy(() => {
        removeCursor();
    });
</script>

<style>
    :root {
        /* A11y cursor */
        --cursor-color-white: #ffffff;
        --cursor-color-black: #000000;
        --cursor-color-yellow: #ffff00;
        --cursor-color-green: #00ff00;
        --cursor-color-red: #ff0000;
    }

    .mouse-pointer-setting :global(.select.lite button) {
        border-bottom: 0;
    }
</style>

<div
    class="mouse-pointer-setting"
    class:changed-control={colorSelected !== defaultColorKey || stepperValue !== minStepperValue}>
    <ColourSwitcher
        value={colorSelected}
        options={normalizedColors}
        defaultOptionKey={defaultColorKey}
        on:change={handleMouseColorChange}
        name="contrast-pointer-picker" />
    <ControlRow
        icon="pointer-size-16"
        label={__('Size')}
        min={minStepperValue}
        max={maxStepperValue}
        {step}
        {nonDefault}
        value={stepperValue}
        ariaLabelDecr={__('decrease pointer size')}
        ariaLabelIncr={__('increase pointer size')}
        on:change={handleMouseSizeChange} />
</div>
