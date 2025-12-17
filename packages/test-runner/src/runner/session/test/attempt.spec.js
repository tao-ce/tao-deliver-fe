// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('@oat-sa-private/tao-item-runner-qtinui/src/runner/util/item.js');
vi.mock('../../util/testMap.js');

import {
    isItemAnswered,
    isItemValid,
    isItemPartiallyAnswered,
    isItemWithoutInteractions,
    isItemResponseTooLong
} from '@oat-sa-private/tao-item-runner-qtinui/src/runner/util/item.js';
import {
    checkItemSubmission,
    updateItemAttempt,
    reduceStateToResponses,
    isResponseChanged,
    excludeMediaInteractions,
    createSkipSubmissionItemState
} from '../attempt.js';

describe('checkItemSubmission', () => {
    const itemState = {};
    const itemResponses = {};

    function mockExternalReturnValues(answered, valid, withoutInteractions, tooLong) {
        isItemAnswered.mockImplementation(() => answered);
        isItemValid.mockImplementation(() => valid);
        isItemWithoutInteractions.mockImplementation(() => withoutInteractions);
        isItemResponseTooLong.mockImplementation(() => tooLong);
    }

    it('is a function', () => {
        expect(typeof checkItemSubmission).toBe('function');
    });

    it('returns correct object format', () => {
        mockExternalReturnValues(true, true, false);
        const result = checkItemSubmission();
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('canSkip');
        expect(result).toHaveProperty('canSubmit');
    });

    test.each([
        [[true, true, false], true],
        [[true, false, false], true],
        [[false, true, false], true],
        [[false, false, false], false],
        [[false, false, true], true]
    ])('returns correct value for canSkip', ([allowSkipping, answered, withoutInteractions], canSkip) => {
        mockExternalReturnValues(answered, true, withoutInteractions);
        const result = checkItemSubmission(itemState, itemResponses, allowSkipping, false, 0);
        expect(result.canSkip).toBe(canSkip);
    });

    test.each([
        [[true, true, false], true],
        [[true, false, false], false],
        [[false, true, false], true],
        [[false, false, true], false]
    ])('returns correct value for canSubmit', ([validateResponses, valid, tooLong], canSubmit) => {
        mockExternalReturnValues(true, valid, false, tooLong);
        const result = checkItemSubmission(itemState, itemResponses, true, validateResponses);
        expect(result.canSubmit).toBe(canSubmit);
    });

    it('returns defaults when submissionMode: simultaneous', () => {
        const submissionMode = 1; // simultaneous
        const result = checkItemSubmission(itemState, itemResponses, true, true, submissionMode);
        expect(result.canSkip).toBe(true);
        expect(result.canSubmit).toBe(true);
    });
});

describe('updateItemAttempt', () => {
    it('sets viewed', () => {
        expect(updateItemAttempt({})).toMatchObject({
            viewed: true
        });
    });

    it('sets answered by default', () => {
        expect(updateItemAttempt({})).toMatchObject({
            answered: true
        });
    });

    it('sets answered for linear test part', () => {
        expect(updateItemAttempt({}, {}, true)).toMatchObject({
            answered: true
        });
    });

    it('keeps answered if countAttempt is false', () => {
        expect(updateItemAttempt({ answered: false }, {}, false, false)).toMatchObject({
            answered: false
        });
    });

    test.each([[true], [false]])('sets answered based on itemAnswered for not linear test part', answered => {
        isItemAnswered.mockReturnValueOnce(answered);
        expect(updateItemAttempt({}, {}, false)).toMatchObject({
            answered
        });
    });

    it('sets numAttempt to 1 by default', () => {
        expect(updateItemAttempt({})).toMatchObject({
            numAttempts: 1
        });
    });

    it('keeps numAttempt if countAttempt false', () => {
        expect(updateItemAttempt({ numAttempts: 3 }, {}, true, false)).toMatchObject({
            numAttempts: 3
        });
    });

    it('increases numAttempt by 1 if countAttempt is false', () => {
        expect(updateItemAttempt({ numAttempts: 3 }, {}, true, true)).toMatchObject({
            numAttempts: 4
        });
    });

    it('sets remainingAttempts to -1 by default', () => {
        expect(updateItemAttempt({})).toMatchObject({
            remainingAttempts: -1
        });
    });

    it('decreases remainingAttempts by 1 if countAttempt', () => {
        expect(
            updateItemAttempt(
                {
                    remainingAttempts: 3
                },
                {},
                true,
                true
            )
        ).toMatchObject({
            remainingAttempts: 2
        });
    });

    it('keeps remainingAttempts if countAttempt is false', () => {
        expect(
            updateItemAttempt(
                {
                    remainingAttempts: 3
                },
                {},
                true,
                false
            )
        ).toMatchObject({
            remainingAttempts: 3
        });
    });
});

