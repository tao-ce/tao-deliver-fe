<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;

    // interaction-level QTI attributes:
    export let markup = '';
    export let typeIdentifier;
    export let properties;

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let classes = '';
    export let dir;

    // data attributes
    export let dataAttrs = {};

    export let prompt;

    export let container;
</script>

<div
    class="qti-interaction qti-blockInteraction qti-customInteraction {classes}"
    data-type-identifier={typeIdentifier}
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}>
    <div class="prompt">{prompt}</div>
    <div class="exposed-pci-properties">{JSON.stringify(properties)}</div>
    <div class="container" bind:this={container}>
        {@html markup}
    </div>
</div>
