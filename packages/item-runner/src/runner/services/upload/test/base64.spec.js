// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import base64UploadServiceFactory from '../base64.js';

describe('base64 upload service', () => {
    it('returns a file base type', () => {
        const service = base64UploadServiceFactory('i1');
        expect(service.getBaseType()).toEqual('file');
    });

    it('converts during the upload', async () => {
        const service = base64UploadServiceFactory('i2');
        const upload = service.upload({ data: new File(['content'], 'file.txt', { type: 'text/plain' }) });

        await expect(upload).resolves.toMatchObject({
            data: 'Y29udGVudA==',
            mime: 'text/plain',
            name: 'file.txt'
        });
    });

    it('aborts the last request on the same interaction', async () => {
        const longFile = new File([Array.from({ length: 100 }, () => Math.random().toString()).join()], 'long.txt', {
            type: 'text/plain'
        });
        const shortFile = new File(['aa'], 'short.txt', { type: 'text/plain' });

        const service = base64UploadServiceFactory('aa');
        const upload1 = service.upload({ data: longFile });
        const upload2 = service.upload({ data: shortFile });

        await expect(upload1).resolves.toBeNull(); //abort
        await expect(upload2).resolves.toMatchObject({
            data: 'YWE=',
            mime: 'text/plain',
            name: 'short.txt'
        });
    });

    it('cancel without ongoing request', async () => {
        const service = base64UploadServiceFactory('aa');
        await expect(service.cancel()).resolves.toBe(false);
    });

    it('cancel the current request', async () => {
        const longFile = new File([Array.from({ length: 100 }, () => Math.random().toString()).join()], 'long.txt', {
            type: 'text/plain'
        });
        const service = base64UploadServiceFactory('aa');
        const upload = service.upload({ data: longFile });
        const canceled = service.cancel();
        await expect(upload).resolves.toBeNull();
        await expect(canceled).resolves.toBe(true);
    });
});
