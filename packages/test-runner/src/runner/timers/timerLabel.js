// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';

/**
 * Visually, extra time is related to the first timer that will reach (or have reached) timeout
 * If several timers have same timeLeft, choose the one with the lowest level.
 * NB! This is 'visual' applicalbility only.
 *     Because 'extra' is in fact applied to everything (it kind of rewinds all timers back, because it stops all tiemrs once it is being used),
 *     but visually we show it only in once place with the smallest timer
 * @param {Object} testContext
 * @param {Object} timersStore
 * @returns {String[]}
 */
export function getExtraTimeApplicableLevels(testContext, timersStore) {
    const extraTimer = timersStore.getTimerFor('extra');
    if (extraTimer) {
        const timersForContextExceptExtra = timersStore.getTimersForContext(testContext, false);
        const minTimeLeft = Math.min(...timersForContextExceptExtra.map(a => a.timerValue.timeLeft));
        const sortedByTime = timersForContextExceptExtra
            .filter(a => a.timerValue.timeLeft === minTimeLeft)
            .map(a => a.level);
        if (sortedByTime.length) {
            return [sortedByTime[sortedByTime.length - 1]];
        }
    }
    return [];
}

/**
 * Visual timer label to use on breadcrumb or header notification
 * @param {Object} timer
 * @param {Object?} extraTimerIfApplicable
 * @returns {Object} {label: string?, ariaLabel: string? }
 */
export function getTimerLabel(timer, extraTimerIfApplicable) {
    if (timer) {
        let timerLabel = timer.timerValue.timeLeft <= 0 ? '' : timer.timerValue.timeStr;
        let timerAriaLabel = timer.timerValue.timeLeft <= 0 ? '' : timer.timerValue.readableTimeStr;
        if (extraTimerIfApplicable && extraTimerIfApplicable.timerValue.timeLeft > 0) {
            timerLabel = `${timerLabel} (+ ${extraTimerIfApplicable.timerValue.timeStr})`.trim();
            timerAriaLabel = __(
                '%s, extra time %s',
                timer.timerValue.readableTimeStr,
                extraTimerIfApplicable.timerValue.readableTimeStr
            ).trim();
        }

        return {
            label: timerLabel,
            ariaLabel: timerAriaLabel
        };
    }
    return {};
}

/**
 * Visual timer label to use on breadcrumb or header notification
 * @param {String} level - test|testPart|section|item
 * @param {Object} testContext
 * @param {Object} timersStore
 * @returns {Object} {label: string?, ariaLabel: string? }
 */
export function getTimerLabelForLevel(level, testContext, timersStore) {
    const timerDatas = timersStore.getTimersForContext(testContext);
    const extraTimeLevels = getExtraTimeApplicableLevels(testContext, timersStore);
    return getTimerLabel(
        timerDatas.find(i => i.level === level),
        extraTimeLevels.includes(level) ? timerDatas.find(i => i.level === 'extra') : null
    );
}
