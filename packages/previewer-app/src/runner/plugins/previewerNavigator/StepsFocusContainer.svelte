<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;

    /**
     * Component to override tab focus behavior of StepProgress component: use arrow keys, not tab, to navigate inside it,
     * pass StepProgress inside <slot>, set its `firstFocusableKey` and `containerHasFocus` properties
     */
    import { arrowKeysFocusLoop, isRTLElement } from '@oat-sa-private/ui-core';

    export let hasFocus = false; //bind to this variable in parent component, and use to set `containerHasFocus` on StepProgress

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
