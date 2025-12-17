// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import cloudStorageUploadServiceFactory from '../cloudStorage.js';
import ApiError from 'core/error/ApiError';
import NetworkError from 'core/error/NetworkError';
import TimeoutError from 'core/error/TimeoutError';
import { mockXhr } from './mockXhr.js';

describe('cloudStorage upload service', () => {
    let xhrSpy;

    const aFile = new File(['bb'], 'aFile.txt', { type: 'text/plain' });
    let parameters;

    beforeEach(() => {
        window.isSecureContext = true;
        xhrSpy = vi.spyOn(window, 'XMLHttpRequest');
        parameters = {
            id: 'cloud-storage',
            url: '//cloudStorage/upload',
            method: 'POST',
            file: aFile,
            timeout: 555,
            abortController: new AbortController(),
            onProgress: vi.fn(),
            linkParameters: {
                someProp: 'someValue'
            }
        };
    });

    afterEach(() => {
        xhrSpy.mockRestore();
    });

    it('fails without an URL in paramerers', () => {
        expect(() => cloudStorageUploadServiceFactory('i1')).toThrow();
    });

    it('fails outside a secure context', () => {
        window.isSecureContext = false;
        expect(() => cloudStorageUploadServiceFactory('i2', parameters)).toThrow();
    });

    it('returns a fileHash base type', () => {
        const service = cloudStorageUploadServiceFactory('i4', parameters);
        expect(service.getBaseType()).toEqual('fileHash');
    });

    it('uploads to cloud storage', () => {
        const xhrMock = mockXhr();
        xhrSpy.mockImplementation(() => xhrMock);

        const service = cloudStorageUploadServiceFactory('u1', parameters);

        return service.upload({ data: aFile }).then(result => {
            expect(result).toMatchObject({
                data: 'abcd-efgh',
                mime: 'text/plain',
                name: 'aFile.txt',
                someProp: 'someValue'
            });

            expect(xhrMock.open).toHaveBeenCalledWith(parameters.method, parameters.url, true);
            expect(xhrMock.send).toHaveBeenCalledWith(parameters.file);
        });
    });

    it('aborts the last request for the same interaction', () => {
        expect.assertions(4);

        const longFile = new File([Array.from({ length: 100 }, () => Math.random().toString()).join()], 'long.txt', {
            type: 'text/plain'
        });
        const shortFile = new File(['aa'], 'short.txt', { type: 'text/plain' });

        const service = cloudStorageUploadServiceFactory('u2', {
            id: 'cloud-storage',
            url: parameters.url
        });

        let xhrMock = mockXhr({ responseText: '', sendDelay: 100 });
        xhrSpy.mockImplementation(() => xhrMock);

        const upload1 = service.upload({ data: longFile });

        return new Promise(resolve =>
            setTimeout(() => {
                xhrMock = mockXhr();
                xhrSpy.mockImplementation(() => xhrMock);

                const upload2 = service.upload({ data: shortFile });
                Promise.allSettled([upload1, upload2]).then(results => {
                    expect(results[0].status).toBe('rejected');
                    expect(results[0].reason.message).toBe('Cloud Storage request aborted');
                    expect(results[1].status).toBe('fulfilled');
                    expect(results[1].value).toMatchObject({
                        data: 'abcd-efgh',
                        mime: 'text/plain',
                        name: 'short.txt'
                    });
                    resolve();
                });
            }, 10)
        ); //delay due to hashing, before there's nothing to cancel
    });

    it('the signed url is expired', () => {
        expect.assertions(3);

        const service = cloudStorageUploadServiceFactory('u3', {
            id: 'cloud-storage',
            url: 'http://cloud.storage.google.foo/bucket/file?expired-signature'
        });

        const xhrMock = mockXhr({
            responseText:
                "<?xml version='1.0' encoding='UTF-8'?><Error><Code>ExpiredToken</Code><Message>The provided token has expired.</Message><Details>Request signature expired at: 2021-01-15T14:01:50+00:00</Details></Error>",
            status: 400
        });
        xhrSpy.mockImplementation(() => xhrMock);

        return service.upload({ data: aFile }).catch(err => {
            expect(err).toBeInstanceOf(ApiError);
            expect(err.errorCode).toEqual(400);
            expect(err.message).toEqual('Cloud Storage ExpiredToken: The provided token has expired.');
        });
    });

    it('unauthorized upload', () => {
        expect.assertions(3);

        const service = cloudStorageUploadServiceFactory('u4', {
            id: 'cloud-storage',
            url: 'http://cloud.storage.google.foo/bucket/file?unauthorized'
        });

        const xhrMock = mockXhr({
            responseText:
                "<?xml version='1.0' encoding='UTF-8'?><Error><Code>SignatureDoesNotMatch</Code><Message>The request signature we calculated does not match the signature you provided. Check your Google secret key and signing method.</Message></Error>",
            status: 403
        });
        xhrSpy.mockImplementation(() => xhrMock);

        return service.upload({ data: aFile }).catch(err => {
            expect(err).toBeInstanceOf(ApiError);
            expect(err.errorCode).toEqual(403);
            expect(err.message).toEqual(
                'Cloud Storage SignatureDoesNotMatch: The request signature we calculated does not match the signature you provided. Check your Google secret key and signing method.'
            );
        });
    });

    it('cannot contact cloud storage', async () => {
        expect.assertions(3);

        const service = cloudStorageUploadServiceFactory('u5', {
            id: 'cloud-storage',
            url: 'http://cloud.storage.google.foo/bucket/path'
        });

        const xhrMock = mockXhr({ status: 0, sendDelay: 50 });
        xhrSpy.mockImplementation(() => xhrMock);

        const uploadPromise = service.upload({ data: aFile });

        setTimeout(() => {
            xhrMock._trigger('error');
        }, 1);

        try {
            await uploadPromise;
        } catch (err) {
            expect(err).toBeInstanceOf(NetworkError);
            expect(err.errorCode).toEqual(0);
            expect(err.message).toEqual('Could not make Cloud Storage request');
        }
    });

    it('upload receives a timeout error', async () => {
        expect.assertions(2);

        const service = cloudStorageUploadServiceFactory(
            'u6',
            {
                id: 'cloud-storage',
                url: 'http://cloud.storage.google.foo/bucket/path'
            },
            {
                timeout: 30000
            }
        );

        const xhrMock = mockXhr({ status: 0, sendDelay: 10 });
        xhrSpy.mockImplementation(() => xhrMock);

        const uploadPromise = service.upload({ data: aFile });

        setTimeout(() => {
            xhrMock._trigger('timeout');
        }, 1);

        try {
            await uploadPromise;
        } catch (err) {
            expect(err).toBeInstanceOf(TimeoutError);
            expect(err.message).toEqual('Cloud Storage timeout');
        }
    });

    it('cancel without ongoing request', async () => {
        const service = cloudStorageUploadServiceFactory('c1', parameters);
        await expect(service.cancel()).resolves.toBe(false);
    });

    it('cancel the current request', () => {
        const longFile = new File([Array.from({ length: 100 }, () => Math.random().toString()).join()], 'long.txt', {
            type: 'text/plain'
        });
        const service = cloudStorageUploadServiceFactory('c2', parameters);

        const xhrMock = mockXhr({ sendDelay: 100 });
        xhrSpy.mockImplementation(() => xhrMock);

        const upload = service.upload({ data: longFile });
        return new Promise(
            resolve =>
                setTimeout(async () => {
                    const canceled = service.cancel();
                    await expect(upload).rejects.toBeInstanceOf(Error);
                    await expect(canceled).resolves.toBe(true);
                    resolve();
                }, 10) //delay due to hashing, before there's nothing to cancel
        );
    });
});
