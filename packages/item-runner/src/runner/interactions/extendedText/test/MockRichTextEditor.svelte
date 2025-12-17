<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { onMount, createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    onMount(() => {
        dispatch('ready');
    });
</script>

<div class="rich-text-editor-mock" data-props={JSON.stringify($$restProps)} />
