<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
    import CustomInteraction from '../../interactions/custom/CustomInteraction.svelte';

    function prepareClasses(classes = '') {
        let classList = classes.split(' ');

        classList.push('qti-reviewInteraction');

        return classList.join(' ');
    }

    $: props = Object.assign({}, $$props, {
        classes: prepareClasses($$props.classes),
        disabled: true,
        // Up to now, the properties passed below are generic, for any PCI.
        // If adding properties here, consider if they should apply to a particular PCI, or are safe for any.
        properties: Object.assign({}, $$props.properties, {
            isReviewMode: true
        })
    });
</script>

<CustomInteraction {...props} />
