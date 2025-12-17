// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { deliveryExecutionStatuses } from '../session/sessionStates.js';

/**
 * isPausedByProctorSession:
 * [postponed if 'transition]      [socket pause]<======================>[socket resume]
 *
 * isPausedByProctorUiFlow:
 * [postponed if transition]      ['ProctorWait' screen + feedback]<===========[user closes feedback]========>[user closes 'ProctorWait' screen]
 */

/**
 * Reflects 'true' paused state, corresponding to events from backend;
 * But in case if postponed event handling during transitions it will also be postponed
 * @param {Object} testContext
 * @returns {Boolean}
 */
export function isPausedByProctorExecution(testContext) {
    return testContext && testContext.status === deliveryExecutionStatuses.suspended;
}

/**
 * Update 'true' paused state, corresponding to events from backend;
 * But in case if postponed event handling during transitions it will also be postponed.
 * @param {Object} testContext
 * @param {Boolean} paused
 * @returns {Object} same updated testContext
 */
export function updatePausedByProctorExecution(testContext, paused) {
    testContext.status = paused ? deliveryExecutionStatuses.suspended : deliveryExecutionStatuses.interacting;
    return testContext;
}

/**
 * Reflects UI paused state: resume event may already be received, but we still show feedback, or still show ProctorWait screen
 * Is updated by testRunner.pause() and testRunner.resume(). Listen to `pause` and `resume` testRunner events to subscribe to its change.
 * Equals `testSessionStatus.proctorwait`.
 * @param {Object} testRunner
 * @returns {Boolean}
 */
export function isPausedByProctorUiFlow(testRunner) {
    return Boolean(testRunner.getState('pause'));
}

/**
 * Is proctoring functionality enabled for this test
 * (= was it launched using proctoring tool)
 * @param {*} testContext
 * @returns {Boolean}
 */
export function isProctoredSession(testContext) {
    return testContext && testContext.isProctored;
}
