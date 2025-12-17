<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import Details from '../Details.svelte';

    export let config;
</script>

<Details {config}>
    <p slot="summary">The title</p>
    <p>The remainder</p>
    <p>of the content</p>
</Details>
