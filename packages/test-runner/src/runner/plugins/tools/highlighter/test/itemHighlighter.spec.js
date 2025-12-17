// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import itemHighlighter from '../itemHighlighter.js';

describe('itemHighlighter', () => {
    function createFixture() {
        document.body.innerHTML = `
        <div class="something">
            <div class='other-blacklist'>winter</div>
            <div class='qti-interaction'>spring</div>
            <div class='qti-interaction'><div class='qti-prompt'>summer</div></div>
            <div class='qti-interaction'><div class='other-whitelist'>autumn</div></div>
        </div>
    `;
    }
    function selectRange() {
        const range = document.createRange();
        window.getSelection().addRange(range);
        return range;
    }
    function getHighlights() {
        return Array.from(document.querySelectorAll('.highlighter-txt'));
    }
    function discardSelection() {
        window.getSelection().removeAllRanges();
    }

    afterEach(() => {
        document.body.innerHTML = '';
        discardSelection();
    });

    it('returns baseHighlighter instance', () => {
        const h = new itemHighlighter({});

        expect(typeof h.attachListeners).toEqual('function');
        expect(typeof h.detachListeners).toEqual('function');
        expect(typeof h.toggleHighlighting).toEqual('function');
        expect(typeof h.toggleErasing).toEqual('function');
        expect(typeof h.highlightSelection).toEqual('function');
        expect(typeof h.eraseSelection).toEqual('function');
        expect(typeof h.clearHighlights).toEqual('function');
        expect(typeof h.getHasSelection).toEqual('function');
        expect(typeof h.getHighlightsCount).toEqual('function');
        expect(typeof h.restoreFromDataModel).toEqual('function');
        expect(typeof h.rebuildDataModel).toEqual('function');
        expect(typeof h.getDataModel).toEqual('function');
    });

    it('sets options: default blacklist/whitelist', () => {
        createFixture();
        const onUpdatedCallback = vi.fn();
        const h = new itemHighlighter({
            containerSelector: '.something',
            id: 'good-old-highlighter',
            onUpdatedCallback
        });
        const range = selectRange();
        range.selectNodeContents(document.body.querySelector('.something'));
        h.highlightSelection();

        expect(onUpdatedCallback).toHaveBeenCalled();
        expect(onUpdatedCallback.mock.calls[0][0]).toBe('good-old-highlighter');
        const highlights = getHighlights();
        expect(highlights.length).toBe(2);
        expect(highlights[0].textContent).toBe('winter');
        expect(highlights[1].textContent).toBe('summer');
    });

    it('sets options: passed blacklist/whitelist', () => {
        createFixture();
        const onUpdatedCallback = vi.fn();
        const h = new itemHighlighter({
            containerSelector: '.something',
            containersBlackList: ['.other-blacklist'],
            containersWhiteList: ['.other-whitelist'],
            keepEmptyNodesIgnoreSelector: '.normalizable',
            id: 'good-old-highlighter',
            onUpdatedCallback
        });
        const range = selectRange();
        range.selectNodeContents(document.body.querySelector('.something'));
        h.highlightSelection();

        expect(onUpdatedCallback).toHaveBeenCalled();
        expect(onUpdatedCallback.mock.calls[0][0]).toBe('good-old-highlighter');
        const highlights = getHighlights();
        expect(highlights.length).toBe(1);
        expect(highlights[0].textContent).toBe('autumn');
    });
});
