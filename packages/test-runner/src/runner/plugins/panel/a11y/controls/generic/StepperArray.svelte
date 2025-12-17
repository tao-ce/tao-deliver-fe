<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';
    import Stepper from './Stepper.svelte';

    const dispatch = createEventDispatcher();

    /**
     * @property {*} value - one of the options
     * @property {array} options
     * @property {string} ariaLabelDecr
     * @property {string} ariaLabelIncr
     * @property {Boolean} disabled
     */
    export let value;
    export let options = [];
    export let ariaLabelDecr;
    export let ariaLabelIncr;
    export let disabled = false;

    const step = 1;
    const min = 0;

    $: max = options.length - 1;
    $: index = Math.max(0, options.indexOf(value));

    /**
     * @param {CustomEvent} e
     * @fires 'change'
     */
    function handleStepperChange(e) {
        dispatch(
            'change',
            Object.assign({}, e.detail, {
                value: options[e.detail.value]
            })
        );
    }
</script>

<Stepper value={index} {min} {max} {step} {ariaLabelDecr} {ariaLabelIncr} {disabled} on:change={handleStepperChange} />
