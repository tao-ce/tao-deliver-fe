// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import urlBuilder from '../urlBuilder.js';

describe('urlBuilder', () => {
    describe('urlFromPaths', () => {
        it('generates default url', () => {
            const url = urlBuilder.urlFromPaths();
            expect(url).toBe('');
        });

        it('generates custom url', () => {
            const url = urlBuilder.urlFromPaths('http://base.dev/', 'one/', '/two', 'three');
            expect(url).toBe('http://base.dev/one/two/three');
        });
    });

    describe('urlFromConfig', () => {
        it('generates default url', () => {
            const url = urlBuilder.urlFromConfig();
            expect(url).toBe('/api/v1');
        });

        it('generates custom url', () => {
            const url = urlBuilder.urlFromConfig({
                rootUrl: 'http://base.dev/',
                path: 'one/two/three'
            });
            expect(url).toBe('http://base.dev/one/two/three');
        });
    });

    describe('urlFromResourceConfig', () => {
        it('generates default url', () => {
            const url = urlBuilder.urlFromResourceConfig();
            expect(url).toBe('/api/v1');
        });

        it('generates custom url', () => {
            const url = urlBuilder.urlFromResourceConfig('', {
                rootUrl: 'http://base.dev/',
                path: 'my-app',
                resource: 'page.html'
            });
            expect(url).toBe('http://base.dev/my-app/page.html');
        });

        it('generates custom url including id', () => {
            const url = urlBuilder.urlFromResourceConfig('abc-123', {
                rootUrl: 'http://base.dev/',
                path: 'my-app',
                resource: 'page.html'
            });
            expect(url).toBe('http://base.dev/my-app/abc-123/page.html');
        });
    });
});
