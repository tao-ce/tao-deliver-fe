<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2021-2024 (original work) Open Assessment Technologies SA ;
    import { __ } from '@oat-sa-private/ui-core';
    import Prompt from '../../interactions/Prompt.svelte';
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { formatInputValue } from '../../interactions/util/responseType.js';
    import { getLocale } from '../../util/locale.js';
    import { getRowsValue, getAdditionalSpacing } from '../../interactions/util/rows.js';
    import { convertPatternMask } from '../../interactions/util/pattern.js';
    import { tryParseMaxlength, tryParseMaxWords } from '../../util/patternMask.js';

    import { tick, getContext, onMount, afterUpdate } from 'svelte';
    import PlagiarismReport from '../util/plagiarism/PlagiarismReport.svelte';
    import { normalizeReports } from '../util/plagiarism/plagiarism.js';
    import { getRichEditorCount, getPlainEditorCount } from '../../util/wordcounter.js';

    const charactersPerLine = 72;

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    // Response format:
    export let baseType = 'string';

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let classes = '';
    export let expectedLength;
    export let expectedLines;
    export let dir;
    export let base = 10;

    export let prompt;
    export let format;
    const formats = Object.freeze({
        plain: 'plain',
        preformatted: 'preformatted',
        xhtml: 'xhtml'
    });

    // data attributes
    export let dataAttrs = {};
    const resizable = dataAttrs['data-resizable'] !== 'false';
    const hasMathEntry = dataAttrs['data-math-entry'] && dataAttrs['data-math-entry'] !== 'false';
    const hasWordCount = dataAttrs['data-word-count'] && dataAttrs['data-word-count'] !== 'false';
    const hasCharCount = dataAttrs['data-character-count'] && dataAttrs['data-character-count'] !== 'false';

    const expectedResponseLength = expectedLength || expectedLines * charactersPerLine || null;

    //patternMask & maxlength validation &  max words validation
    export let patternMask;
    let maxlength;
    let maxWordsLimit;
    if (patternMask) {
        patternMask = convertPatternMask(patternMask);
        maxlength = tryParseMaxlength(patternMask);
        if (maxlength) {
            patternMask = null;
        } else {
            const maxWordsParseResult = tryParseMaxWords(patternMask);
            if (maxWordsParseResult) {
                maxWordsLimit = maxWordsParseResult.max;
                patternMask = null;
            }
        }
    }
    const rows = getRowsValue(expectedLength, expectedLines, maxlength, maxWordsLimit, classes);

    let textContainer;
    let rootRef;

    let responsiveHeight = false;

    let additionalSpace = 0;

    let count = { words: 0, chars: 0 };

    // stores
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);

    // subscribe to store value
    let value = '';
    interactionStateStore.subscribe(() => {
        const response = interactionStateStore.getResponseValue();
        if (response) {
            value = loadResponse();
        }
    });

    // wait a tick for insert value into the container
    $: if (hasMathEntry && value && textContainer) {
        tick().then(() => renderMath());
    }

    /**
     * Loads response from store and returns with it
     * @returns {string} Response in the store
     */
    function loadResponse() {
        const response = interactionStateStore.getResponseValue();
        const { count: countState } = interactionStateStore.get(); // last value submitted in overall state
        count = countState;

        const storedValue = formatInputValue(response, baseType, base, getLocale());

        return storedValue.toString();
    }

    /**
     * Render math in the provider container
     */
    function renderMath() {
        import('@oat-sa-private/ui-elements/richTextEditor/plugins/mathbox/mathlive.js').then(
            ({ default: mathlive }) => {
                textContainer.querySelectorAll('.math-entry').forEach(entry => {
                    // Mathlive delimiters $$ $$
                    entry.innerHTML = `$$${entry.innerHTML}$$`;
                    mathlive.renderMathInElement(entry);
                });
            }
        );
    }

    const itemContext = getContext(itemIdentifier);
    const isReviewAnswerMode = itemContext && itemContext.getReviewSessionSubstate() === 'answer';
    const writingMode = itemContext && itemContext.getWritingMode();
    const isVerticalWritingMode = writingMode === 'vertical-rl';

    const { plagiarismReports } = (itemContext && itemContext.getExtraData()) || {};
    const plagiarismReportList = normalizeReports(responseIdentifier, plagiarismReports);

    /**
     * Updates values needed for control height calculation
     */
    function updateTextContainerHeight() {
        if (!rows) {
            responsiveHeight = true;
            additionalSpace = getAdditionalSpacing(rootRef, !!prompt, isVerticalWritingMode);
        }
    }

    $: feedbacks = [
        // the following 2 are mutually exclusive: tao-constrain-maxWords and data-word-count shouldn't be enabled together
        {
            message: __('<strong>%d</strong> / %d word(s) typed', count?.words || 0, maxWordsLimit),
            visible: maxWordsLimit
        },
        {
            message: __('<strong>%d</strong> word(s) typed', count?.words || 0),
            visible: hasWordCount && !maxWordsLimit
        },
        {
            message: __('<strong>%d</strong> character(s) typed', (count && count.chars) || 0),
            visible: hasCharCount && !maxlength && !expectedResponseLength
        },
        {
            /* eslint-disable indent */
            message: `${__('<strong>%d</strong> character(s) typed', (count && count.chars) || 0)} (${__(
                'recommended: %d',
                expectedResponseLength
            )}).`,
            /*  eslint-enable indent */
            visible: expectedResponseLength && !maxlength
        },
        {
            message: __('<strong>%d</strong> / %d character(s) typed', (count && count.chars) || 0, maxlength),
            visible: maxlength
        }
    ];

    onMount(() => {
        updateTextContainerHeight();
    });

    afterUpdate(() => {
        // Use feedback if any of count is missing from the state
        const countStateExists = !(count && typeof count.words === 'number' && typeof count.chars === 'number');

        // Fallback word/character counting. To be deleted after state restore impplementation will be done
        if (countStateExists) {
            const counterFn = format === formats.xhtml ? getRichEditorCount : getPlainEditorCount;
            count = counterFn(textContainer.textContent);
        }
    });
