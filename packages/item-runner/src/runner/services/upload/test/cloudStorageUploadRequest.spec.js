// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

//global.fetch = vi.fn();

import { cloudStorageUploadRequest } from '../cloudStorageUploadRequest.js';
import ApiError from 'core/error/ApiError';
import NetworkError from 'core/error/NetworkError';
import TimeoutError from 'core/error/TimeoutError';
import { mockXhr } from './mockXhr.js';

let xhrSpy;
let parameters;

describe('cloudStorage upload request', () => {
    const aFile = new File(['bb'], 'aFile.txt', { type: 'text/plain' });

    beforeEach(() => {
        window.isSecureContext = true;
        xhrSpy = vi.spyOn(window, 'XMLHttpRequest');
        parameters = {
            url: '//cloudStorage/upload',
            method: 'POST',
            file: aFile,
            timeout: 555,
            abortController: new AbortController(),
            onProgress: vi.fn()
        };
    });

    afterEach(() => {
        xhrSpy.mockRestore();
    });

    it('fails outside a secure context', () => {
        window.isSecureContext = false;
        expect(() => cloudStorageUploadRequest('i2', parameters)).toThrow();
    });

    it('uploads to cloud storage and resolves with object', () => {
        const xhrMock = mockXhr();
        xhrSpy.mockImplementation(() => xhrMock);

        return cloudStorageUploadRequest(parameters).then(result => {
            expect(result).toMatchObject({});
            expect(xhrMock.open).toHaveBeenCalledWith(parameters.method, parameters.url, true);
            expect(xhrMock.send).toHaveBeenCalledWith(parameters.file);
        });
    });

    it('reports progress', () => {
        const xhrMock = mockXhr();
        xhrSpy.mockImplementation(() => xhrMock);

        return cloudStorageUploadRequest(parameters).then(() => {
            expect(parameters.onProgress).toHaveBeenCalledWith(5, 10);
        });
    });

    it('aborts the request on demand and rejects', async () => {
        const xhrMock = mockXhr();
        xhrSpy.mockImplementation(() => xhrMock);

        const uploadPromise = cloudStorageUploadRequest(parameters);
        parameters.abortController.abort();

        try {
            await uploadPromise;
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('AbortError');
        }
    });

    it('rejects with error on timeout', async () => {
        const xhrMock = mockXhr();
        xhrSpy.mockImplementation(() => xhrMock);

        const uploadPromise = cloudStorageUploadRequest(parameters);
        xhrMock._trigger('timeout');

        try {
            await uploadPromise;
        } catch (error) {
            expect(xhrMock.timeout).toBe(parameters.timeout);
            expect(error).toBeInstanceOf(TimeoutError);
        }
    });

    it('rejects with error if cannot contact cloud storage', async () => {
        const xhrMock = mockXhr({ status: 0 });
        xhrSpy.mockImplementation(() => xhrMock);

        const uploadPromise = cloudStorageUploadRequest(parameters);
        xhrMock._trigger('error');

        try {
            await uploadPromise;
        } catch (error) {
            expect(error).toBeInstanceOf(NetworkError);
            expect(error.errorCode).toEqual(0);
        }
    });

    it('error response: the signed url is expired', () => {
        const xhrMock = mockXhr({
            status: 400,
            responseText:
                "<?xml version='1.0' encoding='UTF-8'?><Error><Code>ExpiredToken</Code><Message>The provided token has expired.</Message><Details>Request signature expired at: 2021-01-15T14:01:50+00:00</Details></Error>"
        });
        xhrSpy.mockImplementation(() => xhrMock);

        return cloudStorageUploadRequest(parameters).catch(error => {
            expect(error).toBeInstanceOf(ApiError);
            expect(error.errorCode).toEqual(400);
            expect(error.message).toEqual('Cloud Storage ExpiredToken: The provided token has expired.');
        });
    });

    it('error response: unauthorized upload', () => {
        const xhrMock = mockXhr({
            status: 403,
            responseText:
                "<?xml version='1.0' encoding='UTF-8'?><Error><Code>SignatureDoesNotMatch</Code><Message>The request signature we calculated does not match the signature you provided. Check your Google secret key and signing method.</Message></Error>"
        });
        xhrSpy.mockImplementation(() => xhrMock);

        return cloudStorageUploadRequest(parameters).catch(error => {
            expect(error).toBeInstanceOf(ApiError);
            expect(error.errorCode).toEqual(403);
            expect(error.message).toEqual(
                'Cloud Storage SignatureDoesNotMatch: The request signature we calculated does not match the signature you provided. Check your Google secret key and signing method.'
            );
        });
    });
});
