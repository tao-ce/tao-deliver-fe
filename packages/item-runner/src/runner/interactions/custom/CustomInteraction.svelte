<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023-2025 (original work) Open Assessment Technologies SA ;
    import CustomInteractionDefault from './customInteractionTypes/CustomInteractionDefault.svelte';
    import AudioRecordingInteraction from './customInteractionTypes/AudioRecordingInteraction.svelte';
    import TextReaderInteraction from './customInteractionTypes/TextReaderInteraction.svelte';
    import GeogebraInteraction from './customInteractionTypes/GeogebraInteraction.svelte';
    import EntryCodeInteraction from './customInteractionTypes/EntryCodeInteraction.svelte';

    /**
     * This component is a simple switcher which selects a PCI handler component based on typeIdentifier,
     * or falls back to the default component (which can handle all IMS PCIs).
     * @property {String} typeIdentifier
     */
    export let typeIdentifier = 'default';

    const customInteractionTypes = Object.freeze({
        default: CustomInteractionDefault,
        audioRecordingInteraction: AudioRecordingInteraction,
        textReaderInteraction: TextReaderInteraction,
        GGBPCI: GeogebraInteraction,
        entryCodeInteraction: EntryCodeInteraction
    });

    const customInteractionComponent = customInteractionTypes[typeIdentifier] || customInteractionTypes.default;
</script>

<svelte:component this={customInteractionComponent} {...$$props} />
