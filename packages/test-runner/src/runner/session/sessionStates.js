// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * The possible states of an item session,
 * coming from the test context
 */
export const itemSessionStates = Object.freeze({
    initial: 0,
    interacting: 1, //normal
    modalFeedback: 2,
    suspended: 3, //component is not mounted (disableItem)
    closed: 4, //rendered, but interaction is disabled (no remainingAttempts or is timedOut)
    solution: 5,
    review: 6
});

/**
 * The possible states of the test session,
 * coming from the test context
 */
export const testSessionStates = Object.freeze({
    initial: 0,
    interacting: 1, //normal
    modalFeedback: 2,
    suspended: 3, //not used; if deliveryExecutionStatuses.suspended, then testSessionStates.interacting
    closed: 4 //test was finished (returned e.g. by `move` when no more items)
});

/**
 * The possible statuses of the delivery execution,
 * coming from the test context
 */
export const deliveryExecutionStatuses = Object.freeze({
    initial: 'initial',
    interacting: 'interacting', //normal
    suspended: 'suspended', //if proctor paused, `init` action will return it; all other actions will throw
    closed: 'closed',
    canceled: 'canceled',
    terminated: 'terminated' //all acitons will throw
});

/**
 * The current UI status of the test session (what user sees).
 */
export const testSessionStatus = Object.freeze({
    initial: 'initial',
    loading: 'loading',
    interacting: 'interacting',
    overlay: 'overlay',
    proctorwait: 'proctorwait'
});
