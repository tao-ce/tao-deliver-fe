<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-2023 (original work) Open Assessment Technologies SA ;

    // Components
    import Prompt from '../Prompt.svelte';
    import { Button } from '@oat-sa-private/ui-elements';
    import LoggingPlayer from './LoggingPlayer.svelte';

    // Store and data
    import { getInteractionStateStore } from '../../itemsStateStore.js';
    import { getItemSessionStatusStore } from '../../itemsSessionStatusStore.js';
    import { getContext, onMount, onDestroy } from 'svelte';
    import { __, getLanguageDirection, checkCanAudioAutostart } from '@oat-sa-private/ui-core';
    import { getItemSequentialInteractionsStore } from '../../itemsSequentialInteractionsStore.js';

    // Utils
    import { hasClass } from '../util/attributes.js';
    import { withUnit } from '../../util/size.js';
    import { wrapWithLogger } from '../util/analytics';
    import { throttle } from 'lodash';
    import { fade } from 'svelte/transition';
    import { DeferredPromise } from '../util/promise.js';
    import { findRowIfContainsOnly } from '../util/dom.js';

    // Constants
    import itemSessionStatus from '../../itemSessionStatus.js';

    const qtiClass = 'qti-mediaInteraction';

    // keys for state store:
    export let itemIdentifier;
    export let responseIdentifier;

    // interaction-level QTI attributes:
    export let autostart;
    export let loop;
    export let minPlays = 0;
    export let maxPlays = 0;

    // mapped attributes from object.attributes
    export let width;
    export let data;
    export let type;
    const isAudio = type?.startsWith('audio');

    // inherited aria attributes:
    export let role;
    export let ariaAttrs = {};

    // inherited item-level QTI attributes:
    export let language;
    export let id;
    export let classes = '';
    export let dir;

    // data attributes
    export let dataAttrs = {};

    export let prompt;
    export let disabled = false;

    export let seekLogDebounceInterval = 500;

    // Response format:
    const cardinality = 'single';
    const baseType = 'integer';

    // class based behaviors
    const allowPause = hasClass(classes, 'pause');
    const hidePlayer = isAudio && hasClass(classes, 'hide-player');
    const isSequential = autostart && hasClass(classes, 'sequential');
    const isLinear = hasClass(classes, 'tao-media-mode-linear') || maxPlays > 0 || minPlays > 0 || hidePlayer;
    const autostartDelayMs = (autostart && hidePlayer && parseInt(dataAttrs['data-autostart-delay-ms'], 10)) || 0;
    const sequenceRepeats = (isSequential && parseInt(dataAttrs['data-sequence-repeats'], 10)) || 1;
    const sequenceDelayBetweenMs = (isSequential && parseInt(dataAttrs['data-sequence-delay-between-ms'], 10)) || 300;
    const sequenceDelayAfterMs = (isSequential && parseInt(dataAttrs['data-sequence-delay-after-ms'], 10)) || 0;
    const recoverableStatuses = dataAttrs['data-recoverable-statuses'] || [];

    // the number of times media was completely played
    let value = 0;

    const containerHidePlayerClass = 'media-interaction-row-hideplayer';
    const minPlaysFeedback = minPlays ? __('You must play this media at least %d times', minPlays) : '';
    let maxPlaysFeedback = '';
    // did user interact with video player
    let isInteracted = false;
    // current time of media
    let currentTime = 0;
    let isDestroyed = false;

    // store
    const interactionStateStore = getInteractionStateStore(itemIdentifier, responseIdentifier);
    const itemSessionStatusStore = getItemSessionStatusStore(itemIdentifier);

    let interactionElement;
    const getInteractionElement = () => interactionElement;
    const itemContext = getContext(itemIdentifier);
    const instructionsLang = itemContext && itemContext.getInstructionsLang();
    const instructionsDir = instructionsLang ? getLanguageDirection(instructionsLang) : void 0;
    const assetManager = itemContext && itemContext.getAssetManager();
    const throttledStoreResponse = throttle(storeResponseUntilDestroyed, 400);

    // has a time value > 0 just been restored? If so, displayed player playcount will be 1 more than value
    let restoredProgress = false;

    // restore initial state
    const initialInteractionState = interactionStateStore.get();
    const { time: previousTime, playsUsed: previousPlaysUsed } = initialInteractionState;

    if (previousTime) {
        currentTime = previousTime;
        restoredProgress = true;
    }
    if (previousPlaysUsed) {
        value = Math.max(value || 0, previousPlaysUsed);
    }

    if (!interactionStateStore.hasResponse()) {
        // do initial response definition
        interactionStateStore.merge({ qtiClass });
        storeResponse();
    }

    const didMountDeferred = new DeferredPromise();
    let delayTimeout;

    // represents browser autoplay policy
    let canAudioAutostart = true;
    let requireClickToStart = false;

    // flag which should become > 0 when media can autostart (either immediately or respecting the authored delay);
    // increment to re-trigger autostart again (playerConfig will be recalculated, and Player remounted)
    let autostartTrigger = 0;

    // sequential logic follows
    const sequentialInteractionsStore = getItemSequentialInteractionsStore(itemIdentifier);

    /** @type {import('svelte/store').Writable<string>} */
    let currentResponseIdentifier;

    // Register mediaInteraction into sequence
    if (isSequential) {
        currentResponseIdentifier = sequentialInteractionsStore.currentResponseIdentifier;
    }

    $: isCurrentInSequence = isSequential && $currentResponseIdentifier === responseIdentifier;

    function handleIsCurrentInSequenceChanged() {
        if (isCurrentInSequence) {
            // perform checks needed to skip or play interaction
            if (isAwaitingDelayAfter()) {
                //restart delay-after, if it was interrupted
                waitForDelay(sequenceDelayAfterMs).then(() => {
                    sequentialInteractionsStore.didStart = true; //for 'x-tao-sequence-ended-nav-next' check
                    sequentialInteractionsStore.finish(responseIdentifier);
                });
            } else if (maxPlays && value >= maxPlays) {
                // immedately advance sequence
                sequentialInteractionsStore.finish(responseIdentifier);
            } else {
                // check browser's current autoplay policy status
                updateCanAudioAutostart().then(() => {
                    // if sequence was completed before, or last playback was interrupted mid-play, or delay between repeats was interrupted,
                    // - can now be restarted only by button
                    const isASequenceRestart =
                        sequentialInteractionsStore.completedTimes > 0 && !sequentialInteractionsStore.didStart;
                    const isDelayBetweenRepeats = shouldRepeat() && currentTime === 0;
                    if (canAudioAutostart && !isASequenceRestart && !isDelayBetweenRepeats && currentTime === 0) {
                        waitForDelay(autostartDelayMs)
                            .then(() => didMountDeferred.promise)
                            .then(() => {
                                autostartTrigger++;
                            });
                    } else if (hidePlayer) {
                        requireClickToStart = true;
                    }
                });
            }
        }
    }

    // runs after each sequential start()/finish() call
    $: handleIsCurrentInSequenceChanged(isCurrentInSequence);

    $: $interactionStateStore && loadResponse();

    $: disabledBySession =
        $itemSessionStatusStore === itemSessionStatus.suspended || $itemSessionStatusStore === itemSessionStatus.closed;

    $: src = assetManager ? assetManager.resolve(data) : data;

    $: disabledByMaxPlays = getDisabledByMaxPlays(value);
    $: maxPlaysFeedback = disabledByMaxPlays ? __('You have played this media maximum times') : '';

    // when the playerConfig is recalculated it will cause an intended re-mount of the Player
    $: playerConfig = getPlayerConfig(autostartTrigger);

    //remove padding from grid-row if player is hidden
    $: findRowIfContainsOnly(interactionElement)?.classList.toggle(
        containerHidePlayerClass,
        hidePlayer && !requireClickToStart
    );

    /**
     * Gets the up-to-date playerConfig
     * @returns {Object} playerConfig - prop of Player component
     */
    function getPlayerConfig() {
        return {
            autostart: autostart && autostartTrigger > 0,
            loop,
            maxPlays,
            isLinear,
            allowPause: allowPause,
            allowFullscreen: true,
            src,
            type,
            startTime: currentTime,
            width: withUnit(width),
            tracks: [],
            controlsOverride: hidePlayer ? [] : void 0
        };
    }

    /**
     * @returns {boolean}
     */
    function getDisabledByMaxPlays() {
        return maxPlays && value >= maxPlays;
    }

    /**
     * @returns {boolean}
     */
    function shouldRepeat() {
        //repeats=2: 1st run: after 1st play: val=1 --> val%rep=1; after 2nd play: val=2 --> val%rep=0
        //           2nd run: after 1st play: val=3 --> val%rep=1; after 2nd play: val=4 --> val%rep=0
        return sequenceRepeats > 1 && value % sequenceRepeats > 0;
    }

    /**
     * @returns {boolean}
     */
    function isAwaitingDelayAfter() {
        //repeats=2: 1st run: after 1st play: val=1 --> 0; after 2nd play: val=2 --> 1
        //           2nd run: after 1st play: val=3 --> 1; after 2nd play: val=4 --> 2
        const allRepeatsCompletedTimes = Math.trunc(value / sequenceRepeats);
        return (
            sequenceDelayAfterMs > 0 &&
            //finished playing media, or didn't start yet
            currentTime === 0 &&
            //all repeats for current sequence run were played, or none were played yet
            value % sequenceRepeats === 0 &&
            //is it 'after playing ended in the current sequence run' or 'before playing started in the next sequence run'?
            sequentialInteractionsStore.completedTimes < allRepeatsCompletedTimes
        );
    }

    /**
     * @returns {Promise<void>}
     */
    function updateCanAudioAutostart() {
        return checkCanAudioAutostart().then(result => {
            canAudioAutostart = result;
        });
    }

    /**
     * Set response to the store
     */
    function storeResponse() {
        interactionStateStore.update({
            time: currentTime,
            playsUsed: value
        });
        interactionStateStore.setResponseValue(
            {
                cardinality,
                baseType,
                value: isInteracted || value !== 0 ? value : null
            },
            value >= minPlays
        );
    }

    /**
     * Loads response from store and set value
     */
    function loadResponse() {
        const storedValue = interactionStateStore.getResponseValue(); // last value submitted as response
        const { playsUsed: storedPlaysUsed } = interactionStateStore.get(); // last value submitted in overall state

        isInteracted = typeof storedValue === 'number';
        value = Math.max(storedValue || 0, storedPlaysUsed || 0); // use the larger of the 2 known values
    }

    /**
     * Same as `storeResponse`, but to use with delayed calling
     * (won't run after component is destroyed)
     */
    function storeResponseUntilDestroyed() {
        if (!isDestroyed) {
            storeResponse();
        }
    }

    const handleInteractButton = wrapWithLogger({
        getInteractionElement,
        handler() {
            updateCanAudioAutostart().then(() => {
                if (canAudioAutostart) {
                    requireClickToStart = false;
                    autostartTrigger++;
                }
            });
        },
        interactionStateStore
    });

    const handleStart = () => {
        isInteracted = true;
        storeResponse();
        if (isSequential) {
            sequentialInteractionsStore.didStart = true;
        }
    };

    const handleFinish = event => {
        event.preventDefault();
        value++;
        restoredProgress = false;
        if (isSequential) {
            // currentTime must be reset manually, so sequential media can autostart again
            if (autostart && !getDisabledByMaxPlays()) {
                currentTime = 0;
            }

            if (shouldRepeat() && !getDisabledByMaxPlays()) {
                //repeat
                waitForDelay(sequenceDelayBetweenMs).then(() => {
                    updateCanAudioAutostart().then(() => {
                        if (canAudioAutostart) {
                            autostartTrigger++; ///autostart play again
                        } else if (hidePlayer) {
                            requireClickToStart = true;
                        }
                    });
                });
            } else if (sequenceDelayAfterMs) {
                //delay-after
                waitForDelay(sequenceDelayAfterMs).then(() => {
                    sequentialInteractionsStore.finish(responseIdentifier);
                });
            } else {
                //advance sequence
                sequentialInteractionsStore.finish(responseIdentifier);
            }
        }
        storeResponse();
    };

    /**
     * Handle player time update
     * @param {CustomEvent} e
     * @param {number} e.detail current time of the player
     */
    function handleTimeUpdate(e) {
        // avoid issue with unwanted timeupdates of 0 after changing props or restoring progress
        if (e.detail === 0 && (isSequential || restoredProgress)) {
            return;
        }
        currentTime = e.detail;
        throttledStoreResponse();
    }

    /**
     * @param {Number} delay
     * @returns {Promise}
     */
    function waitForDelay(delay) {
        clearTimeout(delayTimeout);
        return new Promise(r => {
            delayTimeout = setTimeout(() => r(), delay);
        });
    }

    onMount(() => {
        updateCanAudioAutostart().then(() => {
            //sequential case will be checked by current-in-sequence handler
            if (!isSequential && autostart && !maxPlaysFeedback) {
                if (canAudioAutostart) {
                    waitForDelay(autostartDelayMs).then(() => {
                        autostartTrigger++;
                    });
                } else if (hidePlayer) {
                    requireClickToStart = true;
                }
            }
        });
        didMountDeferred.resolve();
    });

    onDestroy(() => {
        clearTimeout(delayTimeout);
        interactionElement.closest(containerHidePlayerClass)?.removeClass(containerHidePlayerClass);
        isDestroyed = true;
    });
