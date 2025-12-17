<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;

    import { hasClass } from '../../interactions/util/attributes.js';
    import { getItemSequentialInteractionsStore } from '../../itemsSequentialInteractionsStore.js';

    export let itemIdentifier;
    export let responseIdentifier;
    export let classes = '';
    export let renderer = 'common';
    export let handler; // caller can implement here timings for custom start() and finish() calls

    const sequentialInteractionsStore = getItemSequentialInteractionsStore(itemIdentifier);

    const isSequential = hasClass(classes, 'sequential');
    if (renderer === 'common' && isSequential) {
        sequentialInteractionsStore.register(responseIdentifier);

        if (typeof handler === 'function') {
            handler();
        }
    }
</script>
