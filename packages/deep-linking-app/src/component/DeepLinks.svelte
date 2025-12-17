<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { onMount } from 'svelte';
    import { __ } from '@oat-sa-private/ui-core';
    import { Button, Heading } from '@oat-sa-private/ui-elements';
    import { SearchInput, TabGroup } from '@oat-sa-private/ui-components';
    import config from '../config';
    import { getBatteries, getDeliveries, submitBatteriesAndDeliveries } from '../service/deliverService';
    import TableContainer from './TableContainer.svelte';

    let activeTab = config.tabs.batteries.id;
    let searchValue = '';
    let batteries = [], deliveries = [];
    let areBatteriesLoading = true, areDeliveriesLoading = true;
    let selectedBatteries = [], selectedDeliveries = [];

    export let isMultiSelectEnabled = false;
    export let hideBatteries = false;
    export let hideDeliveries = false;

    onMount(async () => {
        if (hideBatteries) {
            activeTab = config.tabs.deliveries.id;
        }

        if (hideDeliveries) {
            activeTab = config.tabs.batteries.id;
        }

        await loadBatteries();
        await loadDeliveries();
    });

    async function loadBatteries() {
        const { data } = await getBatteries();
        batteries = data;
        areBatteriesLoading = false;
    }

    async function loadDeliveries() {
        const { data } = await getDeliveries();
        deliveries = data;
        areDeliveriesLoading = false;
    }

    const setSelectedBatteries = (e) => {
        if (!isMultiSelectEnabled) {
            selectedDeliveries = [];
        }

        selectedBatteries = e.detail.selectedItems;
    };

    const setSelectedDeliveries = (e) => {
        if (!isMultiSelectEnabled) {
            selectedBatteries = [];
        }

        selectedDeliveries = e.detail.selectedItems;
    };

    const getTabs = () => Object.values(config.tabs).map(tab => ({
        key: tab.id,
        label: tab.label,
        disabled: (tab.id === config.tabs.batteries.id && hideBatteries) || (tab.id === config.tabs.deliveries.id && hideDeliveries),
    }));

    const handleTabChange = (e) => activeTab = e.detail.key;

    const handleSearch = (e) => searchValue = e.detail;

    const handleSubmit = async () => {
        const result = await submitBatteriesAndDeliveries(selectedBatteries, selectedDeliveries);
        if (result.url) {
            window.location.href = result.url;
        } else if (result.html) {
            document.body.innerHTML = result.html;
            document.forms[0]?.submit();
        }
    };
</script>

<style>
    .deep-linking-page {
        padding: 0 25px;
    }

    .deep-linking-page .row {
        display: flex;
        justify-content: space-around;
    }
</style>

<div class="deep-linking-page">
    <Heading level={1}>{__('Select content and link to course')}</Heading>
    <TabGroup
        tabs={getTabs()}
        {activeTab}
        on:change={handleTabChange}
    />
    <div class="row">
        <SearchInput name="search" placeholder={__('Search')} value={searchValue} on:change={handleSearch} />
        <Button shape="pill" label="{__('Link selected')}" on:click={handleSubmit} />
    </div>
    {#if activeTab === config.tabs.batteries.id && !hideBatteries}
        <TableContainer
            columns={config.dataTable.batteries.columns}
            items={batteries}
            isLoading={areBatteriesLoading}
            {searchValue}
            {isMultiSelectEnabled}
            on:select={(selectedItems) => setSelectedBatteries(selectedItems)}
        />
    {/if}
    {#if activeTab === config.tabs.deliveries.id && !hideDeliveries}
        <TableContainer
            columns={config.dataTable.deliveries.columns}
            items={deliveries}
            isLoading={areDeliveriesLoading}
            {searchValue}
            {isMultiSelectEnabled}
            on:select={(selectedItems) => setSelectedDeliveries(selectedItems)}
        />
    {/if}
</div>