describe('reduceStateToResponses', () => {
    it('is a function', () => {
        expect(typeof reduceStateToResponses).toBe('function');
    });

    it('handles falsy or empty inputs correctly', () => {
        expect(reduceStateToResponses(null)).toBe(null);
        expect(reduceStateToResponses(void 0)).toStrictEqual({});
        expect(reduceStateToResponses({})).toStrictEqual({});
    });

    it('reduces complex state object', () => {
        const itemState = {
            RESPONSE: { response: { list: { identifier: [] } }, validity: true, time: 57 },
            RESPONSE_1: { response: { base: null }, validity: false, playsUsed: 3 },
            RESPONSE_2: { response: { base: { float: 1.5 } }, validity: true, qux: 'fnx' },
            element_3: { status: 'ok' },
            foo: 'please discard me'
        };
        const result = reduceStateToResponses(itemState);

        expect(result).toStrictEqual({
            RESPONSE: { response: { list: { identifier: [] } }, validity: true },
            RESPONSE_1: { response: { base: null }, validity: false },
            RESPONSE_2: { response: { base: { float: 1.5 } }, validity: true }
        });
    });
});

describe('isResponseChanged', () => {
    afterEach(() => {
        isItemPartiallyAnswered.mockClear();
    });

    it('is a function', () => {
        expect(typeof isResponseChanged).toBe('function');
    });

    it('returns false if both responses are empty ones', () => {
        isItemPartiallyAnswered.mockReturnValueOnce(false).mockReturnValueOnce(false);

        expect(isResponseChanged({}, { country: { base: { string: '' } } })).toEqual(false);
    });

    it('returns true if one response is empty and another not', () => {
        isItemPartiallyAnswered.mockReturnValueOnce(true).mockReturnValueOnce(false);
        expect(isResponseChanged({}, {})).toEqual(false);
    });

    it('returns false if state objects are equal', () => {
        isItemPartiallyAnswered.mockReturnValue(true);
        expect(isResponseChanged(null, null)).toEqual(false);
        expect(isResponseChanged({}, {})).toEqual(false);
        expect(
            isResponseChanged(
                {
                    keyA: { keyInner: 'val' },
                    keyB: 5
                },
                {
                    keyB: 5,
                    keyA: { keyInner: 'val' }
                }
            )
        ).toEqual(false);
    });

    it('returns true if state objects are not equal', () => {
        isItemPartiallyAnswered.mockReturnValue(true);
        expect(isResponseChanged(null, void 0)).toEqual(true);
        expect(isResponseChanged({}, null)).toEqual(true);
        expect(
            isResponseChanged(
                {
                    RESPONSE: {
                        response: { base: { string: 'foo' } },
                        validity: true
                    },
                    other: 5
                },
                {
                    RESPONSE: {
                        response: { base: { string: 'bar' } },
                        validity: true
                    },
                    other: 5
                }
            )
        ).toEqual(true);
    });
});

describe('excludeMediaInteractions', () => {
    it('handles falsy or empty inputs correctly', () => {
        expect(excludeMediaInteractions(null)).toBe(null);
        expect(excludeMediaInteractions(void 0)).toStrictEqual({});
        expect(excludeMediaInteractions({})).toStrictEqual({});
    });

    it('excludes a mediaInteraction', () => {
        const mediaItemState = {
            RESPONSE_1: {
                response: { base: { integer: 1 } },
                validity: true,
                playsUsed: 1
            },
            RESPONSE_2: {
                response: { base: { string: 'bar' } },
                validity: true
            },
            other: 5
        };
        const expectedItemState = {
            RESPONSE_2: {
                response: { base: { string: 'bar' } },
                validity: true
            },
            other: 5
        };
        expect(excludeMediaInteractions(mediaItemState)).toStrictEqual(expectedItemState);
    });
});

