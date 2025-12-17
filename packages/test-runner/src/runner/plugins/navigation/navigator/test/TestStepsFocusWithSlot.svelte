<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { StepProgress } from '@oat-sa-private/ui-components';
    import StepsFocusContainer from '../StepsFocusContainer.svelte';

    export let containerProps;
    export let stepsPropsOne;
    export let stepsPropsTwo;

    let containerHasFocus;
</script>

<div class="withslot">
    <StepsFocusContainer {...containerProps} bind:hasFocus={containerHasFocus}>
        <StepProgress {...stepsPropsOne} {containerHasFocus} on:move />
        <StepProgress {...stepsPropsTwo} {containerHasFocus} on:move />
    </StepsFocusContainer>
</div>
