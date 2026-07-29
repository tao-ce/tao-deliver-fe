<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2024 (original work) Open Assessment Technologies SA ;
    /* eslint-disable svelte/valid-compile */
    import CustomInteractionDefault from './CustomInteractionDefault.svelte';
    import { getContext } from 'svelte';

    const itemRunnerConfigContext = getContext('itemRunnerConfig') || {};
    const hideTooltips = !!itemRunnerConfigContext.options?.hideTooltips;

    export let properties = {};
</script>

<style>
    :global(.qti-interaction .textReaderInteraction) {
        --textreader-page-bg-color: var(--color-bg-default);
        --textreader-text-color: var(--color-text-default);
        --textreader-border-color: var(--color-gs-light-secondary);
        --textreader-tabs-bg-color: var(--color-gs-light-alternative-bg);
        --textreader-active-tab-color: var(--color-brand);
        --textreader-active-tab-bg-color: var(--color-gs-light);
        --textreader-pages-bg-color: var(--color-gs-light-hover-bg);
        --textreader-shadow-color: var(--color-gs-graphical);
        --textreader-box-shadow-color: var(--color-gs-light-hover-bg);
        --textreader-nav-gradient-start: var(--color-gs-light);
        --textreader-nav-gradient-end: var(--color-gs-light-alternative-bg);
        --textreader-button-color: var(--color-text-actionable);
        --textreader-button-bg-color: var(--color-brand);
        --textreader-button-disabled-color: var(--color-text-disabled);
        --textreader-button-disabled-bg-color: var(--color-gs-light-secondary);
    }

    @media print {
        :global-nested {
            & .textReaderInteraction {
                & .tr-pages {
                    height: auto !important; /* `height is set as inline style */
                    overflow: visible !important;
                    border: none !important;
                    background: none !important;
                }
                & .tr-pages-wrap {
                    border: none !important;
                }
                & .tr-page {
                    display: block !important;
                    box-shadow: none !important;
                    border: none !important;
                    border-bottom: var(--border-thin) solid var(--color-border-default) !important;
                }
                & .tr-page:first-child {
                    border-top: var(--border-thin) solid var(--color-border-default) !important;
                }
                & .tr-passage {
                    height: auto !important; /* height is set as inline style */
                }
                & .tr-tab-buttons,
                & .js-nav-container {
                    display: none !important;
                }
            }
        }
    }
</style>

<CustomInteractionDefault {...$$restProps} properties={{...properties, hideTooltips}} />
