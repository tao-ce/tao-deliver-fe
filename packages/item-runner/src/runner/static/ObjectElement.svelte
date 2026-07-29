<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { getContext } from 'svelte';
    import Audio from './Audio.svelte';
    import Video from './Video.svelte';
    import { htmlAttributes } from './util/attributes.js';
    import { withUnit } from '../util/size.js';
    import DocumentViewer from '@oat-sa-private/ui-components/documentViewer/DocumentViewer.svelte';

    export let itemIdentifier;
    export let attributes = {};

    const itemContext = getContext(itemIdentifier);
    const assetManager = itemContext && itemContext.getAssetManager();

    //if the object type is audio or video we remap it to the Audio or Video component for a better control
    const objectType = attributes.type ? attributes.type.replace(/\/.*$/, '') : 'application';
    let mediaAttributes = {};
    let data;

    if (['audio', 'video'].includes(objectType)) {
        mediaAttributes = Object.assign(
            {
                src: attributes.data
            },
            attributes
        );
    } else {
        //resolve the URL only if we use the object tag
        data = assetManager ? assetManager.resolve(attributes.data) : attributes.data;
    }
</script>

{#if objectType === 'audio'}
    <Audio {itemIdentifier} attributes={mediaAttributes} />
{:else if objectType === 'video'}
    <Video {itemIdentifier} attributes={mediaAttributes} />
{:else if attributes.type && attributes.type === 'application/pdf'}
    <DocumentViewer
        src={data}
        title={attributes.title}
        width={withUnit(attributes.width) || '440px'}
        height={withUnit(attributes.height) || '560px'}
        options={{ workerSrc: assetManager.resolve('pdf.worker.min.js') }}
        on:error={e => itemContext.getLogger().error(e.detail)}
        {...htmlAttributes(attributes, ['class', 'role'])}>
        <slot />
    </DocumentViewer>
{:else}
    <object
        {data}
        type={attributes.type}
        title={attributes.title}
        width={withUnit(attributes.width)}
        height={withUnit(attributes.height)}
        {...htmlAttributes(attributes)}>
        <slot />
    </object>
{/if}
