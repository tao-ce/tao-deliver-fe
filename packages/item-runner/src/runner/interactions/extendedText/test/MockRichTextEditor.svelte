<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script context="module">
    let instanceDispatch;

    // tests using this mock should only render 1 instance!
    export function triggerChange(detail) {
        instanceDispatch('change', detail);
    }
</script>

<script>
    import { onMount, createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    // expose this instance's dispatcher to module scope
    instanceDispatch = dispatch;

    onMount(() => {
        dispatch('ready');
    });
</script>

<div class="rich-text-editor-mock" data-props={JSON.stringify($$restProps)}></div>
