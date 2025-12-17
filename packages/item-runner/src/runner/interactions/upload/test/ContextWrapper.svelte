<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
    import { setContext } from 'svelte';
    import UploadInteraction from '../UploadInteraction.svelte';
    export let contextContent = {};
    export let uploadInteractionProperties;

    setContext(uploadInteractionProperties.itemIdentifier, contextContent);
</script>

<UploadInteraction {...uploadInteractionProperties} />
