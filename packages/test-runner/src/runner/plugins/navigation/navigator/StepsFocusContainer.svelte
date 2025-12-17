<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2022 (original work) Open Assessment Technologies SA ;

    /**
     * Component to override tab focus behavior of StepProgress component: use arrow keys, not tab, to navigate inside it,
     * Set 'focusable="false"' property on StepProgress, and pass it inside <slot>.
     * You can pass several StepProgress components to treat them as a single tabstop.
     * @property {Boolean} disabled - StepProgess is in disabled state. Disabling single step is not supported.
     * @property {Boolean} focusCurrentStep - if 'true', put initial focus on current step; if 'false', put it on first step
     */
    import { arrowKeysFocusLoop, isRTLElement } from '@oat-sa-private/ui-core';

    export let hasFocus = false; //bind to this variable in parent component, to set needed tabindex on StepProgress steps

    let containerElement;

    $: isRTL = containerElement && isRTLElement(containerElement);

    function getFocusableElements() {
        // selector is from StepProgress internal implementation
        return containerElement.querySelectorAll('button.step');
    }

    function handleSetHasFocus(e) {
        hasFocus = e.detail;
    }
</script>

<div
    bind:this={containerElement}
    use:arrowKeysFocusLoop={{ getFocusableElements, isRTL }}
    on:setHasFocus={handleSetHasFocus}>
    <slot />
</div>
