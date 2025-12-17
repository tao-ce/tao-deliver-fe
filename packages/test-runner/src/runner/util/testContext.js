// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { itemSessionStates } from '../session/sessionStates.js';

/**
 * Find out if late submission is allowed for the specified timer
 * @param {Object} testContext
 * @param {Object} timer
 * @returns {Boolean}
 */
export function getAllowLateSubmission(testContext, timer) {
    if (testContext.timeConstraints && typeof testContext.timeConstraints === 'object') {
        const array = Array.isArray(testContext.timeConstraints)
            ? testContext.timeConstraints
            : Object.values(testContext.timeConstraints);
        const timeConstraint = array.find(constr => {
            if (constr.qtiClassName === 'assessmentTest' && timer.level === 'test') {
                return true;
            }
            if (
                (constr.qtiClassName === 'testPart' && timer.level === 'testPart') ||
                (constr.qtiClassName === 'assessmentSection' && timer.level === 'section') ||
                (constr.qtiClassName === 'assessmentItemRef' && timer.level === 'item')
            ) {
                return constr.source === timer.id;
            }
            return false;
        });
        if (timeConstraint) {
            return timeConstraint.allowLateSubmission;
        }
    }
    return false;
}

/**
 * If item is in a 'modalFeedback' state
 * @param {*} testContext
 * @returns {Boolean}
 */
export function isItemModalFeedbackState(testContext) {
    return testContext.itemSessionState === itemSessionStates.modalFeedback;
}

/**
 * If item is an attempts-item, and has remaining attempts
 * (remainingAttempts is defined as -1 for regular items, > 0 initially for attempts items)
 * @param {*} testContext
 * @returns {Boolean}
 */
export function isSkippableAttemptsItem(testContext) {
    return testContext.remainingAttempts >= 0 &&
        testContext.state !== itemSessionStates.closed &&
        testContext.allowSkipping !== false;
}
