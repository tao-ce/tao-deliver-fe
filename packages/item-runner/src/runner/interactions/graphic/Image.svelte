<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { onMount } from 'svelte';

    export let src;
    export let width = 600;
    export let height = 480;
    export let x = 0;
    export let y = 0;

    let href;

    //need to postpone setting the href of image
    //because in Safari load event fires too quick in image is cached
    onMount(() => {
        href = src;
    });
</script>

<style>
    .svg-image {
        pointer-events: none;
    }
</style>

<image class="svg-image" {width} {height} {x} {y} preserveAspectRatio="none" {href} on:load on:error />
