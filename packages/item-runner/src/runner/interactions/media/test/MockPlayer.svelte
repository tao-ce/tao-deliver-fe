<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';

    const dispatch = createEventDispatcher();

    const startListener = () => {
        dispatch('start');
    };
    const finishListener = () => {
        dispatch('finish');
    };
    const timeupdateListener = e => {
        dispatch('timeupdate', e.detail);
    };

    onMount(() => {
        document.body.addEventListener('mockplayer-start', startListener);
        document.body.addEventListener('mockplayer-finish', finishListener);
        document.body.addEventListener('mockplayer-timeupdate', timeupdateListener);
    });

    onDestroy(() => {
        document.body.removeEventListener('mockplayer-start', startListener);
        document.body.removeEventListener('mockplayer-finish', finishListener);
        document.body.removeEventListener('mockplayer-timeupdate', timeupdateListener);
    });
</script>

<video id="mock-player" on:keydown on:start on:pause on:finish on:seeked on:seeking>
    <track kind="captions" />
    {JSON.stringify($$props)}
</video>
