<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import Svg from '../Svg.svelte';
</script>

<Svg imgWidth="500" imgHeight="300" imgSrc="file.png">
    <g slot="bay">
        <text>Test Bay Slot</text>
    </g>
    <g slot="content">
        <text>Test Content Slot</text>
    </g>
</Svg>