</script>

<style>
    .feedback {
        padding: var(--space-1x5) var(--space-2x);
        margin-bottom: var(--space-4x);
        text-align: center;
        background: var(--color-bg-info);
        color: var(--color-text-info);

        &.error {
            background-color: var(--color-alert);
            color: var(--color-text-inverted);
        }
    }

    :global([data-layouts~='hideFeedbacksLayout']) {
        & .feedback {
            display: none;
        }
    }

    /* Prevent from showing the instructions and the constraints */
    :global(.qti-item.remove-instructions) .qti-interaction.qti-mediaInteraction .feedback {
        display: none;
    }
    :global(.qti-item.remove-instructions .qti-interaction.qti-mediaInteraction .max-plays) {
        display: none;
    }

    .interact-button-container {
        display: flex;
        justify-content: center;
    }

    /* main hiding is done by controlsOverride=[], but this extra style prevents flash of visible player */
    [data-hide-player='true'] {
        & :global(.player),
        & :global(audio) {
            display: none;
        }
    }

    :global(.media-interaction-row-hideplayer.media-interaction-row-hideplayer.media-interaction-row-hideplayer) {
        padding-block: 0;
        margin-block: 0;
    }

    :global(.qti-prompt .compact-appearance),
    :global(.match-tabular-header-cell .compact-appearance),
    :global(.label-container .compact-appearance),
    :global(.inline-interaction-container .compact-appearance),
    :global(div[id^='tao-choice'] .compact-appearance) {
        display: inline-block;
        vertical-align: bottom;
        max-width: 100%;
    }

    :global(.compact-appearance .plyr.plyr--audio) {
        min-width: 1rem;
    }

    :global(.compact-appearance .plyr.plyr--audio .plyr__controls) {
        height: var(--controls-size);
        width: var(--controls-size);
        border: none;
    }

    :global(.compact-appearance .plyr.plyr--audio .plyr__controls>.plyr__controls__item) {
        border: none;
    }

    :global(.compact-appearance .plyr.plyr--audio .plyr__controls>.plyr__control) {
        display: flex;
        border: var(--border-medium) solid var(--color-border-default);
    }

    :global(.compact-appearance .plyr.plyr--audio .plyr__controls>.plyr__control[data-plyr=play]) {
        display: flex;
    }

    :global(.compact-appearance .plyr.plyr--audio .plyr__progress__container) {
        display: none;
    }

    :global(.compact-appearance .plyr.plyr--audio .plyr__volume) {
        display: none;
    }
