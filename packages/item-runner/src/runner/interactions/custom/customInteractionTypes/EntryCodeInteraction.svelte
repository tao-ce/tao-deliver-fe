<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import CustomInteractionDefault from './CustomInteractionDefault.svelte';
    import { __ } from '@oat-sa-private/ui-core';

    export let properties;

    // Provide the host locale to the PCI, in case it is configured to use it
    properties.locale = properties.locale || __.getLocale();
</script>

<CustomInteractionDefault {...$$props} />
