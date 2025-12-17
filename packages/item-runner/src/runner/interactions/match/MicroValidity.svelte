<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    import { __, getLanguageDirection } from '@oat-sa-private/ui-core';

    /**
     * Inline component for displaying MatchSet constraints
     * on row and column headers of a Match Interaction
     *
     * @property {number} matchMin - minimum constraint
     * @property {number} matchMax - maximum constraint
     * @property {number} usageCount - the number being validated against constraints
     * @property {boolean} showMin - for disabling min display
     * @property {boolean} showMax - for disabling max display
     * @property {string} lang - for disabling max display
     */
    export let matchMin = 0;
    export let matchMax = 0;
    export let usageCount = 0;
    export let showMin = true;
    export let showMax = true;
    export let lang;

    showMin = showMin && matchMin > 0;
    showMax = showMax && matchMax > 0;

    $: underUsed = matchMin > 0 && usageCount < matchMin;
    $: overUsed = matchMax > 0 && usageCount > matchMax;
    $: dir = lang ? getLanguageDirection(lang) : void 0;
</script>

<style>
    .constraints {
        & span {
            font-size: var(--fontsize-body-xs);
            font-weight: normal;
            color: var(--color-text-feedback);

            &.invalid {
                color: var(--color-alert);
            }
        }
    }

    :global([data-layouts~='hideFeedbacksLayout']) {
        & .constraints {
            display: none;
        }
    }
</style>

<div class="constraints" {lang} {dir}>
    {#if showMax || showMin}
        <span class="visually-hidden">{__('constraints:')}</span>
    {/if}
    {#if showMin}
        <span class:invalid={underUsed}>
            {__('min %d', matchMin)}
        </span>
    {/if}
    {#if showMax}
        <span class:invalid={overUsed}>
            {__('max %d', matchMax)}
        </span>
    {/if}
</div>
