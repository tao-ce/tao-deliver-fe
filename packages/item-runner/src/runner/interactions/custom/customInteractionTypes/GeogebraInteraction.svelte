<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    import { onMount, onDestroy } from 'svelte';
    import CustomInteractionDefault from './CustomInteractionDefault.svelte';
    import { wait } from '../../../util/async.js';
    import TimeoutError from 'core/error/TimeoutError';

    let isDestroyed = false;
    const loadTimeout = 2 * 60 * 1000; //2min

    const afterPciInstantiated = pciInstance =>
        Promise.race([
            (async () => {
                const shouldHaveApplet = pciInstance.config?.resp?.data; //"Save GGB-file (B64)" option enabled
                if (shouldHaveApplet) {
                    // wait for PCI to load all its resources.
                    // after all loaded, "pciInstance.previewApplet" is set (geogebrapci/interaction/runtime/js/instancer.js -> appletOnLoad);
                    // wait for it, because in "getResponse", PCI gets its state from "pciInstance.previewApplet"
                    while (!pciInstance.previewApplet) {
                        await wait(200);
                        if (isDestroyed) {
                            return;
                        }
                    }
                    // after that, wait a bit more, because PCI is not ready yet: 'appletOnLoad' is fired for the second time after ~150ms;
                    // state which 'pciInstance.previewApplet' gives until then is wrong.
                    wait(500);
                }
            })(),
            wait(loadTimeout).then(() => {
                throw new TimeoutError('GeoGebra PCI load timeout', loadTimeout);
            })
        ]);

    onMount(() => {
        const itemEl = document.querySelector('.qti-item');
        if (itemEl) {
            itemEl.dataset.geogebraItem = true;
        }
    });

    onDestroy(() => {
        isDestroyed = true;
    });
</script>

<style>
    /* Geogebra PCI adds `.qti-item .qti-customInteraction { height: 100% !important}` style,
      which causes height issues in Item and Test Previewer, in layouts like this:
        <grid-row>
            <col-12>
                <colrow>Geogebra PCI</colrow>
                <colrow>some other content</colrow>
            </col-12>
        </gird-row>
     */
    :global(.previewer-test-ui-component [data-geogebra-item='true'] .qti-customInteraction),
    :global(.previewer-item-ui-component [data-geogebra-item='true'] .qti-customInteraction) {
        height: unset !important;
    }
</style>

<CustomInteractionDefault {...$$props} {afterPciInstantiated} />
