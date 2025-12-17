// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../services.js', async () => {
    const originalModule = await vi.importActual('../services.js');
    return {
        __esModule: true,
        default: {
            ...originalModule.default,
            service1: { default: vi.fn(() => {}) },
            service2: { default: vi.fn(() => {}) }
        }
    };
});

import services from '../services.js';
import getUploadService, { cancelAllServicesUploads } from '../uploadService.js';
import { mockXhr } from './mockXhr.js';
import { mockFileReader } from './mockFileReader.js';
import { wait } from '../../../util/async.js';

describe('getUploadService', () => {
    it('fails loading unknown service', () => {
        expect(() => getUploadService()).toThrowError("no upload service found with id 'undefined'");
        expect(() => getUploadService('item1', 'RESPONSE', { id: 'foo-storage' })).toThrowError(
            "no upload service found with id 'foo-storage'"
        );
    });

    it('loads a given service', () => {
        getUploadService('item1', 'RESPONSE', { id: 'service1' });
        expect(services.service1.default).toHaveBeenCalled();
        expect(services.service1.default).toHaveBeenCalledWith('item1_RESPONSE', { id: 'service1' }, {});

        getUploadService('item1', 'RESPONSE_2', { id: 'service2', foo: 'bar' });
        expect(services.service2.default).toHaveBeenCalled();
        expect(services.service2.default).toHaveBeenCalledWith('item1_RESPONSE_2', { id: 'service2', foo: 'bar' }, {});
    });
});

describe('cancelAllServicesUploads', () => {
    let xhrSpy;
    let filereaderSpy;

    beforeEach(() => {
        window.isSecureContext = true;
        xhrSpy = vi.spyOn(window, 'XMLHttpRequest');
        filereaderSpy = vi.spyOn(window, 'FileReader');
    });
    afterEach(() => {
        xhrSpy.mockRestore();
        filereaderSpy.mockRestore();
    });

    it('cancels all ongoing uploads from all services', async () => {
        xhrSpy
            .mockImplementationOnce(() =>
                mockXhr({
                    send() {},
                    abort() {
                        this._trigger('abort', {});
                    }
                })
            )
            .mockImplementationOnce(() =>
                mockXhr({
                    send() {},
                    abort() {
                        this._trigger('abort', {});
                    }
                })
            );

        filereaderSpy.mockImplementation(() =>
            mockFileReader({
                abort() {
                    this.readyState = 2; // DONE
                    this._trigger('abort', {});
                },
                delay: 100
            })
        );

        const itemIdentifier = 'item1';
        const responseIdentifier1 = 'RESPONSE_1';
        const responseIdentifier2 = 'RESPONSE_2';
        const responseIdentifier3 = 'RESPONSE_3';
        const responseIdentifier4 = 'RESPONSE_4';

        const serviceParams = {
            method: 'POST',
            url: 'https://localhost:3000/upload'
        };

        const cloudService1 = getUploadService(itemIdentifier, responseIdentifier1, {
            ...serviceParams,
            id: 'cloud-storage'
        });
        const cloudService2 = getUploadService(itemIdentifier, responseIdentifier2, {
            ...serviceParams,
            id: 'cloud-storage'
        });
        const base64Service1 = getUploadService(itemIdentifier, responseIdentifier3, {
            ...serviceParams,
            id: 'base64'
        });
        const base64Service2 = getUploadService(itemIdentifier, responseIdentifier4, {
            ...serviceParams,
            id: 'base64'
        });

        // start 4 parallel uploads
        const upload1 = cloudService1.upload({ data: new File(['test1'], 'test1.txt') });
        const upload2 = cloudService2.upload({ data: new File(['test2'], 'test2.txt') });
        const upload3 = base64Service1.upload({ data: new File(['test3'], 'test3.txt') });
        const upload4 = base64Service2.upload({ data: new File(['test4'], 'test4.txt') });

        await wait(25);

        cancelAllServicesUploads();

        await expect(upload1).rejects.toThrow('Cloud Storage request aborted');
        await expect(upload2).rejects.toThrow('Cloud Storage request aborted');
        await expect(upload3).resolves.toBe(null);
        await expect(upload4).resolves.toBe(null);
    });
});
