<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public License version 2
    // Copyright (c) 2026 (original work) Open Assessment Technologies SA ;
    import { getContext } from 'svelte';

    export let itemIdentifier;

    const itemContext = getContext(itemIdentifier);

    function handleErrorClick() {
        itemContext.triggerError(new Error('Interaction went wrong'));
    }
</script>

<div class="mock-erroring-interaction" data-props={JSON.stringify($$props)}>
    <button id="error" on:click={handleErrorClick}>Error</button>
</div>
