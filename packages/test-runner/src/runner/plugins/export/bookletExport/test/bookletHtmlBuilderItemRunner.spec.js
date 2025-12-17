// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

// NOTE: why is not vitest.setup.js used?
// Mock IntersectionObserver to prevent polyfill issues
// The visibilityObserver in ui-core uses IntersectionObserver which needs proper mocking
function MockIntersectionObserver() {
    this.observe = () => {};
    this.unobserve = () => {};
    this.disconnect = () => {};
}

global.IntersectionObserver = MockIntersectionObserver;

// Enhanced MutationObserver mock to handle the IntersectionObserver polyfill usage
global.MutationObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => [])
}));

import { tick } from 'svelte';
import { bookletHtmlBuilderFactory } from '../bookletHtmlBuilder.js';
import itemRunnerFactory from 'taoItems/runner/api/itemRunner';
import itemRunnerProvider from 'taoQtiNuiItem/runner/qti';
import choiceInteractionTextHtml from './mockItemData/choiceInteractionTextHtml.json';
import choiceInteractionImages from './mockItemData/choiceInteractionImages.json';
import inlineChoiceTextEntry from './mockItemData/inlineChoiceTextEntry.json';
import stimulusMatchInteraction from './mockItemData/stimulusMatchInteraction.json';
import stimulusExtendedText from './mockItemData/stimulusExtendedText.json';
import staticMath from './mockItemData/staticMath.json';
import { getMathJax } from 'taoQtiNuiItem/runner/static/math/mathjax.js';

function mockImageLoaded(wnd) {
    const complete = vi.spyOn(wnd.Image.prototype, 'complete', 'get').mockReturnValue(true);
    const naturalWidth = vi.spyOn(wnd.Image.prototype, 'naturalWidth', 'get').mockReturnValue(200);
    const naturalHeight = vi.spyOn(wnd.Image.prototype, 'naturalHeight', 'get').mockReturnValue(100);
    return { complete, naturalWidth, naturalHeight };
}

describe('bookletHtmlBuilder with item-runner', () => {
    let itemRunner;
    function renderInItemRunner(itemData) {
        const promise = new Promise((resolve, reject) => {
            itemRunner = itemRunnerFactory('qtinui', itemData)
                .on('error', err => reject(err))
                .on('init', function () {
                    this.render(document.body);
                })
                .on('render', async function () {
                    resolve();
                })
                .init();
        });
        return promise;
    }
    function destroyItemRunner() {
        if (itemRunner) {
            itemRunner.clear();
            itemRunner = null;
        }
    }

    // load library early
    beforeAll(() => getMathJax());

    beforeEach(() => {
        itemRunnerFactory.register('qtinui', itemRunnerProvider);
        mockImageLoaded(window);
    });

    afterEach(() => {
        destroyItemRunner();
        vi.restoreAllMocks();
    });

    test.each([
        ['choiceInteraction text&html', [choiceInteractionTextHtml]],
        ['choiceInteraction images', [choiceInteractionImages]],
        ['inlineChoice and textEntry', [inlineChoiceTextEntry]],
        ['stimulus and matchInteraction and extendedText', [stimulusMatchInteraction, stimulusExtendedText]]
    ])('builds %s', async (presetName, itemDatas) => {
        const api = bookletHtmlBuilderFactory();

        for (const itemData of itemDatas) {
            await renderInItemRunner(itemData);
            await api.appendItem(document.body.querySelector('.qti-item'));
            destroyItemRunner();
        }
        const result = api.getResult();
        expect(result).toMatchSnapshot();
    });

    it('builds staticMath', async () => {
        const api = bookletHtmlBuilderFactory();
        const itemData = staticMath;

        //can't properly mock all conversion chain (Blob, FileReader, Canvas) - jsdom implementation is missing too much
        //URL.createObjectURL and URL.revokeObjectURL implementations are loaded from jsdom-worker package
        const readerResultSpy = vi.spyOn(FileReader.prototype, 'result', 'get');
        vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(async function (readArg) {
            const svgBlobText = await readArg.text();
            readerResultSpy.mockReturnValue(svgBlobText.substring(200));
            this.onloadend();
        });
        vi.spyOn(global, 'getComputedStyle').mockImplementation(() => ({
            getPropertyValue() {
                return null;
            }
        }));

        await renderInItemRunner(itemData);
        for (let i = 0; i < 5; i++) {
            await tick(); //see item-runner/src/runner/static/test/Math.spec.js
        }
        //builder expects math to be rendered as svg
        const mathjaxSvgs = document.body.querySelectorAll('mjx-container > svg');
        expect(mathjaxSvgs.length).toBe(2);

        await api.appendItem(document.body.querySelector('.qti-item'));
        destroyItemRunner();

        const result = api.getResult();
        expect(result).toMatchSnapshot();
    });
});
