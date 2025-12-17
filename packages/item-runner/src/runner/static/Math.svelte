<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020 (original work) Open Assessment Technologies SA ;
    import { getContext } from 'svelte';

    /**
     * The following component renders mathML input into svg output.
     * Assistive mathML format is also enabled to provide parsable format for screen readers.
     * @property {string} itemIdentifier
     * @property {Object} attributes
     * @property {string} attributes.mathML
     * @property {string} attributes.display
     */
    export let itemIdentifier;
    export let attributes = {};
    const dataAttrs = attributes.dataAttrs || {};

    /**
     * Load the mathjax library
     * @returns {Promise<MathJax>} resolve with the MathJax instance
     */
    function loadMathJax() {
        return import('./math/mathjax.js').then(({ getMathJax }) => getMathJax());
    }

    const waitForMathJax = loadMathJax();

    const itemContext = getContext(itemIdentifier);
    if (itemContext) {
        itemContext.registerLoadingElement(waitForMathJax);
    }
</script>

<style>
    span {
        position: relative;
    }
    .block {
        display: block;
        font-size: calc(var(--fontsize-body) * 1.25);
    }

    /* for TextHelp readAloud provider:
    * invisible for user, but TextHelp should think it's visible text;
    * readAloud plugin will insert `<span class="tts-math-placeholder">` before `<mjx-container>`
    */
    :global(.tts-math-placeholder) {
        position: absolute;
        width: 100%;
        height: 100%;
        opacity: 0;
        pointer-events: none;
        overflow: hidden;
    }
</style>

{#await waitForMathJax}
    <span />
{:then MathJax}
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <span class:block={attributes.display === 'block'} data-serial={dataAttrs['data-serial']} tabindex="0">
        {@html MathJax.mathml2svg(`<math>${attributes.mathML}</math>`).outerHTML}
    </span>
{/await}
