<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { getContext } from 'svelte';

    export let itemIdentifier;
    export let attributes = {};
    const dataAttrs = attributes.dataAttrs || {};

    let imageElement;
    let resolvedSrc = attributes.src;
    let widthAttr = attributes.width;
    let heightAttr = attributes.height;

    const itemContext = getContext(itemIdentifier);
    const writingMode = itemContext && itemContext.getWritingMode();

    if (writingMode === 'vertical-rl' && attributes.width?.endsWith('%') && !attributes.height) {
        widthAttr = attributes.height;
        heightAttr = attributes.width;
    }

    /**
     * Resolve image source with asset manager and preload it
     * @param {string} source
     */
    function resolveImage(source) {
        if (source && itemContext) {
            const assetManager = itemContext.getAssetManager();
            if (assetManager) {
                resolvedSrc = assetManager.resolve(source);
            }
            itemContext.registerLoadingElement(function imageLoading() {
                //we wait for the image to load
                //if it fails, we consider it loaded (alt will be used)
                return new Promise(resolve => {
                    let loaded = false;
                    const load = () => {
                        if (!loaded) {
                            loaded = true;
                            resolve();
                        }
                    };
                    if (imageElement) {
                        imageElement.addEventListener('load', load);
                        imageElement.addEventListener('error', load);
                        if (!loaded && imageElement.complete && imageElement.naturalWidth !== 0) {
                            load();
                        }
                    }
                });
            });
        }
    }

    $: resolveImage(attributes.src);
</script>

<style>
    /* responsive tables can shrink %-defined images to zero if there is no min-width */
    :global(table) img {
        min-width: 3rem;
    }
</style>

<img
    bind:this={imageElement}
    id={attributes.id}
    class={attributes.class}
    data-serial={dataAttrs['data-serial']}
    src={resolvedSrc}
    alt={attributes.alt}
    width={widthAttr}
    height={heightAttr} />
