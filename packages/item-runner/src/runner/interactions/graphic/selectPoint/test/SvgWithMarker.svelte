<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import Svg from '../../Svg.svelte';
    import Marker from '../Marker.svelte';

    export let coords;
    export let key;
    export let selected = false;
    export let disabled = false;
    export let imgWidth;
    export let imgHeight;
</script>

<Svg {imgWidth} {imgHeight} imgSrc="file.png">
    <g slot="content">
        <Marker
            {coords}
            {key}
            {selected}
            {disabled}
            maxX = {imgWidth}
            maxY = {imgHeight}
            on:click
            on:mount
            on:dragEnd
            on:focus
            on:blur />
    </g>
</Svg>
