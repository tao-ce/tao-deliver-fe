<!--
SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.

SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
-->

<script>
    // Licensed under Gnu Public Licence version 2
    // Copyright (c) 2022 (original work) Open Assessment Technologies SA ;
    import { onDestroy } from 'svelte';
    import { testSessionStatus, itemSessionStates } from '../../../session/sessionStates.js';
    import { getTestStateStore, getTestSessionStatusStore } from '../../../testsStateStore.js';
    import { getTimersStore } from '../../../timers/timersStore.js';
    import { __, humanizeTime, getThrottledDurationParts } from '@oat-sa-private/ui-core';

    export let serviceCallId;
    const testStateStore = getTestStateStore(serviceCallId);
    const statusStore = getTestSessionStatusStore(serviceCallId);
    const timersStore = getTimersStore(serviceCallId);

    export let throttleConfig;

    let prevItemId;
    let initialTimeSeconds;
    let initialTimerLevel;
    let announce = true;
    let announcedTimestamp;
    let announcedSeconds;
    let isDestroyed = false;

    /**
     * Get aria-live message with timer's remaining time
     * @returns {String}
     */
    function getMessage() {
        const status = statusStore.get();
        if (status !== testSessionStatus.interacting && status !== testSessionStatus.overlay) {
            return '';
        }
        const testContext = testStateStore.getTestContext();
        if (testContext.remainingAttempts === 0 && testContext.itemSessionState === itemSessionStates.closed) {
            return '';
        }

        const extraTimer = timersStore.getTimerFor('extra');
        const extraTimeMs = extraTimer ? extraTimer.timerValue.timeLeft : 0;
        const timerDatasIncludingTimedOut = timersStore.getTimersForContext(testContext, false).reverse(); //item,section,part,test
        let timerDatas = timerDatasIncludingTimedOut.filter(i => i.timerValue.timeLeft > 0);
        if (timerDatas.length < timerDatasIncludingTimedOut.length && extraTimeMs > 0) {
            timerDatas = [extraTimer];
        }
        if (!timerDatas.length) {
            return '';
        }

        const minTimeLeft = Math.min(...timerDatas.map(a => a.timerValue.timeLeft));
        const smallestTimerData = timerDatas.find(a => a.timerValue.timeLeft === minTimeLeft);
        const currentItemId = testContext.itemIdentifier;
        let seconds;
        //reset whe item is rendered; when extra starts being applied; when extra was increased
        const reset =
            prevItemId !== currentItemId ||
            (smallestTimerData.level === 'extra') !== (initialTimerLevel === 'extra') ||
            (smallestTimerData.level === 'extra' &&
                Math.trunc(smallestTimerData.timerValue.timeLeft / 1000) > initialTimeSeconds);
        if (reset) {
            initialTimerLevel = smallestTimerData.level; //to not announce another timer after one have timed out
            initialTimeSeconds = throttledAnnounceTimeSeconds(smallestTimerData.timerValue.timeLeft, false); //initial=26min30sec; throttled=30min
            seconds = initialTimeSeconds;
            prevItemId = currentItemId;
            announce = true;
            announcedTimestamp = Date.now();
            announcedSeconds = seconds;
            if (initialTimeSeconds === 0) {
                return '';
            }
        } else {
            //for subsequent updates, announce with throttling rules
            //and if one of timers times out, do not start announcing another timer
            const currentTimerData = timerDatas.find(i => i.level === initialTimerLevel);
            if (!currentTimerData) {
                return '';
            }
            const throttledSeconds = throttledAnnounceTimeSeconds(currentTimerData.timerValue.timeLeft, true);
            if (throttledSeconds === 0) {
                return '';
            }
            if (throttledSeconds > initialTimeSeconds) {
                seconds = initialTimeSeconds;
            } else {
                seconds = throttledSeconds;
            }

            //time to announce has changed, so announce it
            if (seconds !== announcedSeconds) {
                announce = true;
                announcedTimestamp = Date.now();
                announcedSeconds = seconds;
            } else {
                //if not,
                //then if some time has passed since previous announcement, render actual time, but do not announce it
                const visualSeconds = throttledVisualTimeSeconds(currentTimerData.timerValue.timeLeft);
                if (Date.now() - announcedTimestamp > 10000 && visualSeconds < seconds) {
                    announce = false;
                    seconds = visualSeconds;
                }
            }
        }

        let result;
        const extraIsRunning = initialTimerLevel === 'extra';
        const extraTimerStr = extraIsRunning
            ? humanizeTime(seconds)
            : humanizeTime(throttledVisualTimeSeconds(extraTimeMs));
        //while normal timer is running, extra doesn't change, so no need to apply throttledAnnounceTimeSeconds rule to it
        //but if normal timer has timed out, then extra is running, and throttledAnnounceTimeSeconds is applied to extra instead
        if (extraIsRunning) {
            result = __('Remaining extra time - %s', extraTimerStr);
        } else {
            const normalTimerLevel = initialTimerLevel;
            const normalTimerStr = humanizeTime(seconds);
            switch (normalTimerLevel) {
                case 'test':
                    result = __('Remaining time for this test - %s', normalTimerStr);
                    break;
                case 'testPart':
                    result = __('Remaining time for this part - %s', normalTimerStr);
                    break;
                case 'section':
                    result = __('Remaining time for this section - %s', normalTimerStr);
                    break;
                default:
                    result = __('Remaining time for this item - %s', normalTimerStr);
                    break;
            }
            if (extraTimeMs) {
                result += __(', remaining extra time - %s', extraTimerStr);
            }
        }

        return result;
    }

    /**
     * Adjust timer's remaining time to make it change less frequenly
     * Announce this time
     * @param {Number} milliseconds
     * @param {Boolean} throttle
     * @returns {Number} seconds
     */
    function throttledAnnounceTimeSeconds(milliseconds, throttle) {
        // T ≥ 30 minutes : Every 10 minutes time is announced
        // 5 minutes < T < 29 minutes :Every 5 minutes time is announced
        // T ≤ 5 minutes : Last minute announced
        const seconds = Math.trunc(milliseconds / 1000);
        const minutes = Math.ceil(seconds / 60);
        let throttledMinutes;
        if (!throttle) {
            if (minutes < 5) {
                return seconds;
            } else {
                throttledMinutes = minutes;
            }
        } else if (minutes >= 30) {
            throttledMinutes = Math.ceil(minutes / 10) * 10;
        } else if (minutes >= 5) {
            throttledMinutes = Math.ceil(minutes / 5) * 5;
        } else if (minutes > 1) {
            throttledMinutes = 5;
        } else if (seconds > 0) {
            throttledMinutes = 1;
        } else {
            throttledMinutes = 0;
        }
        return throttledMinutes * 60;
    }

    /**
     * Adjust time using the same rules as visual UI (TestTitle, ItemHanger)
     * Do not announce, but have it in html so it can be read in browse mode
     * @param {Number} milliseconds
     * @returns {Number} seconds
     */
    function throttledVisualTimeSeconds(milliseconds) {
        const [hours, minutes, seconds] = getThrottledDurationParts(milliseconds, throttleConfig);
        return hours * 60 * 60 + minutes * 60 + seconds;
    }

    // if several alerts should be announced at the same time, JAWS/VoiceOver skips one of them,
    // so if there's a remainingAttempts alert, they will conflict.
    // so at least force timer alert to have higher priority by rendering it a bit later;
    // and also skip timer alert if there are no more attempts left
    // TODO: should probably be fixed by putting all announcements in a single role=alert somewhere
    let message;
    $: if ($timersStore && $testStateStore && $statusStore) {
        setTimeout(() => {
            if (!isDestroyed) {
                message = getMessage();
            }
        }, 200);
    }

    onDestroy(() => {
        isDestroyed = true;
    });
</script>

{#if message}
    {#key message + announce.toString()}
        <div class="timer-aria-live visually-hidden" role={announce ? 'alert' : void 0}>
            {message}
        </div>
    {/key}
{/if}
