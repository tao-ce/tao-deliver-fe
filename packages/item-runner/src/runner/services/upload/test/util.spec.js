// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { getFile, getLink } from '../util.js';

describe('upload services util - static methods', () => {
    const aFile = new File(['bb'], 'aFile.txt', { type: 'text/plain' });

    describe('getFile', () => {
        it('get the file from the response with already a file', async () => {
            const result = getFile({ data: aFile });
            await expect(result).resolves.toEqual(aFile);
        });

        it('get the file from the response with a local file', async () => {
            const result = getFile({ localFile: aFile });
            await expect(result).resolves.toEqual(aFile);
        });

        it('get a placeholder file if a link is available', async () => {
            const result = getFile({ link: 'http://foo/foobar.log', name: 'foobar.log', mime: 'text/log' });
            await expect(result).resolves.toBeInstanceOf(File);
            await expect(result).resolves.toMatchObject({
                name: 'foobar.log',
                type: 'text/log'
            });
        });

        it('get the file from the response with base64 data', async () => {
            const result = getFile({ data: 'Zm9vYmFyCg==', name: 'foobar.log', mime: 'text/log' });
            await expect(result).resolves.toBeInstanceOf(File);
            await expect(result).resolves.toMatchObject({
                name: 'foobar.log',
                type: 'text/log'
            });
        });
    });

    describe('getLink', () => {
        it('returns null', async () => {
            await expect(getLink()).resolves.toBeNull();
            await expect(getLink({})).resolves.toBeNull();
            await expect(getLink({ data: 'Zm9vYmFyCg==', name: 'foobar.log', mime: 'text/log' })).resolves.toBeNull();
            await expect(getLink(aFile)).resolves.toBeNull();
        });

        it('returns a the link from fileData', async () => {
            expect.assertions(2);

            await expect(getLink({ link: '//foo' })).resolves.toEqual('//foo');
            return getLink(new Promise(resolve => setTimeout(() => resolve({ link: '//bar' }), 0))).then(link => {
                expect(link).toEqual('//bar');
            });
        });
    });
});
