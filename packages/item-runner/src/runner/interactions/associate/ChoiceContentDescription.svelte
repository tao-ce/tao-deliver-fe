<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import ChoiceContent from './ChoiceContent.svelte';
    import { __ } from '@oat-sa-private/ui-core';

    export let otherChoice;
    export let instructionsLang;
</script>

<span class="visually-hidden">
    {#if otherChoice}
        <span lang={instructionsLang}>
            {__('Associated with')}
        </span>
        <ChoiceContent choice={otherChoice} />
    {:else}
        <span lang={instructionsLang}>{__('No association.')}</span>
    {/if}
</span>
