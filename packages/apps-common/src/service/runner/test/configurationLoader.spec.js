// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

import configurationLoader from '../configurationLoader.js';
import ApiError from 'core/error/ApiError';

describe('configurationLoader', () => {
    const deliveryExecutionId = 'abc123';
    const defaultConfiguration = {
        locale: 'en-US',
        endpoints: {
            actions: { path: '/actions' },
            initItems: { path: '/init-items' },
            attachmentsUploadData: { path: '/attachments' },
            saveScoringInlineComments: { path: '/save-scoring-inline-comments' }
        },
        runnerConfiguration: {
            requestTimeout: 2500,
            providers: {
                runner: { id: 'defaultRunner' },
                itemRunner: { id: 'defaultItemRunner' },
                proxy: { id: 'defaultProxy' },
                plugins: []
            }
        }
    };
    // default request options (happy path)
    const jwtTokenHandler = {};
    const rootUrl = 'https://localhost.test';
    const path = '/api/v1/delivery-executions';
    const resource = 'configuration';
    const method = 'GET';

    afterEach(() => {
        fetch.resetMocks();
    });

    it.each([
        [null, {}],
        ['', {}],
        [{}, {}],
        [deliveryExecutionId, void 0],
        [deliveryExecutionId, {}],
        [deliveryExecutionId, { rootUrl: 'unparseable' }],
        [deliveryExecutionId, { rootUrl, path: {} }],
        [deliveryExecutionId, { rootUrl, path: '/%25Dencoded%20stuff' }],
        [deliveryExecutionId, { rootUrl, path, resource: {} }],
        [deliveryExecutionId, { rootUrl, path, resource: 'foo$resource' }],
        [deliveryExecutionId, { rootUrl, path, resource, method: 'PUT' }]
    ])('should fail before requesting configuration', async (dxId, options) => {
        await expect(() => configurationLoader(dxId, defaultConfiguration, options)).rejects.toThrow(TypeError);
    });

    it('should fail on bad configuration response', async () => {
        const options = {
            jwtTokenHandler,
            rootUrl,
            path,
            resource,
            method
        };

        fetch.mockResponseOnce(request => {
            expect(request.url).toBe('https://localhost.test/api/v1/delivery-executions/abc123/configuration');
            return Promise.resolve({
                status: 200,
                body: JSON.stringify({
                    data: null
                })
            });
        });

        await expect(() => configurationLoader(deliveryExecutionId, defaultConfiguration, options)).rejects.toThrow(
            ApiError
        );
    });

    it('should request and return the configuration', async () => {
        const runnerConfiguration = {
            providers: {
                runner: { id: 'fooRunner' },
                itemRunner: { id: 'fooItemRunner' },
                proxy: { id: 'fooProxy' },
                plugins: [
                    {
                        id: 'fooPlugin'
                    }
                ]
            }
        };
        const options = {
            jwtTokenHandler,
            rootUrl,
            path,
            resource,
            method
        };

        fetch.mockResponseOnce(request => {
            expect(request.url).toBe('https://localhost.test/api/v1/delivery-executions/abc123/configuration');
            expect(request.method).toBe('GET');
            expect(request.timeout).toBe(2500);

            return Promise.resolve({
                status: 200,
                body: JSON.stringify({
                    data: {
                        runnerConfiguration
                    }
                })
            });
        });

        const config = await configurationLoader(deliveryExecutionId, defaultConfiguration, options);

        expect(config).toEqual({
            jwtTokenHandler,
            serviceCallId: deliveryExecutionId,
            serviceUrl: '/actions/abc123',
            initItemsUrl: '/init-items',
            attachmentsUploadDataUrl: '/attachments/abc123',
            saveScoringInlineCommentsUrl: '/save-scoring-inline-comments/abc123',
            ...defaultConfiguration.runnerConfiguration,
            runnerConfiguration
        });
    });
});
