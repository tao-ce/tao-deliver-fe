// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getDeliveries, getBatteries, submitBatteriesAndDeliveries } from './deliverService';
import request from 'core/fetchRequest';
import jwtTokenRegistry from '@oat-sa/tao-core-sdk/src/core/jwt/jwtTokenRegistry';
import config from '../config';

vi.mock('core/fetchRequest');
vi.mock('@oat-sa/tao-core-sdk/src/core/jwt/jwtTokenRegistry');

vi.mock('../config', () => ({
    __esModule: true,
    default: {
        endpoints: {
            deliveries: {
                rootUrl: 'mockRootUrlDeliveries',
                path: '/mockPathDeliveries',
                method: 'GET'
            },
            batteries: {
                rootUrl: 'mockRootUrlBatteries',
                path: '/mockPathBatteries',
                method: 'GET'
            },
            submit: {
                rootUrl: 'mockRootUrlSubmit',
                path: '/mockPathSubmit',
                method: 'POST'
            }
        }
    }
}));

const mockJwtToken = 'mockJwtToken';

beforeEach(() => {
    request.mockClear();
    jwtTokenRegistry.get.mockReturnValue(mockJwtToken);
});

describe('deliverService', () => {
    it('should call correct endpoint when getDeliveries is called', async () => {
        const mockDeliveriesData = 'mockDeliveriesData';
        request.mockResolvedValue(mockDeliveriesData);

        const result = await getDeliveries();

        expect(request).toHaveBeenCalledWith(
            `${config.endpoints.deliveries.rootUrl}${config.endpoints.deliveries.path}`,
            {
                method: config.endpoints.deliveries.method,
                jwtTokenHandler: mockJwtToken
            }
        );
        expect(result).toBe(mockDeliveriesData);
    });

    it('should call correct endpoint when getBatteries is called', async () => {
        const mockBatteriesData = 'mockBatteriesData';
        request.mockResolvedValue(mockBatteriesData);

        const result = await getBatteries();

        expect(request).toHaveBeenCalledWith(
            `${config.endpoints.batteries.rootUrl}${config.endpoints.batteries.path}`,
            {
                method: config.endpoints.batteries.method,
                jwtTokenHandler: mockJwtToken
            }
        );
        expect(result).toBe(mockBatteriesData);
    });

    it('should call correct endpoint with correct data when submitBatteriesAndDeliveries is called', async () => {
        const mockSubmitData = 'mockSubmitData';
        const mockBatteries = ['battery1', 'battery2'];
        const mockDeliveries = ['delivery1', 'delivery2'];
        request.mockResolvedValue(mockSubmitData);

        const result = await submitBatteriesAndDeliveries(mockBatteries, mockDeliveries);

        expect(request).toHaveBeenCalledWith(`${config.endpoints.submit.rootUrl}${config.endpoints.submit.path}`, {
            method: config.endpoints.submit.method,
            body: JSON.stringify({ batteries: mockBatteries, deliveries: mockDeliveries }),
            headers: {
                'Content-Type': 'application/json'
            },
            jwtTokenHandler: mockJwtToken
        });
        expect(result).toBe(mockSubmitData);
    });
});
