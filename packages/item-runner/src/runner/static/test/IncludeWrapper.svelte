<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import Include from '../Include.svelte';
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;

    export let testComponentProps = {};
</script>

<div class="custom-include-box tao-overflow-y">
    <Include {...testComponentProps} />
</div>
