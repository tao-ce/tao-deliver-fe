// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { bookletHtmlBuilderFactory } from '../bookletHtmlBuilder.js';
import itemA from './mockItemHtml/itemA.js';
import itemB from './mockItemHtml/itemB.js';
import itemC from './mockItemHtml/itemC.js';
import itemD from './mockItemHtml/itemD.js';
import * as itemE from './mockItemHtml/itemE.js';
import * as itemF from './mockItemHtml/itemF.js';
import * as itemG from './mockItemHtml/itemG.js';

function mockAssetToDataUrl() {
    vi.spyOn(global, 'fetch').mockImplementation(url =>
        Promise.resolve({
            blob: () => Promise.resolve(new URL(url).pathname.replace('/', ''))
        })
    );
    const readerResultSpy = vi.spyOn(FileReader.prototype, 'result', 'get');
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (readArg) {
        readerResultSpy.mockReturnValue(`data:image/png;base64,content-of-${readArg}`);
        this.onloadend();
    });
}

function mockImageLoaded(wnd) {
    const complete = vi.spyOn(wnd.Image.prototype, 'complete', 'get').mockReturnValue(true);
    const naturalWidth = vi.spyOn(wnd.Image.prototype, 'naturalWidth', 'get').mockReturnValue(200);
    const naturalHeight = vi.spyOn(wnd.Image.prototype, 'naturalHeight', 'get').mockReturnValue(100);
    return { complete, naturalWidth, naturalHeight };
}

describe('bookletHtmlBuilder', () => {
    let api;
    let container;

    beforeEach(() => {
        api = bookletHtmlBuilderFactory();

        container = document.createElement('div');
        document.body.append(container);

        mockAssetToDataUrl();
        mockImageLoaded(global);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        container = null;
        api = null;
        vi.restoreAllMocks();
    });

    it('returns api object', () => {
        expect(api).toBeTypeOf('object');
        expect(api.appendItem).toBeTypeOf('function');
        expect(api.getResult).toBeTypeOf('function');
    });

    it('appends several items', async () => {
        container.innerHTML = 'First item';
        await api.appendItem(container);
        container.innerHTML = 'Second item';
        await api.appendItem(container);
        const container3 = document.createElement('div');
        container3.innerHTML = 'Third item';
        document.body.innerHTML = '';
        document.body.append(container3);
        await api.appendItem(container3);
        const result = api.getResult();
        expect(result).toMatchSnapshot();
    });

    it('removes unneeded elements', async () => {
        container.innerHTML = itemA;
        await api.appendItem(container);
        const result = api.getResult();
        expect(result).toMatchSnapshot();
        expect(container.innerHTML).toBe(itemA); //ensure original node wasn't modified
    });

    it('keeps supported styles', async () => {
        container.innerHTML = itemB;
        await api.appendItem(container);
        const result = api.getResult();
        expect(result).toMatchSnapshot();
        expect(container.innerHTML).toBe(itemB);
    });

    it('inlines images', async () => {
        //mock because jest removes quotes from url
        vi.spyOn(global, 'getComputedStyle').mockImplementation(node => ({
            getPropertyValue(prop) {
                if (prop === 'background-image') {
                    if (node.classList.contains('bg1')) {
                        return 'url("http://xxx.yy/mybackground1.jpg")';
                    }
                    if (node.classList.contains('bg2')) {
                        return `url('http://xxx.yy/mybackground2.jpg'), linear-gradient(to bottom, red, green),url("http://xxx.yy/mybackground3.jpg")`;
                    }
                } else if (prop === 'width') {
                    if (node.src?.includes('mock-getComputedStyle-size')) {
                        return 88;
                    }
                } else if (prop === 'height') {
                    if (node.src?.includes('mock-getComputedStyle-size')) {
                        return 55;
                    }
                }
                return null;
            }
        }));

        container.innerHTML = itemC;
        await api.appendItem(container);
        const result = api.getResult();
        expect(result).toMatchSnapshot();
        expect(container.innerHTML).toBe(itemC);
    });

    it('transforms interactive elements', async () => {
        container.innerHTML = itemD;
        await api.appendItem(container);
        const result = api.getResult();
        expect(result).toMatchSnapshot();
        expect(container.innerHTML).toBe(itemD);
    });

    it('inlines iframes', async () => {
        function renderTestIframe(iframeEl, headHtml, bodyHtml) {
            mockImageLoaded(iframeEl.contentWindow);
            iframeEl.contentDocument.head.innerHTML = headHtml;
            iframeEl.contentDocument.body.innerHTML = bodyHtml;
        }

        container.innerHTML = itemE.main;
        const iframe1 = container.querySelector('.iframe1');
        renderTestIframe(iframe1, itemE.iframe1Head, itemE.iframe1Body);
        renderTestIframe(iframe1.contentDocument.body.querySelector('.iframe2'), itemE.iframe2Head, itemE.iframe2Body);
        renderTestIframe(iframe1.contentDocument.body.querySelector('.iframe3'), itemE.iframe3Head, itemE.iframe3Body);

        await api.appendItem(container);
        const result = api.getResult();
        expect(result).toMatchSnapshot();
    });

    it('reorders shared stimuluses (qti)', async () => {
        async function renderTestItem(itemHtml) {
            container = document.createElement('div');
            document.body.append(container);
            container.innerHTML = itemHtml;
            await api.appendItem(container);
            expect(container.innerHTML).toBe(itemHtml);
            container.remove();
        }

        await renderTestItem(itemF.item1);
        await renderTestItem(itemF.item2);
        await renderTestItem(itemF.item3);
        await renderTestItem(itemF.item4);
        await renderTestItem(itemF.item5);
        await renderTestItem(itemF.item6);

        const result = api.getResult();
        expect(result).toMatchSnapshot();
    });

    it('reorders shared stimuluses (pci)', async () => {
        function renderTestIframe(iframeEl, bodyHtml) {
            mockImageLoaded(iframeEl.contentWindow);
            iframeEl.contentDocument.body.innerHTML = bodyHtml;
        }
        async function renderTestItem(itemHtml, iframe1Body, iframe2Body) {
            container = document.createElement('div');
            document.body.append(container);
            container.innerHTML = itemHtml;
            const iframes = Array.from(container.querySelectorAll('iframe'));
            if (iframe1Body || iframe1Body === '') {
                renderTestIframe(iframes[0], iframe1Body);
            }
            if (iframe2Body || iframe2Body === '') {
                renderTestIframe(iframes[1], iframe2Body);
            }

            await api.appendItem(container);
            container.remove();
        }

        await renderTestItem(itemG.item1, itemG.item1_iframe1, itemG.item1_iframe2);
        await renderTestItem(itemG.item2, itemG.item2_iframe1, itemG.item2_iframe2);
        await renderTestItem(itemG.item3, itemG.item3_iframe1, itemG.item3_iframe2);
        await renderTestItem(itemG.item4, itemG.item4_iframe1, itemG.item4_iframe2);

        const result = api.getResult();
        expect(result).toMatchSnapshot();
    });
});
