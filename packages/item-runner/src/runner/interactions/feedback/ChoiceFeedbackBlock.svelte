<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2024 (original work) Open Assessment Technologies SA ;

    import { Feedback } from '@oat-sa-private/ui-elements';
    import choiceFeedbackFactory from './choiceFeedbackHelper.js';
    import { getLanguageDirection } from '@oat-sa-private/ui-core';

    export let selectedNumber; // number of currently selected choices
    export let isInteractionFocused; // true when key focus moved to interaction
    export let type; // 'choices' or 'associations' or 'selectChoices' or 'placeAnswers'
    export let maxChoices;
    export let minChoices;
    export let qtiMaxChoicesMessage = null;
    export let qtiMinChoicesMessage = null;
    export let interactionElement; // bind to interaction element
    export let lang;
    export let immediateValidationWarning = false;
    export let taoConstrainMaxChoices = false;

    // instantiate feedback helper
    const setConstraintsFeedback = choiceFeedbackFactory({
        type,
        maxChoices,
        minChoices,
        qtiMaxChoicesMessage,
        qtiMinChoicesMessage
    });

    /**
     * "true" allow changing feedback status. It is possible in two cases:
     * 1 - key focus moved out of interaction
     * 2 - on selecting choice
     * TODO: 3 - when returning to an invalid interacted item
     */
    let updateFeedbackStatus = false;
    let timeoutId;
    const immediateValidationWarningDuration = 2000;

    $: if (isInteractionFocused && (selectedNumber || selectedNumber === 0)) {
        updateFeedbackStatus = true;
    }

    $: ({ message, status } = setConstraintsFeedback(selectedNumber, updateFeedbackStatus));

    $: dir = lang ? getLanguageDirection(lang) : void 0;

    $: {
        if (taoConstrainMaxChoices && immediateValidationWarning) {
            updateFeedbackStatus = true;
            // For HotTextInteraction conditions are not generating warning message
            // Feedback area should blink red though, so doing it manually
            status = 'warning';
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                immediateValidationWarning = false;
                timeoutId = null;
                status = 'info';
            }, immediateValidationWarningDuration);
        }

        if (!immediateValidationWarning && timeoutId) clearTimeout(timeoutId);
    }

    /**
     * Trigger updating feedback status in case of moving focus out of interaction by switching tab or window
     */
    function handleBlurring() {
        if (isInteractionFocused) {
            updateFeedbackStatus = true;
        }
    }

    /**
     * Trigger updating feedback status in case of moving focus out of interaction by pressing tab
     * @param {Event} e
     */
    function handleFocusIn(e) {
        const closestInteractionParentElement = e.target.closest('.qti-interaction');
        // check that we out of interaction
        if (isInteractionFocused && !updateFeedbackStatus && !closestInteractionParentElement) {
            updateFeedbackStatus = true;

            // check that focus moved to another interaction
        } else if (
            isInteractionFocused &&
            !updateFeedbackStatus &&
            !interactionElement.isSameNode(closestInteractionParentElement)
        ) {
            updateFeedbackStatus = true;
        }
    }
</script>

<style>
    .qti-instruction-container {
        margin-block-end: var(--space-3x);

        & :global(.feedback) {
            margin-inline: auto;
            margin-block: 0;
        }
    }

    :global([data-layouts~='hideFeedbacksLayout']) {
        & .qti-instruction-container :global(.feedback) {
            display: none;
        }
    }
</style>

<svelte:window on:focusin={handleFocusIn} on:blur={handleBlurring} />

<div class="qti-instruction-container" {lang} {dir}>
    {#if message}
        <Feedback content={message} {status} fullwidth />
    {/if}
</div>
