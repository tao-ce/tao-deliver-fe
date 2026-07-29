<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { getContext } from 'svelte';
    import BasicMessage from './BasicMessage.svelte';
    import { __ } from '@oat-sa-private/ui-core';

    /**
     * Message display component, with custom behaviour for link click
     * @property {String} itemIdentifier
     * @property {import('./typings').PlagiarismCheckReport} report
     */
    export let itemIdentifier;
    export let report = {};

    delete report.href; // because HBL reports always need to fetch the href on demand

    const itemContext = getContext(itemIdentifier);
    const logger = itemContext?.getLogger();

    let isFetching = false;
    let errorNotificationKey;

    /**
     * Open url in the new tab
     * @param {string} url
     */
    export function openUrlInNewTab(url) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';

        a.click();
    }
    /**
     * Fetches dynamic part to add the current plagiarism report.
     * The request should be made every time, since the report URL is short-lived
     * @returns {Promise<void>}
     */
    async function getPlagiarismReportDynamicData() {
        if (!report.reportUrl) {
            return;
        }
        const getData = itemContext?.getGetData?.();

        isFetching = true;

        const handlingOptions = { returnParsedJsonResponse: true };

        return getData(report.reportUrl, {}, handlingOptions)
            .then(data => {
                if (data.reportUrl && URL.canParse(data.reportUrl)) {
                    report.href = data.reportUrl;
                    openUrlInNewTab(data.reportUrl);
                } else {
                    throw new Error('No valid plagiarism reportUrl found');
                }
            })
            .catch(e => {
                logger.error(e);
                itemContext.removeItemNotification(errorNotificationKey);
                errorNotificationKey = itemContext.showItemNotification({
                    message: __('Failed to load the plagiarism report. Please try again.'),
                    hierarchy: 'alert'
                });
            })
            .finally(() => {
                isFetching = false;
            });
    }

    /**
     * @param {MouseEvent} e
     */
    function handleClick(e) {
        e.preventDefault();
        if (!isFetching) {
            getPlagiarismReportDynamicData();
        }
    }
</script>

<BasicMessage {report} on:click={handleClick} />
