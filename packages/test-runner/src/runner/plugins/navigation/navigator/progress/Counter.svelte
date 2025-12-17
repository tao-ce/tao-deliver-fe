<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;

    /**
     * Component displays step progress in a form of counter.
     * @property {Number} position 1-indexed position in the test
     * @property {Number} total stats.total from testPart
     */

    export let position;
    export let total;
</script>


{#if position && total}
    <div class="counter">{position} / {total}</div>
{/if}