</script>

<style>
    @define-mixin qti-line-height $line-count, $line-height {
        /* $line-height should be a multiplier */
        block-size: calc($line-count * $line-height * var(--fontsize-body) + 2 * var(--space-1x5));
    }
    .feedbacks {
        margin-block: var(--space-2x) 0;
        margin-inline: 0;
        padding: 0;
        list-style: none;

        &:empty {
            margin: 0; /* take no space if vertical-writing */
        }
    }
    .feedback {
        color: var(--color-text-feedback);
        line-height: var(--space-3x);
    }
    .bullet {
        display: inline-block;
        text-align: center;
        min-inline-size: 2rem;
        margin-inline-end: var(--space-1x);
    }

    .text-container {
        --text-container-line-height: var(--line-height-default);
        @mixin qti-line-height var(--rows), var(--text-container-line-height);
        padding-block: var(--space-1x5);
        padding-inline: var(--space-2x);
        border: var(--border-thin) solid var(--color-border-default);
        font-family: var(--font-ui);
        font-size: var(--fontsize-body);
        overflow: auto;
        white-space: pre-wrap;

        &.resizable {
            resize: both;
        }

        &.responsive-height {
            --base-control-height: min(var(--item-container-inner-block-size), 150rem);
            block-size: calc(var(--base-control-height) - var(--additionalSpace));
        }

        /**************************************
         Content styles
        **************************************/
        & :global(img) {
            max-width: 100%;
            vertical-align: baseline;
            height: auto;
        }
        & :global(.image img) {
            display: inline;
        }
        & :global(.image.image_resized img) {
            width: 100%;
        }
        & :global(.image-style-align-left) {
            margin-block: 0 1em;
            margin-inline: 0 1em;
        }
        & :global(.image-style-align-right) {
            margin-block: 0 1em;
            margin-inline: 1em 0;
        }
        & :global(table) {
            & :global(td),
            & :global(th) {
                border: 0.125rem solid hsl(0, 0%, 75%);
            }
        }
    }

    :global(.writing-mode-vertical-rl) {
        & .text-container {
            --text-container-line-height: var(--line-height-default-ruby);
            line-height: var(--text-container-line-height);
        }
    }
</style>

<svelte:window on:resize={updateTextContainerHeight} />

<div
    bind:this={rootRef}
    class="qti-interaction qti-reviewInteraction qti-blockInteraction qti-extendedTextInteraction {classes}"
    style={`--rows: ${rows}; --additionalSpace: ${additionalSpace};`}
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}
    {#if isReviewAnswerMode}
        {#each plagiarismReportList as report}
            <PlagiarismReport {report} />
        {/each}
    {/if}
    <div class="text-container" class:resizable class:responsive-height={responsiveHeight} bind:this={textContainer}>
        {#if format === formats.xhtml}
            {@html value}
        {:else}{value}{/if}
    </div>
    <ul class="feedbacks" lang={language} aria-live="polite">
        {#each feedbacks as feedback}
            {#if feedback.visible}
                <li class="feedback">
                    <span class="bullet" aria-hidden="true">•</span>
                    <span>{@html feedback.message}</span>
                </li>
            {/if}
        {/each}
    </ul>
</div>
