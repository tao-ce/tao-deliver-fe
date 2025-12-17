<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2023 (original work) Open Assessment Technologies SA ;
    import { Button } from '@oat-sa-private/ui-elements';
    import { __ } from '@oat-sa-private/ui-core';
    import { createEventDispatcher } from 'svelte';

    export let canDownload;
    export let canConvert;

    const dispatch = createEventDispatcher();

    let fileInput;

    function handleFileInput() {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            dispatch('upload-html', { uploadedHtml: reader.result });
        };
        reader.readAsText(file);
    }
</script>

<style>
    .booklet-toolbar {
        position: fixed;
        top: 0;
        right: 2rem;
        background-color: var(--color-bg-default);
        border: var(--border-medium) solid var(--color-text-default);
        z-index: var(--layer-5);

        & :global(button) {
            padding: 1rem;
        }
    }
</style>

<div class="booklet-toolbar">
    <Button name="booklet-html" label={__('Generate html')} size="small" on:click={() => dispatch('html')} />
    <Button
        name="booklet-download-html"
        label={__('Download html')}
        size="small"
        on:click={() => dispatch('download-html')}
        disabled={!canConvert} />
    <Button
        name="booklet-upload-html"
        label={__('Upload html')}
        size="small"
        on:click={() => {
            fileInput.click();
        }} />
    <input type="file" accept="text/html" class="hidden" bind:this={fileInput} on:change={handleFileInput} />
    <Button
        name="booklet-convert"
        size="small"
        label={__('Convert to file')}
        on:click={() => dispatch('convert')}
        disabled={!canConvert} />
    <Button
        name="booklet-download"
        size="small"
        label={__('Download file')}
        on:click={() => dispatch('download')}
        disabled={!canDownload} />
</div>
