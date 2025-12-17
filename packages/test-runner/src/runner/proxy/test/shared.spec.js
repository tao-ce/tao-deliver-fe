// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('module');

// global.jest must be defined for jest-fetch-mock to run
global.jest = { fn: vi.fn };
require('jest-fetch-mock').enableMocks();

import jwtTokenHandlerFactory from 'core/jwt/jwtTokenHandler';
import { getAttachmentsUploadData, doRequest } from '../shared.js';
import ApiError from 'core/error/ApiError';
import NetworkError from 'core/error/NetworkError.js';
import { omit } from 'lodash';

describe('getAttachmentsUploadData', () => {
    // config
    const jwtTokenHandler = jwtTokenHandlerFactory({
        refreshTokenUrl: '/refreshUrl'
    });
    const accessToken = 'token';
    const serviceUrl = '/url';
    const uploadUrl = '/upload';
    const itemStoreTTL = 500;
    const attachmentsUploadDataUrl = 'http://localhost/attachments';
    const config = {
        serviceUrl,
        uploadUrl,
        itemStoreTTL,
        jwtTokenHandler,
        attachmentsUploadDataUrl
    };
    const itemIdentifier = 'item-1';
    const responseIdentifier = 'RESPONSE_1';

    /**
     * Creates action request mock
     * @param {object} payload - form data values expected in request
     * @param {object} responseData - response data of the request
     * @param {object} options
     * @returns {function} Request mock function, which checks parameters and returns with provided response
     */
    const attachmentsPostRequest =
        // prettier-ignore
        (payload, responseData, options = {}) =>
            request => {
                const url = new URL(attachmentsUploadDataUrl);
                Object.entries(options.searchParams || {}).forEach(([key, value]) => {
                    url.searchParams.append(key, value.toString());
                });

                expect(request.url).toBe(url.toString());
                expect(request.method).toBe('POST');
                expect(request.signal).toBe(options.signal);
                expect(request.headers.get('Authorization')).toBe(`Bearer ${accessToken}`);

                // TODO: parse request.body of type Buffer back to FormData - seemingly can't be done in jest-fetch-mock
                // expect(request.body).toMatchObject([
                //     {
                //         item_id: payload.itemIdentifier,
                //         response_id: payload.responseIdentifier
                //     }
                // ]);

                return Promise.resolve(
                    JSON.stringify({
                        success: true,
                        data: responseData
                    })
                );
            };

    /**
     * Creates basic mock for request that throws server-handled error
     * @returns {string} Serialized json response
     */
    const errorRequest = () =>
        JSON.stringify({
            success: false
        });

    beforeEach(() => {
        window;
        return jwtTokenHandler.storeAccessToken(accessToken);
    });

    afterEach(() => {
        fetch.resetMocks();
    });

    const mockResponseValues = {
        uploadMethod: 'PUT',
        uploadUrl: 'https://storage.googleapis.com/bucket/delivery-execution-uploads/1234',
        downloadUrl: 'https://storage.googleapis.com/bucket/delivery-execution-uploads/5678',
        id: 'abc123/item-1/RESPONSE_1/cloud-storage_xyz456'
    };

    it('successful request & response format', () => {
        expect.assertions(5);

        fetch.mockResponse(
            attachmentsPostRequest(
                {
                    itemIdentifier,
                    responseIdentifier
                },
                mockResponseValues
            )
        );

        return getAttachmentsUploadData(config, itemIdentifier, responseIdentifier).then(result => {
            expect(result).toMatchObject({
                ...mockResponseValues,
                uploadServiceType: 'default'
            });
        });
    });

    it('successful request & response format with abort signal', () => {
        expect.assertions(5);

        const options = { signal: new AbortController().signal };
        fetch.mockResponse(
            attachmentsPostRequest(
                {
                    itemIdentifier,
                    responseIdentifier
                },
                mockResponseValues,
                options
            )
        );
        return getAttachmentsUploadData(config, itemIdentifier, responseIdentifier, options).then(result => {
            expect(result).toMatchObject({
                ...mockResponseValues,
                uploadServiceType: 'default'
            });
        });
    });

    it('successful request & response format with attachment replacement', () => {
        expect.assertions(5);

        const options = { searchParams: { replace: true } };
        fetch.mockResponse(
            attachmentsPostRequest(
                {
                    itemIdentifier,
                    responseIdentifier
                },
                mockResponseValues,
                options
            )
        );
        return getAttachmentsUploadData(config, itemIdentifier, responseIdentifier, options).then(result => {
            expect(result).toMatchObject({
                ...mockResponseValues,
                uploadServiceType: 'default'
            });
        });
    });

    it('throws if no url', () => {
        expect.assertions(1);

        return expect(() =>
            getAttachmentsUploadData(omit(config, 'attachmentsUploadDataUrl'), itemIdentifier, responseIdentifier)
        ).toThrow('Get attachments upload data: url is not configured');
    });

    it('throws if no itemIdentifier', () => {
        expect.assertions(1);

        return expect(() => getAttachmentsUploadData(config, void 0, responseIdentifier)).toThrow(
            'Get attachments upload data: missing parameters'
        );
    });

    it('throws if no responseIdentifier', () => {
        expect.assertions(1);

        return expect(() => getAttachmentsUploadData(config, itemIdentifier, void 0)).toThrow(
            'Get attachments upload data: missing parameters'
        );
    });

    test.each(['uploadMethod', 'uploadUrl', 'downloadUrl', 'id'])(
        'unexpected response format if %s missing',
        omitted => {
            expect.assertions(5);

            fetch.mockResponse(
                attachmentsPostRequest(
                    {
                        itemIdentifier,
                        responseIdentifier
                    },
                    omit(mockResponseValues, omitted)
                )
            );

            return expect(getAttachmentsUploadData(config, itemIdentifier, responseIdentifier)).rejects.toThrow(
                'Get attachments upload data: unexpected response format'
            );
        }
    );

    it('unexpected response format if failed request', () => {
        expect.assertions(1);

        fetch.mockResponse(errorRequest());

        return expect(getAttachmentsUploadData(config, itemIdentifier, responseIdentifier)).rejects.toThrow(
            'Get attachments upload data: unexpected response format'
        );
    });
});

