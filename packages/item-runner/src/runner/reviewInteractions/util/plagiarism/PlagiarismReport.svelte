<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
    import BasicMessage from './BasicMessage.svelte';

    const reportComponents = Object.freeze({
        'default': BasicMessage,
        'hbl': BasicMessage
    });

    /**
     * @typedef PlagiarismCheckReport
     * @property {String} provider - name which maps to a reportComponent which should render the report
     * @property {String} status
     * @property {String} [href]
     * Any other properties could be included, depending on the chosen reportComponent's API
     */

    /**
     * Abstraction component to display a reportComponent
     * The reportComponent can be changed by specifying its provider name and props
     * @property {PlagiarismCheckReport} report - type and props for the reportComponent
     */
    export let report = {};

    const provider = report.provider || 'default';
    const reportComponent = reportComponents[provider];
</script>

<svelte:component this={reportComponent} {...report} />
