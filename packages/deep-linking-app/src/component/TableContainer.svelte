<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { createEventDispatcher } from 'svelte';
    import { CheckCell, DataTable, Loading } from '@oat-sa-private/ui-components';
    import RadioCell from './RadioCell.svelte';

    const maxLength = 100;
    const dispatch = createEventDispatcher();

    let selectedItems = [];
    let rows = [];

    export let items = [];
    export let columns = [];
    export let searchValue = '';
    export let isLoading = true;
    export let isMultiSelectEnabled = false;

    const rowSelected = row => row[0].checked;

    const updateRows = (itemsData, searchText) => {
        rows = itemsData
            .map(itemData => {
                const id = itemData.id;
                let rowData = [{ checked: selectedItems.includes(id) }];
                rowData = [
                    ...rowData,
                    ...columns.map(column => ({
                        data:
                            itemData[column.id].length > maxLength
                                ? `${itemData[column.id].substring(0, maxLength)}...`
                                : itemData[column.id],
                        _type: column.id
                    }))
                ];

                return rowData;
            })
            .filter(row => row.some(item => String(item.data).includes(searchText)));
    };

    const onTableAction = e => {
        const { type, checked, key } = e.detail;

        switch (type) {
            // CheckCell action
            case 'check':
                selectedItems = checked ? [...selectedItems, key] : selectedItems.filter(id => id !== key);
                break;

            // CheckCell action in Header
            case 'selectAll':
                selectedItems = checked ? items.map(item => item.id) : [];
                break;

            // RadioCell action
            case 'select':
                if (checked) {
                    selectedItems = [key];
                } else {
                    selectedItems = [];
                }

                updateRows(items, searchValue);
                break;
        }

        dispatch('select', { selectedItems });
    };

    const getRowKey = row => {
        const idRow = row.filter(item => item._type === 'id')[0];

        if (idRow) {
            return idRow.data;
        }

        return '';
    };

    $: updateRows(items, searchValue);
    $: tableColumns = [{ title: '', cellComponent: isMultiSelectEnabled ? CheckCell : RadioCell }].concat(
        columns.map(column => ({ title: column.label }))
    );
</script>

<DataTable columns={tableColumns} {rows} fullwidth={true} {rowSelected} on:action={onTableAction} rowKey={getRowKey} />
{#if isLoading}<Loading />{/if}
