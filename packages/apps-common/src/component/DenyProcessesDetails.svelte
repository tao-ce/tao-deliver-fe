<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2026 (original work) Open Assessment Technologies SA ;

    /**
     * @typedef {Object} ProcessInfo
     * @property {string} label - user-friendly process name
     */
    /**
     * @type {ProcessInfo[]}
     */
    export let denyProcesses;
</script>

<style>
    ul {
        margin-block: 2rem 2.5rem;
        padding-inline-start: 4rem;
    }
</style>

<ul>
    {#each denyProcesses as processInfo}
        <li>{processInfo.label || processInfo.name}</li>
    {/each}
</ul>
