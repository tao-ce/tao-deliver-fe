<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021 (original work) Open Assessment Technologies SA ;
    import GraphicGapMatchInteraction from '../../../interactions/graphic/graphicGapMatch/GraphicGapMatchInteraction.svelte';

    function prepareClasses(classes = '') {
        let classList = classes.split(' ');

        // add review mode indicator class
        classList.push('qti-reviewInteraction');

        return classList.join(' ');
    }

    $: props = Object.assign({}, $$props, {
        classes: prepareClasses($$props.classes),
        disabled: true
    });

</script>

<GraphicGapMatchInteraction {...props}  />
