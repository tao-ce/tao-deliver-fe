// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { itemSessionStates } from '../../session/sessionStates.js';
import { getAllowLateSubmission, isItemModalFeedbackState, isSkippableAttemptsItem } from '../testContext.js';

describe('getAllowLateSubmission', () => {
    it('is a function', () => {
        expect(typeof getAllowLateSubmission).toBe('function');
    });

    test.each([[true], [false]])(
        'finds a constraint with the same scope as timer and returns its value: %s',
        expected => {
            const constraints = {
                timeConstraints: {
                    1: {
                        qtiClassName: 'assessmentTest',
                        source: 'hello',
                        allowLateSubmission: expected
                    },
                    2: {
                        qtiClassName: 'testPart',
                        source: 'part-3',
                        allowLateSubmission: expected
                    },
                    3: {
                        qtiClassName: 'assessmentSection',
                        source: 'section-3',
                        allowLateSubmission: expected
                    },
                    4: {
                        qtiClassName: 'assessmentItemRef',
                        source: 'item-3',
                        allowLateSubmission: expected
                    }
                }
            };
            expect(getAllowLateSubmission(constraints, { level: 'test' })).toBe(expected);
            expect(getAllowLateSubmission(constraints, { level: 'testPart', id: 'part-3' })).toBe(expected);
            expect(getAllowLateSubmission(constraints, { level: 'section', id: 'section-3' })).toBe(expected);
            expect(getAllowLateSubmission(constraints, { level: 'item', id: 'item-3' })).toBe(expected);

            expect(
                getAllowLateSubmission(
                    {
                        timeConstraints: {
                            1: {
                                qtiClassName: 'assessmentSection',
                                source: 'section-3',
                                allowLateSubmission: expected
                            }
                        }
                    },
                    { level: 'section', id: 'section-3' }
                )
            ).toBe(expected);
        }
    );

    it('returns false if constraints are not in the scope of a timer', () => {
        expect(
            getAllowLateSubmission(
                {
                    timeConstraints: {
                        1: {
                            qtiClassName: 'assessmentSection',
                            source: 'section-3',
                            allowLateSubmission: true
                        }
                    }
                },
                { level: 'section', id: 'section-4' }
            )
        ).toBe(false);

        expect(
            getAllowLateSubmission(
                { timeConstraints: { 2: { qtiClassName: 'assessmentTest', allowLateSubmission: true } } },
                { level: 'section', id: 'section-4' }
            )
        ).toBe(false);
    });

    it('returns false if no constraints specified', () => {
        expect(getAllowLateSubmission({}, { level: 'test' })).toBe(false);
        expect(getAllowLateSubmission({ timeConstraints: {} }, { level: 'test' })).toBe(false);
        expect(getAllowLateSubmission({ timeConstraints: [] }, { level: 'test' })).toBe(false);
    });

    it('returns value if constraints are in array format', () => {
        const testContext = {
            timeConstraints: [
                {
                    qtiClassName: 'assessmentSection',
                    source: 'section-3',
                    allowLateSubmission: true
                }
            ]
        };
        expect(getAllowLateSubmission(testContext, { level: 'section', id: 'section-3' })).toBe(true);
        expect(getAllowLateSubmission(testContext, { level: 'section', id: 'section-4' })).toBe(false);
    });
});

describe('isItemModalFeedbackState', () => {
    it('returns true if item session state is modalFeedback', () => {
        expect(typeof isItemModalFeedbackState).toBe('function');

        expect(isItemModalFeedbackState({ itemSessionState: itemSessionStates.modalFeedback })).toBe(true);

        expect(isItemModalFeedbackState({ itemSessionState: itemSessionStates.interacting })).toBe(false);
        expect(isItemModalFeedbackState({ itemSessionState: itemSessionStates.closed })).toBe(false);
        expect(isItemModalFeedbackState({})).toBe(false);
    });
});

describe('isSkippableAttemptsItem', () => {
    it('returns true if has attempts and skippable', () => {
        const testContext = {
            remainingAttempts: 0,
            state: 'interacting',
            allowSkipping: true
        };

        expect(isSkippableAttemptsItem(testContext)).toBe(true);
    });

    test.each([
        {},
        { remainingAttempts: -1 },
        { remainingAttempts: -1, state: 'closed' },
        { remainingAttempts: -1, state: 'closed', allowSkipping: false }
    ])('returns false: %s', testContext => {
        expect(isSkippableAttemptsItem(testContext)).toBe(false);
    });
});
