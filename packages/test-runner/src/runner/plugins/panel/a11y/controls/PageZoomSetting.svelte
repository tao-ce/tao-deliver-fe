<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onDestroy } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import settingsKeys from '../../../settings/settingsKeys.js';
    import Stepper from './generic/Stepper.svelte';

    const dispatch = createEventDispatcher();

    const origFontSizePercent = 50; /* value comes from @oat-sa-private/ui-identity _typography.css */

    export let config = { zoomLevels: [] };

    const defaultValue = 0;

    // stepper props
    const min = 0;
    const step = 1;
    let max = 5;
    let value = defaultValue;
    const ariaLabelDecr = __('zoom out');
    const ariaLabelIncr = __('zoom in');

    const allZoomLevels = [100, 110, 125, 150, 175, 200];
    const zoomLevels = allZoomLevels.filter(lvl => config?.zoomLevels?.includes(lvl));
    max = zoomLevels.length - 1;

    /**
     * @property {object} initialState
     */
    export let initialState;

    let zoomLevel = zoomLevels[value];
    if (initialState?.value) {
        handleZoomChange({ detail: initialState });
    }

    /**
     * Page zoom implementation: change base rem size
     * - consistent rendering across all components
     * - no issue with measured elements
     * - no issue with drag&drop
     * - it only works if the change is made on the documentElement (<html>) level
     * @param {CustomEvent} event
     * @fires 'change'
     */
    function handleZoomChange(event) {
        const newValue = event?.detail?.value;
        if (typeof newValue === 'number' && newValue >= min && newValue <= max) {
            value = newValue;
            zoomLevel = zoomLevels[value] || zoomLevels[0];
            document.documentElement.style.fontSize = `${(origFontSizePercent * zoomLevel) / 100}%`;
            document.body.dataset.zoomLevel = `${zoomLevel}`;

            dispatch('change', {
                key: settingsKeys.pageZoom,
                state: {
                    value,
                    zoomLevel,
                    nonDefault: event?.detail?.nonDefault
                }
            });
        }
    }

    /**
     * Unset DOM attributes on destroy
     */
    onDestroy(() => {
        document.documentElement.style.fontSize = `${origFontSizePercent}%`;
        delete document.body.dataset.zoomLevel;
    });
</script>

<Stepper {min} {max} {step} {value} {ariaLabelDecr} {ariaLabelIncr} on:change={handleZoomChange} />
