// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import choiceFeedbackFactory from '../choiceFeedbackHelper.js';

describe('choiceFeedbackFactory API', () => {
    it('has expected API', () => {
        expect(typeof choiceFeedbackFactory).toEqual('function');
    });

    it('returns expected types', () => {
        expect(typeof choiceFeedbackFactory()).toEqual('function');
        expect(typeof choiceFeedbackFactory()()).toEqual('object');
    });

    it('returned "setConstraintsFeedback" function returns expected types', () => {
        const setConstraintsFeedback = choiceFeedbackFactory();
        expect(setConstraintsFeedback(0)).toStrictEqual({
            message: '',
            status: 'info'
        });
    });
});

describe('choiceFeedbackFactory: "selectChoices/placeAnswers"', () => {
    it('returns empty when min=0 & max=0', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 0, minChoices: 0 });
        expect(setConstraintsFeedback(1).message).toBe('');

        const setConstraintsFeedback2 = choiceFeedbackFactory({
            type: 'selectChoices',
            maxChoices: -1,
            minChoices: -1
        });
        expect(setConstraintsFeedback2(1).message).toBe('');
    });

    it('returns message when min=1 & max=0', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 0, minChoices: 1 });
        expect(setConstraintsFeedback(1).message).toBe('An answer is required');

        const setConstraintsFeedback2 = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: -1, minChoices: 1 });
        expect(setConstraintsFeedback2(1).message).toBe('An answer is required');
    });

    it('returns message when min>1 & max=0', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 0, minChoices: 2 });
        expect(setConstraintsFeedback(1).message).toBe('You need to select at least 2 choices');

        const setConstraintsFeedback2 = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: -1, minChoices: 2 });
        expect(setConstraintsFeedback2(1).message).toBe('You need to select at least 2 choices');
    });

    it('returns empty when min=0 & max=1', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 1, minChoices: 0 });
        expect(setConstraintsFeedback(1).message).toBe('');

        const setConstraintsFeedback2 = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 1, minChoices: -1 });
        expect(setConstraintsFeedback2(1).message).toBe('');
    });

    it('returns message when min=0 & max>1', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 2, minChoices: 0 });
        expect(setConstraintsFeedback(1).message).toBe('You can select up to 2 choices');

        const setConstraintsFeedback2 = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 2, minChoices: -1 });
        expect(setConstraintsFeedback2(1).message).toBe('You can select up to 2 choices');
    });

    it('returns message when min=1 & max=1', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 1, minChoices: 1 });
        expect(setConstraintsFeedback(1).message).toBe('An answer is required');
    });

    it('returns message when min=max', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 2, minChoices: 2 });
        expect(setConstraintsFeedback(1).message).toBe('You need to select 2 choices');
    });

    it('returns message when min<max', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 3, minChoices: 1 });
        expect(setConstraintsFeedback(1).message).toBe('You need to select from 1 to 3 choices');

        const setConstraintsFeedback2 = choiceFeedbackFactory({ type: 'selectChoices', maxChoices: 3, minChoices: 2 });
        expect(setConstraintsFeedback2(1).message).toBe('You need to select from 2 to 3 choices');
    });

    it('message types: returns messages for "placeAnswers" type', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'placeAnswers', maxChoices: 1, minChoices: 1 });
        expect(setConstraintsFeedback(1).message).toBe('An answer is required');

        const setConstraintsFeedback2 = choiceFeedbackFactory({ type: 'placeAnswers', maxChoices: 4, minChoices: 0 });
        expect(setConstraintsFeedback2(1).message).toBe('You can place up to 4 answers');

        const setConstraintsFeedback3 = choiceFeedbackFactory({ type: 'placeAnswers', maxChoices: 0, minChoices: 4 });
        expect(setConstraintsFeedback3(1).message).toBe('You need to place at least 4 answers');

        const setConstraintsFeedback4 = choiceFeedbackFactory({ type: 'placeAnswers', maxChoices: 4, minChoices: 4 });
        expect(setConstraintsFeedback4(1).message).toBe('You need to place 4 answers');

        const setConstraintsFeedback5 = choiceFeedbackFactory({ type: 'placeAnswers', maxChoices: 4, minChoices: 2 });
        expect(setConstraintsFeedback5(1).message).toBe('You need to place from 2 to 4 answers');
    });

    it('custom messages: returns max when provided', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 2,
            minChoices: 0,
            qtiMaxChoicesMessage: 'Maximum'
        });
        expect(setConstraintsFeedback(1).message).toBe('Maximum');

        const setConstraintsFeedback2 = choiceFeedbackFactory({
            maxChoices: 2,
            minChoices: 1,
            qtiMaxChoicesMessage: 'Maximum'
        });
        expect(setConstraintsFeedback2(1).message).toBe('Maximum');
    });

    it('custom messages: returns min when provided', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 0,
            minChoices: 2,
            qtiMinChoicesMessage: 'Minimum'
        });
        expect(setConstraintsFeedback(1).message).toBe('Minimum');

        const setConstraintsFeedback2 = choiceFeedbackFactory({
            maxChoices: 2,
            minChoices: 1,
            qtiMinChoicesMessage: 'Minimum'
        });
        expect(setConstraintsFeedback2(1).message).toBe('Minimum');
    });

    it('custom messages: returns min & max when both provided', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 2,
            minChoices: 1,
            qtiMinChoicesMessage: 'Minimum',
            qtiMaxChoicesMessage: 'Maximum'
        });
        expect(setConstraintsFeedback(1).message).toBe('Minimum Maximum');
    });

    it('custom messages: returns empty if no constraints', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 0,
            minChoices: 0,
            qtiMinChoicesMessage: 'Minimum',
            qtiMaxChoicesMessage: 'Maximum'
        });
        expect(setConstraintsFeedback(1).message).toBe('');
    });

    it('status: returns override status if set', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ maxChoices: 4, minChoices: 2 });
        expect(setConstraintsFeedback(3, false, 'override-status').status).toBe('override-status');

        const setConstraintsFeedback2 = choiceFeedbackFactory({ maxChoices: 4, minChoices: 2 });
        expect(setConstraintsFeedback2(10, false, 'override-status').status).toBe('override-status');
    });

    it('status: returns "info" if valid', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ maxChoices: 4, minChoices: 2 });
        expect(setConstraintsFeedback(3, true).status).toBe('info');
    });

    it('status: returns "warning" if invalid and changing status is allowed', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ maxChoices: 4, minChoices: 2 });
        expect(setConstraintsFeedback(10, true).status).toBe('warning');
    });

    it('status: returns "info" if invalid and changing status is not allowed', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ maxChoices: 4, minChoices: 2 });
        expect(setConstraintsFeedback(10, false).status).toBe('info');
    });
});