describe('doRequest', () => {
    const jwtTokenHandler = jwtTokenHandlerFactory({
        refreshTokenUrl: '/refreshUrl'
    });
    const accessToken = 'token';
    const requestOptions = {
        jwtTokenHandler
    };
    const serviceUrl = '/url';

    beforeEach(() => jwtTokenHandler.storeAccessToken(accessToken));

    afterEach(() => {
        fetch.resetMocks();
    });

    describe('Success', () => {
        it('resolves with a value', () => {
            expect.assertions(1);

            fetch.mockResponseOnce(() =>
                Promise.resolve(
                    JSON.stringify({
                        success: true,
                        responses: [[{ success: true }]]
                    })
                )
            );

            return doRequest(serviceUrl, requestOptions).then(result => {
                expect(result).toBeTruthy();
            });
        });

        it('resolves with successful sub-response values', () => {
            expect.assertions(1);

            fetch.mockResponseOnce(() =>
                Promise.resolve(
                    JSON.stringify({
                        success: true,
                        responses: [
                            [
                                { success: true, values: 'abc' },
                                { success: true, values: 'def' }
                            ]
                        ]
                    })
                )
            );

            return doRequest(serviceUrl, requestOptions).then(result => {
                expect(result).toEqual(['abc', 'def']);
            });
        });
    });

    describe('Partial failure', () => {
        it('rejects if some unsuccessful sub-responses', () => {
            expect.assertions(2);

            fetch.mockResponseOnce(() =>
                Promise.resolve(
                    JSON.stringify({
                        success: true,
                        responses: [
                            [
                                { success: true, values: 'abc' },
                                { success: true, values: 'def' },
                                { success: false, errorCode: 0, errorMessage: 'network error' },
                                { success: false, errorCode: 500, errorMessage: 'internal server error' }
                            ]
                        ]
                    })
                )
            );

            return doRequest(serviceUrl, requestOptions).catch(e => {
                expect(e).toBeInstanceOf(Error);
                expect(e.message).toBe('Action error: 0: network error; 500: internal server error');
            });
        });

        it('rejects with 409 if some unsuccessful 409 sub-response', () => {
            expect.assertions(3);

            fetch.mockResponseOnce(() =>
                Promise.resolve(
                    JSON.stringify({
                        success: true,
                        responses: [
                            [
                                { success: true, values: 'abc' },
                                { success: false, errorCode: 409, errorMessage: 'conflict error' }
                            ]
                        ]
                    })
                )
            );

            return doRequest(serviceUrl, requestOptions).catch(e => {
                expect(e).toBeInstanceOf(Error);
                expect(e.errorCode).toBe(409);
                expect(e.message).toBe('Action error: 409: conflict error');
            });
        });
    });

    describe('Failure', () => {
        it('rejects if no response', () => {
            expect.assertions(1);

            fetch.mockResponseOnce();

            return doRequest(serviceUrl, requestOptions).catch(e => {
                expect(e).toBeInstanceOf(Error);
            });
        });

        it('rejects if success:false response', () => {
            expect.assertions(2);

            fetch.mockResponseOnce(() => Promise.resolve(JSON.stringify({ success: false })));

            return doRequest(serviceUrl, requestOptions).catch(e => {
                expect(e).toBeInstanceOf(Error);
                expect(e.recoverable).toBeFalsy();
            });
        });

        it('rejects and recoverable if generic fetch error', () => {
            expect.assertions(3);

            fetch.mockRejectOnce(new TypeError('Failed to fetch'));

            return doRequest(serviceUrl, requestOptions).catch(e => {
                expect(e).toBeInstanceOf(NetworkError);
                expect(e.errorCode).toBe(0);
                expect(e.recoverable).toBe(true);
            });
        });

        it('rejects with ApiError if response & code provided', () => {
            expect.assertions(4);

            const errorResponse = new Response(
                JSON.stringify({ success: false, errorCode: 403, errorMessage: 'forbidden' })
            );

            fetch.mockRejectOnce(new NetworkError('no entry', 403, errorResponse));

            return doRequest(serviceUrl, requestOptions).catch(e => {
                expect(e).toBeInstanceOf(ApiError);
                expect(e.message).toBe('403: forbidden');
                expect(e.errorCode).toBe(403);
                expect(e.response).toBe(errorResponse);
            });
        });
    });
});
