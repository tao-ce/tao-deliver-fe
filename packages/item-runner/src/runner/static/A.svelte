<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;

    export let attributes = {};

    $: isLocal = !attributes.href || attributes.href.trim().startsWith('#');
</script>

<a
    href={attributes.href}
    target={isLocal ? void 0 : '_blank'}
    rel={isLocal ? void 0 : 'noopener noreferrer'}
    {...attributes}><slot /></a>