</style>

<div
    bind:this={interactionElement}
    class="qti-interaction qti-blockInteraction {qtiClass} {classes}"
    lang={language}
    {id}
    {dir}
    {role}
    {...ariaAttrs}
    {...dataAttrs}>
    {#if prompt}
        <Prompt blockTree={prompt} />
    {/if}

    {#if minPlaysFeedback}
        <div class="feedback" lang={instructionsLang} dir={instructionsDir}>
            {minPlaysFeedback}
        </div>
    {/if}
    {#if maxPlaysFeedback}
        <div
            class="feedback error"
            aria-live="assertive"
            aria-atomic="true"
            role="alert"
            lang={instructionsLang}
            dir={instructionsDir}>
            {maxPlaysFeedback}
        </div>
    {/if}

    {#if requireClickToStart}
        <div class="interact-button-container" in:fade={{ delay: 100, duration: 1 }}>
            <!-- fade delay prevents brief show-hide blink -->
            <Button
                label={__('Click to listen')}
                skin="secondary"
                shape="pill"
                size="small"
                icon="play-16"
                data-test-id="media-interact"
                on:click={handleInteractButton} />
        </div>
    {/if}
    <div class:visually-hidden={hidePlayer}>
        {#key playerConfig}
            <LoggingPlayer
                {...playerConfig}
                disabled={disabled || disabledBySession || disabledByMaxPlays}
                feedbackLang={instructionsLang}
                dir={instructionsDir}
                plays={value + (restoredProgress ? 1 : 0)}
                {recoverableStatuses}
                onStart={handleStart}
                onFinish={handleFinish}
                {seekLogDebounceInterval}
                {getInteractionElement}
                {itemIdentifier}
                {responseIdentifier}
                {autostartDelayMs}
                on:timeupdate={handleTimeUpdate} />
        {/key}
    </div>
</div>
