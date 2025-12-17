<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
    import { getTestStateStore } from '@oat-sa-private/tao-test-runner-qtinui/src/runner/testsStateStore.js';
    import { __ } from '@oat-sa-private/ui-core';

    export let serviceCallId;
    export let getLaunchUrlForLocale;

    const testStateStore = getTestStateStore(serviceCallId);

    function loadHeaderState() {
        const testMap = testStateStore.getTestMap();
        const testContext = testStateStore.getTestContext();
        const currentItem = testStateStore.getCurrentItem();

        const testLabel = testMap.label || '';
        const itemLabel =  currentItem && currentItem.label || '';

        const currentLocale = testContext.locale || '';
        const otherLocales = testMap.locales || [];

        const links = otherLocales.map(otherLocale => ({
            label: __('View %s', otherLocale),
            href: getLaunchUrlForLocale(otherLocale)
        }));

        return {
            testLabel,
            itemLabel,
            currentLocale,
            links
        };
    }

    $: headerState = loadHeaderState($testStateStore);
</script>

<style>
    .unit-preview-header {
        height: 6rem;
        padding: 0 2rem;

        display: flex;
        flex-direction: row;
        align-items: center;

        & span {
            margin-right: 1.5rem;
            font-size: var(--fontsize-body);
        }
        & ul {
            list-style: none;
            margin: 0;
            padding: 0;
            display: inline-flex;
            flex-wrap: nowrap;

            & li {
                margin: 0 1rem;
            }

            & a {
                text-decoration: underline;
                font-weight: bold;
                font-size: var(--fontsize-body-s);
            }
        }
    }
</style>

<header class="unit-preview-header">
    <span>{headerState.testLabel}</span>
    {#if headerState.currentLocale}
        <span>/</span>
        <span>{headerState.itemLabel}</span>
    {/if}
    {#if headerState.currentLocale}
        <span>/</span>
        <span>{headerState.currentLocale}</span>
    {/if}
    <ul>
        {#each headerState.links as link (link.href)}
            <li>
                <a href={link.href} target="_blank">{link.label}</a>
            </li>
        {/each}
    </ul>
</header>
