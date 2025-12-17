// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { securityLog } from '../securityLog';

describe('securityLog', () => {
    let mockTestRunner;

    beforeEach(() => {
        // Reset our mockTestRunner before each test
        mockTestRunner = {
            getProxy: vi.fn().mockReturnValue({
                callTestAction: vi.fn()
            })
        };
    });

    it('should call security-log action with correct parameters', () => {
        const reason = 'test-reason';

        securityLog(mockTestRunner, reason);

        expect(mockTestRunner.getProxy().callTestAction).toHaveBeenCalledWith('security-log', {
            action: 'flag',
            reason: reason
        });
    });
});
