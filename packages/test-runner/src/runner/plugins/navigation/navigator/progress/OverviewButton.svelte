<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;

    import { createEventDispatcher } from 'svelte';
    import { Button } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';
    import { getTestStateStore } from '../../../../testsStateStore.js';
    import getItemViewPositions from '../getItemViewPositions.js';
    import { screenSize } from '../../../../screenSizeStore.js';

    const dispatch = createEventDispatcher();

    export let serviceCallId;
    export let disabled = false;

    const testStateStore = getTestStateStore(serviceCallId);

    let label;
    let ariaLabel;

    /**
     * @fires 'overview' event
     */
    function handleClick() {
        dispatch('overview');
    }

    /**
     * Load data for needed to render component from store
     * @returns {Object} mapped data
     */
    function loadButtonState() {
        const testPart = testStateStore.getCurrentTestPart();
        const item = testStateStore.getCurrentItem();
        if (!testPart || !item) {
            return {};
        }
        const viewPositions = getItemViewPositions(testPart);
        const informationalItemKeys = Object.keys(viewPositions).filter(position => !viewPositions[position]);
        return {
            informational: item.informational,
            viewPosition: item.informational
                ? informationalItemKeys.indexOf(item.position.toString()) + 1
                : viewPositions[item.position],
            totalNonInformational: testPart.stats.total - informationalItemKeys.length
        };
    }

    $: buttonState = $testStateStore ? loadButtonState() : {};

    $: {
        if ($screenSize.mobile) {
            //U+1D456 for 'i', which looks more like icon and won't be uppercased
            const itemLabel = buttonState.informational ? `𝒊 ${buttonState.viewPosition}` : buttonState.viewPosition;
            const itemAriaLabel = buttonState.informational
                ? __('informational item %d', buttonState.viewPosition)
                : __('question %d', buttonState.viewPosition);
            if (buttonState.totalNonInformational > 0) {
                label = `${itemLabel} / ${buttonState.totalNonInformational}`;
                ariaLabel = __('Open overview. Currently %s of %d', itemAriaLabel, buttonState.totalNonInformational);
            } else {
                label = itemLabel;
                ariaLabel = __('Open overview. Currently %s', itemAriaLabel);
            }
        } else {
            if (buttonState.totalNonInformational > 0) {
                label = __('Overview (%d)', buttonState.totalNonInformational);
                ariaLabel = __('Open overview of all %d questions', buttonState.totalNonInformational);
            } else {
                label = __('Overview');
                ariaLabel = __('Open overview of all items');
            }
        }
    }
</script>

<Button
    name="overview"
    {label}
    {ariaLabel}
    shape="pill"
    size="small"
    skin="secondary"
    icon="chevron-top-16"
    {disabled}
    on:click={handleClick} />
