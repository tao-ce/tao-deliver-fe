<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2020-23 (original work) Open Assessment Technologies SA ;

    // Components
    import { Player } from '@oat-sa-private/ui-components';

    // Utils
    import { createLastPressedKeyListener, wrapWithLogger } from '../util/analytics.js';
    import { noop } from 'lodash';
    import { get } from '../../util/object.js';
    import { getInteractionStateStore } from '../../itemsStateStore.js';

    // Player props
    // `plays, startTime, disabled` must not be in $$restProps, because Player modifies them internally:
    //  if any other unrelated props inside $$restProps changes, svelte will trigger their reactive callbacks too,
    //  and Player's internal modification will be overwritten
    export let plays;
    export let startTime;
    export let disabled;
    export let autostart;
    export let loop;
    export let maxPlays;
    export let isLinear;
    export let allowFullscreen;
    export let src;
    export let type;
    export let width;
    export let tracks;
    export let controlsOverride;
    export let allowPause = true; //default value of `Player`
    export let dir;
    export let feedbackLang;

    //Logging props
    export let itemIdentifier;
    export let responseIdentifier;
    export let onStart = noop;
    export let onFinish = noop;
    export let autostartDelayMs;
    export let seekLogDebounceInterval = 500;
    export let getInteractionElement;
    export let staticElementId;

    const lastPressedKeyListener = createLastPressedKeyListener();
    const interactionStateStore =
        itemIdentifier && responseIdentifier ? getInteractionStateStore(itemIdentifier, responseIdentifier) : void 0;

    const staticElementDetails = staticElementId && { staticElementId, componentType: 'MediaInABlock' };

    const handleStart = wrapWithLogger({
        getInteractionElement,
        handler: onStart,
        getDetails: event => {
            // const autostart = get(event, 'detail.autostart');
            const isAutostart = get(event, 'detail.autostart');
            const pressedKey = lastPressedKeyListener.lastPressedKey;
            return {
                position: get(event, 'detail.position'),
                ...(pressedKey && { pressedKey }),
                autostart: isAutostart,
                touched: !isAutostart,
                ...(autostartDelayMs && { autostartDelay: autostartDelayMs }),
                ...staticElementDetails
            };
        },
        interactionStateStore,
        eventTypeToDomEventTypeMap: {
            start: 'play'
        }
    });

    const handleFinish = wrapWithLogger({
        getInteractionElement,
        handler: onFinish,
        getDetails: () => ({
            touched: false,
            ...staticElementDetails
        }),
        interactionStateStore,
        eventTypeToDomEventTypeMap: {
            finish: 'ended'
        },
        logDebounceOptions: {
            wait: seekLogDebounceInterval,
            leading: true,
            trailing: false
        }
    });

    let handlePause = noop;
    if (allowPause) {
        handlePause = wrapWithLogger({
            getInteractionElement,
            interactionStateStore,
            getDetails: event => {
                const pressedKey = lastPressedKeyListener.lastPressedKey;
                return {
                    position: get(event, 'detail.position'),
                    ...(pressedKey && { pressedKey }),
                    ...staticElementDetails
                };
            }
        });
    }

    const handleSeeked = wrapWithLogger({
        getInteractionElement,
        interactionStateStore,
        getDetails: event => ({
            endPosition: get(event, 'detail.position'),
            ...staticElementDetails
        }),
        logDebounceOptions: {
            wait: seekLogDebounceInterval,
            trailing: true
        }
    });

    const handleSeeking = wrapWithLogger({
        getInteractionElement,
        interactionStateStore,
        getDetails: event => {
            const pressedKey = lastPressedKeyListener.lastPressedKey;
            return {
                startPosition: get(event, 'detail.position'),
                ...(pressedKey && { pressedKey }),
                ...staticElementDetails
            };
        },
        logDebounceOptions: {
            wait: 500,
            leading: true,
            trailing: false
        }
    });
</script>

<Player
    {...$$restProps}
    {allowPause}
    {plays}
    {startTime}
    {disabled}
    {autostart}
    {loop}
    {maxPlays}
    {isLinear}
    {allowFullscreen}
    {src}
    {type}
    {width}
    {tracks}
    {controlsOverride}
    {dir}
    {feedbackLang}
    on:timeupdate
    on:start={handleStart}
    on:finish={handleFinish}
    on:seeked={handleSeeked}
    on:seeking={handleSeeking}
    on:pause={handlePause}
    on:keydown={lastPressedKeyListener.saveLastPressedKey} />
