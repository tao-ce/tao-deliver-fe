<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;

    /**
     * Component for testing purpose; renders simple list of divs containing items
     * in form of index-value
     * @prop {Array} selected the array of items
     */

    import SortableList from '../SortableList.svelte';

    export let selected;
    export let max;
    export let selectedKeysLength;
    export let selectedSnapshot;
    export let suggestedKey;
    export let itemRemovable;
</script>

<SortableList
    {selected}
    {max}
    {selectedKeysLength}
    {selectedSnapshot}
    {suggestedKey}
    {itemRemovable}
    let:item
    on:update
    on:move>
    <div class="item">{item.key}</div>
</SortableList>
