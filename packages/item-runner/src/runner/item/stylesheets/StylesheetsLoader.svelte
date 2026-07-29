<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2025 (original work) Open Assessment Technologies SA ;
    import { createEventDispatcher, onMount } from 'svelte';
    import { scopeStyles, convertPxToRem } from './stylesheets.js';
    import { applyStyleEditorTheme } from './styleEditorTheme.js';

    const dispatch = createEventDispatcher();

    /**
     * StylesheetsLoader - non-visual component which renders temporary <link> and permanent <style/> tags.
     *
     * The downloaded stylesheets are not applied until after they are processed and reach the <style/> tag,
     * thanks to <link media="none"> attribute (which works by convention, not by specification).
     * @see https://stackoverflow.com/a/40314216
     *
     * @fires 'complete' - after all stylesheets handled
     */
    /**
     * @typedef {Object} StylesheetMeta
     * @property {String} href
     * @property {String} state
     * @property {String} scope
     * @property {CSSRuleList} cssRules
     */
    /**
     * @property {StylesheetMeta[]} stylesheets
     */
    export let stylesheets = [];

    export let itemScopeSelector = '.qti-item';

    /**
     * @typedef {Object} ConvertPxToRemOptions
     * @property {Boolean?} enabled - convert or not
     * @property {String[]?} cssProperties - `[font-size]`, for example. If undefined, all css properties will be converted
     */
    /**
     * To support a11y plugin's page-zoom, convert 'px' values to 'rem'
     * @type {ConvertPxToRemOptions}
     */
    export let convertPxToRemOptions;

    const stylesheetStates = Object.freeze({
        init: 'init',
        loaded: 'loaded',
        error: 'error'
    });

    for (const sheet of stylesheets) {
        sheet.state = stylesheetStates.init;
    }

    let completedCount = 0;

    let stylesContainerElt;

    /**
     * Scope stylesheet rules, and inject into a <style> tag
     * TODO: in future, receive the parameters for 'scopeStyles()' from itemRunnerConfig
     * @param {StylesheetMeta} stylesheet
     */
    function injectScopedStyleTag(stylesheet) {
        /**
         * @type {CSSRuleList}
         * @see https://developer.mozilla.org/en-US/docs/Web/API/CSSRuleList
         */
        let { cssRules } = stylesheet || {};

        const newCssRules = applyStyleEditorTheme(cssRules);
        if (newCssRules) {
            cssRules = newCssRules;
        }

        const scopeSelector = stylesheet.scope || itemScopeSelector;

        if (convertPxToRemOptions && convertPxToRemOptions.enabled) {
            convertPxToRem(cssRules, convertPxToRemOptions.cssProperties);
        }

        // prefix rules
        const toReplace = ['body div.qti-item', '.qti-item']; // support legacy editor styles and modern editor styles (order matters too!)
        const scopedCssRules = scopeStyles(cssRules, scopeSelector, toReplace);

        // prepare & inject new style tag
        const styleTag = document.createElement('style');
        styleTag.innerHTML = scopedCssRules;
        styleTag.dataset.scoped = true;
        if (stylesheet.href) {
            styleTag.dataset.stylesheetHref = stylesheet.href;
        }
        stylesContainerElt.appendChild(styleTag);

        // update state in sheets, to clean up <head> template
        stylesheet.state = stylesheetStates.loaded;
        stylesheets = stylesheets;
        completedCount++;
    }

    /**
     * Process a loaded stylesheet resource into scoped CSS and inject into a <style> tag.
     * @param {Event} e
     * @param {StylesheetMeta} stylesheet
     */
    function handleStylesheetLoad(e, stylesheet) {
        // get cssRules from owner link tag, referenced in load event
        const path = e && e.composedPath && e.composedPath();
        const linkTag = path[0];
        stylesheet.cssRules = linkTag?.sheet?.cssRules;

        injectScopedStyleTag(stylesheet);
    }

    /**
     * Mark a stylesheet as errored
     * @param {Event} e
     * @param {StylesheetMeta} stylesheet
     */
    function handleStylesheetError(e, stylesheet) {
        stylesheet.state = stylesheetStates.error;
        stylesheets = stylesheets;
        completedCount++;
    }

    // announce when all resources settled
    $: if (completedCount === stylesheets.length) {
        dispatch('complete');
    }

    onMount(() => {
        // process non-href stylesheets without using <link> part of template
        stylesheets
            .filter(ss => !ss.href)
            .forEach(ss => {
                injectScopedStyleTag(ss);
            });
    });
</script>

<svelte:head>
    {#each [...stylesheets] as ss}
        {#if ss.href && ss.state === stylesheetStates.init}
            <link
                crossorigin="anonymous"
                rel="stylesheet"
                media="none"
                href={ss.href}
                on:load={e => handleStylesheetLoad(e, ss)}
                on:error={e => handleStylesheetError(e, ss)} />
        {/if}
    {/each}
</svelte:head>

<div class="styles-container" bind:this={stylesContainerElt}></div>
