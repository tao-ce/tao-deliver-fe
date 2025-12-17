<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2025 (original work) Open Assessment Technologies SA ;
    import { setContext } from 'svelte';

    //test component wrapper used to set a context
    //and instantiate the tested component, so the context is available

    export let testContextKey;
    export let testContext = {};
    export let testComponent;
    export let testComponentProps = {};

    setContext(testContextKey, testContext);
</script>
<svelte:component this={testComponent} {...testComponentProps} />
