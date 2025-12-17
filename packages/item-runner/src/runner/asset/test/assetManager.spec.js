// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import getAssetManager from '../assetManager.js';

describe('assetManager', () => {
    it('resolve with the baseUrls', () => {
        const assetManager = getAssetManager({ baseUrl: '/assets/' });
        expect(assetManager.resolve('image.png')).toEqual('/assets/image.png');
        expect(assetManager.resolve('/media/image.png')).toEqual('/assets/media/image.png');

        expect(assetManager.resolve('https://image.com/image.png')).toEqual('https://image.com/image.png');

        assetManager.setData({ baseUrl: 'https://cdn.io/images/12/' });
        expect(assetManager.resolve('image.png')).toEqual('https://cdn.io/images/12/image.png');
        expect(assetManager.resolve('/media/image.png')).toEqual('https://cdn.io/images/12/media/image.png');
    });
    it('resolves web worker URLs', () => {
        const assetManager = getAssetManager({ workerBase: '/path/to/worker' });
        expect(assetManager.resolve('my.worker.js')).toEqual('/path/to/worker/my.worker.js');
        expect(assetManager.resolve('my.worker.min.js')).toEqual('/path/to/worker/my.worker.min.js');

        assetManager.setData({ workerBase: 'https://foo.com/dist/' });
        expect(assetManager.resolve('pdfjs.worker.js')).toEqual('https://foo.com/dist/pdfjs.worker.js');
        expect(assetManager.resolve('pdfjs.worker.min.js')).toEqual('https://foo.com/dist/pdfjs.worker.min.js');
    });

    it('resolves base64 URLs', () => {
        const assetManager = getAssetManager();
        const base64Url = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

        expect(assetManager.resolve(base64Url)).toEqual(base64Url);
    });

    it('resolves external URLs', () => {
        const assetManager = getAssetManager({ baseUrl: '/assets', workerBase: '/path/to/worker' });
        expect(assetManager.resolve('https://image.com/image.png')).toEqual('https://image.com/image.png');
        expect(assetManager.resolve('https://hostedWorker/pdfjs.worker.min.js')).toEqual(
            'https://hostedWorker/pdfjs.worker.min.js'
        );
    });
});
