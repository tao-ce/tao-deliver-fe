// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('core/fetchRequest');

import { securityLog } from '../securityLog.js';
import request from 'core/fetchRequest';

describe('securityLog', () => {
    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        request.mockClear();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    it('makes "security-log" action request', async () => {
        const dateNow = new Date('2026-01-01T07:00:00Z');
        vi.setSystemTime(dateNow);
        const jwtTokenHandler = { jwt: 'token-handler' };
        const config = {
            endpoints: {
                actions: {
                    rootUrl: 'http://root',
                    path: '/api/v1/delivery-executions',
                    resource: 'actions',
                    method: 'POST'
                }
            }
        };

        await securityLog({
            reason: 'some-reason',
            details: { foo: 'bar' },
            deliveryExecutionId: 'd x 123',
            jwtTokenHandler,
            config
        });

        expect(request).toHaveBeenCalledWith('http://root/api/v1/delivery-executions/d%20x%20123/actions', {
            jwtTokenHandler,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([
                {
                    channel: 'actions',
                    message: {
                        actions: [
                            {
                                name: 'security-log',
                                id: `security-log_${dateNow.valueOf()}`,
                                timestamp: dateNow.valueOf(),
                                parameters: {
                                    action: 'flag',
                                    reason: 'some-reason',
                                    details: { foo: 'bar' }
                                }
                            }
                        ]
                    }
                }
            ])
        });
    });
});
