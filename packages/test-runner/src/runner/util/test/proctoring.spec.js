// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import {
    isPausedByProctorExecution,
    updatePausedByProctorExecution,
    isPausedByProctorUiFlow,
    isProctoredSession
} from '../proctoring';
import { deliveryExecutionStatuses } from '../../session/sessionStates.js';

describe('isPausedByProctorExecution', () => {
    it('checks testContext for the paused status', () => {
        const textContext1 = { status: deliveryExecutionStatuses.suspended };
        expect(isPausedByProctorExecution(textContext1)).toBe(true);

        const textContext2 = { status: deliveryExecutionStatuses.interacting };
        expect(isPausedByProctorExecution(textContext2)).toBe(false);
    });
});

describe('updatePausedByProctorExecution', () => {
    it('updates testContext with the paused status', () => {
        const textContext = { status: deliveryExecutionStatuses.suspended };
        const result1 = updatePausedByProctorExecution(textContext, false);
        expect(textContext.status).toBe(deliveryExecutionStatuses.interacting);
        expect(result1).toEqual(textContext);

        updatePausedByProctorExecution(textContext, true);
        expect(textContext.status).toBe(deliveryExecutionStatuses.suspended);

        updatePausedByProctorExecution(textContext, true);
        expect(textContext.status).toBe(deliveryExecutionStatuses.suspended);
    });
});

describe('isPausedByProctorUiFlow', () => {
    it('checks in testRunner is in paused state', () => {
        const testRunner = { getState: vi.fn().mockReturnValueOnce(true) };
        expect(isPausedByProctorUiFlow(testRunner)).toBe(true);
        expect(testRunner.getState).toHaveBeenCalledWith('pause');

        testRunner.getState.mockReturnValueOnce(false);
        expect(isPausedByProctorUiFlow(testRunner)).toBe(false);
    });
});

describe('isProctoredSession', () => {
    it('checks in testContext if proctoring is turned on for this test', () => {
        const textContext1 = { isProctored: true };
        expect(isProctoredSession(textContext1)).toBe(true);

        const textContext2 = { isProctored: false };
        expect(isProctoredSession(textContext2)).toBe(false);
    });
});
