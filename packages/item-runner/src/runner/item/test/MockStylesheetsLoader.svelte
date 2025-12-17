<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    dispatch('complete');
</script>

<div class="styles-container-mock" data-props={JSON.stringify($$restProps)} />
