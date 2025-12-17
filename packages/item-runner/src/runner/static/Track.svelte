<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { getContext } from 'svelte';

    export let itemIdentifier;
    export let attributes = {};

    const itemContext = getContext(itemIdentifier);
    const assetManager = itemContext && itemContext.getAssetManager();

    const resolvedAttributes = Object.assign({}, attributes);
    resolvedAttributes.src = assetManager ? assetManager.resolve(attributes.src) : attributes.src;
</script>

<track {...resolvedAttributes} />
