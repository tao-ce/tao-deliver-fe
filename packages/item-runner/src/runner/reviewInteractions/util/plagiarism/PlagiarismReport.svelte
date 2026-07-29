<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022-2025 (original work) Open Assessment Technologies SA ;
    import BasicMessage from './BasicMessage.svelte';
    import HblMessage from './HblMessage.svelte';

    const reportComponents = Object.freeze({
        default: BasicMessage,
        hbl: HblMessage
    });

    /**
     * Abstraction component to display a reportComponent
     * The reportComponent can be changed by specifying its provider name and props
     * @property {String} itemIdentifier
     * @property {import('./typings').PlagiarismCheckReport} report - type and props for the reportComponent
     */
    export let itemIdentifier;
    export let report = {};

    const provider = report.provider || 'default';
    const reportComponent = reportComponents[provider];
</script>

<svelte:component this={reportComponent} {itemIdentifier} {report} />
