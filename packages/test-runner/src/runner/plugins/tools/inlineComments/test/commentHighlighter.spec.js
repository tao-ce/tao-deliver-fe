// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent } from '@testing-library/svelte';
import { commentHighlighterFactory as commentHighlighter } from '../commentHighlighter.js';
import { generateElementId } from '@oat-sa-private/ui-core';

vi.mock('@oat-sa-private/ui-core', async () =>
    Object.assign({ __esModule: true }, await vi.importActual('@oat-sa-private/ui-core'), {
        generateElementId: vi.fn(nodeName => `tao-${nodeName}-123`),
        getLocale: () => 'en'
    })
);

describe('commentHighlighter', () => {
    function createFixture() {
        document.body.innerHTML = `
        <div class="qti-item">
          <div class="qti-extendedTextInteraction" data-response-id="respA">
            <div class="text-container">
                <p>Old king <span>Cole</span></p>
            </div>
          </div>
          <div class="qti-extendedTextInteraction" data-response-id="respB">
            <div class="text-container">
                <p>And he called for his <span>pipe</span></p>
                <p>was a merry old <span>soul</span></p>
            </div>
          </div>
        </div>`;
    }
    function selectRange() {
        const range = document.createRange();
        window.getSelection().addRange(range);
        return range;
    }
    function getContainer(responseId) {
        return document.querySelector(`[data-response-id="${responseId}"] > :first-child`);
    }
    function getHighlights(responseId) {
        return Array.from(getContainer(responseId).querySelectorAll('.tao-comment-txt'));
    }
    function discardSelection() {
        window.getSelection().removeAllRanges();
    }

    beforeEach(() => {
        createFixture();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        discardSelection();
    });

    it('returns baseHighlighter instance extended with own methods', () => {
        const h = new commentHighlighter({});

        expect(typeof h.attachListeners).toEqual('function');
        expect(typeof h.detachListeners).toEqual('function');
        expect(typeof h.highlightSelection).toEqual('function');
        expect(typeof h.eraseSelection).toEqual('function');
        expect(typeof h.clearHighlights).toEqual('function');
        expect(typeof h.restoreFromDataModel).toEqual('function');

        expect(typeof h.generateUniqueColorKey).toEqual('function');
        expect(typeof h.getCommentsOnlyDataModel).toEqual('function');
        expect(typeof h.toggleHighlightModeStyle).toEqual('function');
    });

    it('generateUniqueColorKey returns unique id', () => {
        const h = new commentHighlighter({});

        generateElementId.mockReturnValue('1234');
        const id1 = h.generateUniqueColorKey();
        generateElementId.mockReturnValue('5678');
        const id2 = h.generateUniqueColorKey();
        expect(id1).toBe('1234');
        expect(id2).toBe('5678');
    });

    it('creates highlights in container and attaches listeners', () => {
        const onClick = vi.fn();
        const h = new commentHighlighter({
            responseId: 'respB',
            onClickCallback: onClick
        });

        //highlight, with keepEmptyNodes=false option

        //add empty nodes: <p>||and he called for his ||<span>bowl</span></p>
        const pEl = getContainer('respB').querySelector('p:last-child');
        pEl.childNodes[0].splitText(0);
        pEl.childNodes[1].splitText(pEl.childNodes[1].length);

        let range = selectRange();
        range.selectNodeContents(getContainer('respB').querySelector('p:last-child'));
        h.highlightSelection('1234');

        discardSelection();
        range = selectRange();
        range.selectNodeContents(getContainer('respB').querySelector('p:first-child'));
        h.highlightSelection('5678');

        const hls = getHighlights('respB');
        expect(hls.length).toBe(4);
        expect(
            hls.find(hl => hl.dataset.beforeWasSplit === 'false' || hl.dataset.afterWasSplit === 'false')
        ).toBeFalsy();
        //empty nodes were removed [may change depending on `keepEmptyNodes` implementation]
        expect([...pEl.childNodes].find(n => !n.textContent)).toBeFalsy();
        expect(document.body).toMatchSnapshot();

        //click
        let hl = document.querySelector('p > [data-color="1234"]');
        fireEvent.click(hl);
        expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ target: hl }));
        onClick.mockClear();
        hl = document.querySelector('span > [data-color="5678"]');
        fireEvent.click(hl);
        expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ target: hl }));

        //clear
        h.clearHighlights('1234');
        expect(document.body).toMatchSnapshot();
    });

    it('toggleHighlightModeStyle sets class on container', () => {
        const h = new commentHighlighter({ responseId: 'respB' });
        const container = getContainer('respB');
        expect(container).not.toHaveClass('tao-comment-mode');
        h.toggleHighlightModeStyle(true);
        expect(container).toHaveClass('tao-comment-mode');
        h.toggleHighlightModeStyle(false);
        expect(container).not.toHaveClass('tao-comment-mode');
    });

    it('getCommentsOnlyDataModel', () => {
        //build model ignoring highlighter-plugin highlights
        let h = new commentHighlighter({
            responseId: 'respB'
        });
        let pEl = getContainer('respB').querySelector('p:first-child');
        pEl.innerHTML =
            'And <span class="highlighter-txt" data-color="pink">he</span> called for <span class="highlighter-txt" data-color="blue">his</span> pipe';

        let range = selectRange();
        range.setStart(pEl.childNodes[2], ' called '.length);
        range.setEnd(pEl.childNodes[2], ' called for '.length);
        h.highlightSelection('1234');
        discardSelection();
        range = selectRange();
        range.setStart(pEl.childNodes[5], 0);
        range.setEnd(pEl.childNodes[5], ' pi'.length);
        h.highlightSelection('5678');
        let pElHtml1 = pEl.innerHTML;
        expect(pEl).toMatchSnapshot();

        //excludeColorKey argument: build model without highlights of this color
        let m = h.getCommentsOnlyDataModel({ excludeColorKey: '5678' });
        expect(Array.isArray(m) && m.length === 1).toBe(true);
        expect(m).toMatchSnapshot();

        //no excludeColorKey
        m = h.getCommentsOnlyDataModel();
        expect(Array.isArray(m) && m.length === 2).toBe(true);
        expect(m).toMatchSnapshot();

        //original html is not affected
        expect(getContainer('respB').querySelector('p:first-child').innerHTML).toBe(pElHtml1);

        //restore model (assuming highlighter-plugin highlights aren't in the DOM yet)
        createFixture();
        pEl = getContainer('respB').querySelector('p:first-child');
        pEl.innerHTML = 'And he called for his pipe';
        h = new commentHighlighter({
            responseId: 'respB'
        });
        h.restoreFromDataModel(m);
        const hls = getHighlights('respB');
        expect(hls.length).toBe(2);
        expect(hls[0].textContent).toBe('for ');
        expect(hls[1].textContent).toBe(' pi');
        expect(getContainer('respB')).toMatchSnapshot();
    });
});