describe('createSkipSubmissionItemState', () => {
    it('handles falsy or empty inputs correctly', () => {
        expect(createSkipSubmissionItemState(null)).toStrictEqual({});
        expect(createSkipSubmissionItemState(void 0)).toStrictEqual({});
        expect(createSkipSubmissionItemState({})).toStrictEqual({});
    });

    it('resets simple item state properties', () => {
        const itemStateBefore = {
            foo: 'bar'
        };
        const itemStateAfter = {
            foo: 'baz'
        };
        expect(createSkipSubmissionItemState(itemStateBefore, itemStateAfter)).toStrictEqual(itemStateBefore);
    });

    it('resets state of non-media interactions', () => {
        const pairsOld = [['Ea']]; // preserve
        const pairsNew = [['Ea', 'Mo']];
        const choiceKeys = ['Ea', 'Mo'];
        const identifiersOld = ['x'];
        const identifiersNew = ['x', 'y', 'z'];
        const selectedOld = [{ key: 'x' }, null, null]; // preserve
        const selectedNew = [{ key: 'x' }, { key: 'y' }, { key: 'z' }];

        const itemStateBefore = {
            RESPONSE_assoc: {
                response: { list: { pair: pairsOld } },
                validity: true,
                pairs: pairsOld,
                choiceKeys
            },
            RESPONSE_order: {
                response: { list: { identifier: identifiersOld } },
                validity: false,
                selected: selectedOld
            }
        };
        const itemStateAfter = {
            RESPONSE_assoc: {
                response: { list: { pair: pairsNew } },
                validity: true,
                pairs: pairsNew,
                choiceKeys
            },
            RESPONSE_order: {
                response: { list: { identifier: identifiersNew } },
                validity: false,
                selected: selectedNew
            }
        };
        expect(createSkipSubmissionItemState(itemStateBefore, itemStateAfter)).toStrictEqual(itemStateBefore);
    });

    it('preserves latest mediaInteraction state', () => {
        const itemStateBefore = {
            RESPONSE_media: {
                response: { base: { integer: 2 } },
                validity: true,
                time: 42,
                playsUsed: 2
            }
        };
        const itemStateAfter = {
            RESPONSE_media: {
                response: { base: { integer: 3 } },
                validity: true,
                time: 57,
                playsUsed: 3
            }
        };
        expect(createSkipSubmissionItemState(itemStateBefore, itemStateAfter)).toStrictEqual(itemStateAfter);
    });

    it('preserves latest static audio state', () => {
        const itemStateBefore = {
            static_audio_123: {
                time: 42
            }
        };
        const itemStateAfter = {
            static_audio_123: {
                time: 57
            }
        };
        expect(createSkipSubmissionItemState(itemStateBefore, itemStateAfter)).toStrictEqual(itemStateAfter);
    });

    it('preserves latest static video state', () => {
        const itemStateBefore = {
            static_video_456: {
                time: 42
            }
        };
        const itemStateAfter = {
            static_video_456: {
                time: 57
            }
        };
        expect(createSkipSubmissionItemState(itemStateBefore, itemStateAfter)).toStrictEqual(itemStateAfter);
    });

    it('preserves true-"touched" value', () => {
        const itemStateBefore = {
            static_video_456: {
                time: 42
            },
            touched: true
        };
        const itemStateAfter = {
            static_video_456: {
                time: 57
            },
            touched: true
        };
        expect(createSkipSubmissionItemState(itemStateBefore, itemStateAfter)).toStrictEqual(itemStateAfter);
    });

    it('preserves falsy "touched" value', () => {
        const itemStateBefore = {
            static_video_456: {
                time: 42
            },
            touched: false
        };
        const itemStateAfter = {
            static_video_456: {
                time: 57
            },
            touched: false
        };
        expect(createSkipSubmissionItemState(itemStateBefore, itemStateAfter)).toStrictEqual(itemStateAfter);
    });
});