describe('choiceFeedbackFactory: "choices/associations"', () => {
    it('returns empty message when no constraints set', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({ type: 'choices' });

        expect(setConstraintsFeedback(0)).toStrictEqual({
            message: '',
            status: 'info'
        });
    });

    it('generates messages in max > min mode', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 2,
            minChoices: 1
        });

        expect(setConstraintsFeedback(0)).toStrictEqual({
            message: 'You must pick at least 1 choice and a maximum of 2',
            status: 'info'
        });
        expect(setConstraintsFeedback(0, true)).toStrictEqual({
            message: 'You must pick at least 1 choice and a maximum of 2',
            status: 'warning'
        });
        expect(setConstraintsFeedback(1)).toStrictEqual({
            message: 'You must pick at least 1 choice and a maximum of 2 - Currently 1',
            status: 'info'
        });
        expect(setConstraintsFeedback(1, true)).toStrictEqual({
            message: 'You must pick at least 1 choice and a maximum of 2 - Currently 1',
            status: 'info'
        });
        expect(setConstraintsFeedback(2)).toStrictEqual({
            message: 'You must pick at least 1 choice and a maximum of 2 - Currently 2',
            status: 'info'
        });
        expect(setConstraintsFeedback(2, true)).toStrictEqual({
            message: 'You must pick at least 1 choice and a maximum of 2 - Currently 2',
            status: 'info'
        });
        expect(setConstraintsFeedback(3)).toStrictEqual({
            message: 'You must pick at least 1 choice and a maximum of 2 - Currently 3',
            status: 'info'
        });
        expect(setConstraintsFeedback(3, true)).toStrictEqual({
            message: 'You must pick at least 1 choice and a maximum of 2 - Currently 3',
            status: 'warning'
        });
    });

    it('generates messages in max only mode', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 2
        });

        expect(setConstraintsFeedback(2)).toStrictEqual({
            message: 'You must pick a maximum of 2 choices - Currently 2',
            status: 'info'
        });
        expect(setConstraintsFeedback(3, true)).toStrictEqual({
            message: 'You must pick a maximum of 2 choices - Currently 3',
            status: 'warning'
        });
        expect(setConstraintsFeedback(3)).toStrictEqual({
            message: 'You must pick a maximum of 2 choices - Currently 3',
            status: 'info'
        });
    });

    it('generates messages in max only mode with singular wording', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 1,
            minChoices: -1
        });

        expect(setConstraintsFeedback(0)).toStrictEqual({
            message: 'You must pick a maximum of 1 choice',
            status: 'info'
        });
    });

    it('generates messages in min only mode', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: -1,
            minChoices: 2
        });

        expect(setConstraintsFeedback(1)).toStrictEqual({
            message: 'You must pick at least 2 choices - Currently 1',
            status: 'info'
        });
        expect(setConstraintsFeedback(0, true)).toStrictEqual({
            message: 'You must pick at least 2 choices',
            status: 'warning'
        });
        expect(setConstraintsFeedback(0)).toStrictEqual({
            message: 'You must pick at least 2 choices',
            status: 'info'
        });
    });

    it('generates messages in min only mode with singular wording', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: -1,
            minChoices: 1
        });

        expect(setConstraintsFeedback(0)).toStrictEqual({
            message: 'You must pick at least 1 choice',
            status: 'info'
        });
    });

    it('generates messages in min == max mode', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 2,
            minChoices: 2
        });

        expect(setConstraintsFeedback(0, true)).toStrictEqual({
            message: 'You must pick exactly 2 choices',
            status: 'warning'
        });
        expect(setConstraintsFeedback(1, true)).toStrictEqual({
            message: 'You must pick exactly 2 choices - Currently 1',
            status: 'warning'
        });
    });

    it('generates messages in min == max mode with singular wording', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            type: 'associations',
            maxChoices: 1,
            minChoices: 1
        });

        expect(setConstraintsFeedback(0)).toStrictEqual({
            message: 'You must make exactly 1 association',
            status: 'info'
        });
    });

    it('generates messages with the non-default wording', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            type: 'associations',
            maxChoices: 2,
            minChoices: 2
        });

        expect(setConstraintsFeedback(0)).toStrictEqual({
            message: 'You must make exactly 2 associations',
            status: 'info'
        });
        expect(setConstraintsFeedback(1)).toStrictEqual({
            message: 'You must make exactly 2 associations - Currently 1',
            status: 'info'
        });
    });

    it('displays the custom max message when provided', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 2,
            minChoices: -1,
            qtiMaxChoicesMessage: 'Max - 2'
        });

        expect(setConstraintsFeedback(2)).toStrictEqual({
            message: 'Max - 2',
            status: 'info'
        });
    });

    it('displays the custom min message when provided', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: -1,
            minChoices: 1,
            qtiMinChoicesMessage: 'Min - 1'
        });

        expect(setConstraintsFeedback(1)).toStrictEqual({
            message: 'Min - 1',
            status: 'info'
        });
    });

    it('displays the custom min & max messages when both provided', () => {
        const setConstraintsFeedback = choiceFeedbackFactory({
            maxChoices: 2,
            minChoices: 1,
            qtiMinChoicesMessage: 'Min - 1',
            qtiMaxChoicesMessage: 'Max - 2'
        });

        expect(setConstraintsFeedback(1)).toStrictEqual({
            message: 'Min - 1 Max - 2',
            status: 'info'
        });
    });
});
