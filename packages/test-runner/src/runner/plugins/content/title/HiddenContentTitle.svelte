<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
    import { testSessionStatus } from '../../../session/sessionStates.js';
    import { getTestStateStore, getTestSessionStatusStore } from '../../../testsStateStore.js';

    export let serviceCallId;

    const testStateStore = getTestStateStore(serviceCallId);
    const statusStore = getTestSessionStatusStore(serviceCallId);

    /**
     * Build the hidden heading from the current state
     * @returns {Object|void} the item headings
     */
    function getHeadings() {
        const testMap = testStateStore.getTestMap();
        if (testMap) {
            const testPart = testStateStore.getCurrentTestPart();
            const section = testStateStore.getCurrentSection();
            const item = testStateStore.getCurrentItem();
            if (testPart && section && item) {
                const sections = Object.values(testPart.sections);
                const position = item.position + 1;
                const total = testPart.stats.total;
                const positionInSection = sections.indexOf(section) + 1;
                const totalSections = sections.length;

                return {
                    current: __('Current question %d of %d', position, total),
                    located: __('Located in question group %d of %d.', positionInSection, totalSections),
                    state: item.answered ? __('answered') : __('unanswered')
                };
            }
        }
    }

    $: itemHeadings = $testStateStore ? getHeadings() : {};
</script>

<!--`itemHeadings &&` is a temporary defensive code, should be fixed later why it is undefined in some cases -->
{#if itemHeadings && $statusStore === testSessionStatus.interacting}
    <span>{itemHeadings.current} - {itemHeadings.state}. {itemHeadings.located}</span>
{/if}
