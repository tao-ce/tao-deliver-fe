// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { attachmentsServiceFactory } from '../attachmentsService.js';

vi.mock('../uploadService.js', () => ({
    __esModule: true,
    default: vi.fn(() => ({ name: 'mockUploadService' }))
}));

import getUploadService from '../uploadService.js';

describe('attachmentsServiceFactory', () => {
    it('api', () => {
        const attachmentsService = attachmentsServiceFactory({
            itemIdentifier: 'item-1',
            responseIdentifier: 'RESPONSE'
        });

        expect(attachmentsService.getAttachmentsUploadData).toBeDefined();
        expect(attachmentsService.abortController).toBeDefined();
        expect(attachmentsService.uploadService).toBeNull();
        expect(attachmentsService.initializeUploadService).toBeDefined();
    });

    it('initializes the service', async () => {
        const getAttachmentsUploadData = vi.fn().mockResolvedValue({
            uploadServiceType: 'cloud-storage',
            uploadMethod: 'PUT',
            uploadUrl: '//attachments/1234',
            id: '1234',
            downloadUrl: '//attachments/1234/download'
        });

        const attachmentsService = attachmentsServiceFactory({
            getAttachmentsUploadData,
            itemIdentifier: 'item-1',
            responseIdentifier: 'RESPONSE',
            timeout: 1000
        });

        await attachmentsService.initializeUploadService();

        expect(getAttachmentsUploadData).toHaveBeenCalled();
        expect(attachmentsService.uploadService).toBeDefined();
        expect(getUploadService).toHaveBeenCalledWith(
            'item-1',
            'RESPONSE',
            expect.objectContaining({
                method: 'PUT',
                url: '//attachments/1234',
                id: 'cloud-storage',
                linkParameters: {
                    id: '1234',
                    downloadUrl: '//attachments/1234/download'
                }
            }),
            expect.objectContaining({
                timeout: 1000
            })
        );
    });
});
