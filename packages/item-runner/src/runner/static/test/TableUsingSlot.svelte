<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    import Table from '../Table.svelte';

    export let testComponentProps = {};
</script>

<Table {...testComponentProps}>
    <caption>My table</caption>
    <thead>
        <tr><th>TH1</th><th>TH2</th></tr>
    </thead>
    <tbody>
        <tr><td>TD1</td><td>TD2</td></tr>
        <tr><td>TD3</td><td>TD4</td></tr>
    </tbody>
</Table>
