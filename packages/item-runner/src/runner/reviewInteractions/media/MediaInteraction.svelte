<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2023 (original work) Open Assessment Technologies SA ;
    import MediaInteraction from '../../interactions/media/MediaInteraction.svelte';

    function prepareClasses(classes = '') {
        let classList = classes.split(' ');

        // filter out linear restriction
        classList = classList.filter(item => item !== 'tao-media-mode-linear');

        // add review mode indicator class
        classList.push('qti-reviewInteraction');

        // make sure allow pause class is added
        if (!classList.includes('pause')) {
            classList.push('pause');
        }

        // make sure controls show
        classList = classList.filter(item => item !== 'hide-player');

        return classList.join(' ');
    }

    $: props = Object.assign({}, $$props, {
        classes: prepareClasses($$props.classes),
        autostart: false,
        loop: false,
        minPlays: 0,
        maxPlays: 0
    });
</script>

<MediaInteraction {...props} />
