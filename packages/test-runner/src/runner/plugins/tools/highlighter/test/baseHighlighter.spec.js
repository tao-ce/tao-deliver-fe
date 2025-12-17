// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { fireEvent } from '@testing-library/svelte';
import baseHighlighter from '../baseHighlighter.js';

describe('baseHighlighter', () => {
    vi.useFakeTimers();

    const selection = window.getSelection();

    function createHighlighterWithDomFixture() {
        const div = document.createElement('div');
        div.classList.add('fixture');
        div.innerHTML = '<div id="test-main"><div class="qti-item"/></div>';
        document.body.appendChild(div);

        const onUpdatedSpy = vi.fn();
        const h = new baseHighlighter({
            containerSelector: '#test-main .qti-item',
            onUpdatedCallback: onUpdatedSpy,
            containersWhiteList: ['.qti-interaction > .qti-prompt'],
            containersBlackList: ['.qti-interaction'],
            baseClassName: 'hl-base',
            toggledModeClassPerColor: {
                yellow: 'hl-mode-yellow',
                pink: 'hl-mode-pink',
                blue: 'hl-mode-blue',
                eraser: 'hl-mode-eraser'
            },
            defaultColor: 'yellow',
            eraserColor: 'eraser'
        });
        return { h, itemContainer: div.querySelector('.qti-item'), onUpdatedSpy };
    }

    function removeDomFixture() {
        Array.from(document.querySelectorAll('.fixture')).forEach(elt => elt.remove());
    }

    function selectRange() {
        const range = document.createRange();
        selection.addRange(range);
        return range;
    }

    function getHighlights() {
        return Array.from(document.querySelectorAll('.hl-base'));
    }

    function getColorHighlights(color) {
        return Array.from(document.querySelectorAll(`.hl-base[data-color="${color}"]`));
    }

    function selectAndMouseup(itemContainer, childNodeIndex) {
        const range = selectRange();
        range.selectNodeContents(itemContainer.childNodes[childNodeIndex]);
        fireEvent.mouseUp(document.body);
    }

    function discardSelection() {
        selection.removeAllRanges();
    }

    function selectAndKeypress(itemContainer, childNodeIndex) {
        const range = selectRange();
        range.selectNodeContents(itemContainer.childNodes[childNodeIndex]);
        fireEvent.keyPress(document.body, { key: 'Enter' });
    }

    function expectHighlightsCount(count) {
        expect(getHighlights().length).toBe(count);
    }

    afterEach(() => {
        removeDomFixture();
        discardSelection();
    });

    it('has expected API', () => {
        const h = new baseHighlighter({});

        expect(typeof h.attachListeners).toEqual('function');
        expect(typeof h.detachListeners).toEqual('function');
        expect(typeof h.toggleHighlighting).toEqual('function');
        expect(typeof h.toggleErasing).toEqual('function');
        expect(typeof h.highlightSelection).toEqual('function');
        expect(typeof h.eraseSelection).toEqual('function');
        expect(typeof h.clearSingleHighlight).toEqual('function');
        expect(typeof h.clearHighlights).toEqual('function');
        expect(typeof h.getHasSelection).toEqual('function');
        expect(typeof h.getHighlightsCount).toEqual('function');
        expect(typeof h.getColorKeyForHighlight).toEqual('function');
        expect(typeof h.restoreFromDataModel).toEqual('function');
        expect(typeof h.rebuildDataModel).toEqual('function');
        expect(typeof h.getDataModel).toEqual('function');
        expect(typeof h.id).toEqual('string');
        expect(typeof h.enabled).toEqual('boolean');
        expect(typeof h.enable).toEqual('function');
        expect(typeof h.disable).toEqual('function');
    });

    it('default id / get id', () => {
        const hl1 = new baseHighlighter({});
        expect(hl1.id).toBe('tao-highlighter-123');

        const hl2 = new baseHighlighter({ id: 'hl2' });
        expect(hl2.id).toBe('hl2');
    });

    it('enable / disable / get enabled', () => {
        const h = new baseHighlighter({});
        expect(h.enabled).toBe(true);
        h.disable();
        expect(h.enabled).toBe(false);
        h.enable();
        expect(h.enabled).toBe(true);
    });

    it('getHasSelection: returns true if user selection exists', () => {
        const { h, itemContainer } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';

        expect(h.getHasSelection()).toBe(false);

        const range = selectRange();
        range.setStart(itemContainer.childNodes[1].childNodes[0], 2);
        range.setEnd(itemContainer.childNodes[1].childNodes[0], 3);

        expect(h.getHasSelection()).toBe(true);

        selection.collapse(itemContainer.childNodes[1].childNodes[0], 2);

        expect(h.getHasSelection()).toBe(false);
    });

    it('highlightSelection: adds highlight based on selection', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';

        h.highlightSelection('blue');

        let highlights = getHighlights();
        expect(highlights.length).toBe(0);
        expect(h.getHighlightsCount()).toEqual({});
        expect(selection.isCollapsed).toBe(true);

        let range = selectRange();
        range.setStart(itemContainer.childNodes[0].childNodes[0], 0);
        range.setEnd(itemContainer.childNodes[1].childNodes[0], 1);
        h.highlightSelection('blue');

        // <div><span class="hl-base-blue">summer</span></div>
        // <div><span class="hl-base-blue">w</span>inter</div>

        discardSelection();

        highlights = getHighlights();
        expect(highlights.length).toBe(2);
        expect(getColorHighlights('blue').length).toBe(2);
        expect(highlights[0].textContent).toBe('summer');
        expect(highlights[1].textContent).toBe('w');
        expect(itemContainer.childNodes[0].childNodes.length).toBe(1);
        expect(itemContainer.childNodes[0].childNodes[0]).toBe(highlights[0]);
        expect(itemContainer.childNodes[1].childNodes.length).toBe(2);
        expect(itemContainer.childNodes[1].childNodes[0]).toBe(highlights[1]);
        expect(itemContainer.childNodes[1].childNodes[1].textContent).toBe('inter');
        expect(h.getHighlightsCount()).toEqual({ blue: 2 });
        expect(selection.isCollapsed).toBe(true);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        range = selectRange();
        range.setStart(itemContainer.childNodes[1].childNodes[1], 2);
        range.setEnd(itemContainer.childNodes[1].childNodes[1], 5);
        h.highlightSelection('yellow');

        //<div><span class="hl-base-blue">summer</span></div>
        //<div><span class="hl-base-blue">w</span>in<span class="hl-base-yellow">ter</span></div>

        discardSelection();

        highlights = getHighlights();
        expect(highlights.length).toBe(3);
        expect(getColorHighlights('blue').includes(highlights[0])).toBe(true);
        expect(getColorHighlights('blue').includes(highlights[1])).toBe(true);
        expect(getColorHighlights('yellow').includes(highlights[2])).toBe(true);
        expect(highlights[0].textContent).toBe('summer');
        expect(highlights[1].textContent).toBe('w');
        expect(highlights[2].textContent).toBe('ter');
        expect(itemContainer.childNodes[0].childNodes.length).toBe(1);
        expect(itemContainer.childNodes[0].childNodes[0]).toBe(highlights[0]);
        expect(itemContainer.childNodes[1].childNodes.length).toBe(3);
        expect(itemContainer.childNodes[1].childNodes[0]).toBe(highlights[1]);
        expect(itemContainer.childNodes[1].childNodes[1].textContent).toBe('in');
        expect(itemContainer.childNodes[1].childNodes[2]).toBe(highlights[2]);
        expect(h.getHighlightsCount()).toEqual({ yellow: 1, blue: 2 });
        expect(selection.isCollapsed).toBe(true);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        range = selectRange();
        range.selectNodeContents(itemContainer);
        h.highlightSelection('yellow');

        //<div><span class="hl-base-yellow">summer</span></div>
        //<div><span class="hl-base-yellow">winter</span></div>

        discardSelection();

        highlights = getHighlights();
        expect(highlights.length).toBe(2);
        expect(getColorHighlights('yellow').length).toBe(2);
        expect(highlights[0].textContent).toBe('summer');
        expect(highlights[1].textContent).toBe('winter');
        expect(itemContainer.childNodes[0].childNodes.length).toBe(1);
        expect(itemContainer.childNodes[0].childNodes[0]).toBe(highlights[0]);
        expect(itemContainer.childNodes[1].childNodes.length).toBe(1);
        expect(itemContainer.childNodes[1].childNodes[0]).toBe(highlights[1]);
        expect(h.getHighlightsCount()).toEqual({ yellow: 2 });
        expect(selection.isCollapsed).toBe(true);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();
    });

    it('eraseSelection: removes highlight based on selection', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';

        let range = selectRange();
        range.setStart(itemContainer.childNodes[0].childNodes[0], 0);
        range.setEnd(itemContainer.childNodes[1].childNodes[0], 1);
        h.highlightSelection();

        // <div><span class="hl-base-yellow">summer</span></div>
        // <div><span class="hl-base-yellow">w</span>inter</div>

        discardSelection();

        let highlights = getHighlights();
        expect(highlights.length).toBe(2);
        expect(h.getHighlightsCount()).toEqual({ yellow: 2 });
        expect(selection.isCollapsed).toBe(true);

        h.eraseSelection();

        discardSelection();

        highlights = getHighlights();
        expect(highlights.length).toBe(2);
        expect(h.getHighlightsCount()).toEqual({ yellow: 2 });
        expect(selection.isCollapsed).toBe(true);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        range = selectRange();
        range.setStart(itemContainer.childNodes[0].childNodes[0].childNodes[0], 1);
        range.setEnd(itemContainer.childNodes[0].childNodes[0].childNodes[0], 4);
        h.eraseSelection();

        // <div>
        //   <span class="hl-base-yellow">s</span>
        //   umm
        //   <span class="hl-base-yellow">er</span>
        // </div >
        // <div><span class="hl-base-yellow">w</span>inter</div>

        discardSelection();

        highlights = getHighlights();
        expect(highlights.length).toBe(3);
        expect(highlights[0].textContent).toBe('s');
        expect(highlights[1].textContent).toBe('er');
        expect(highlights[2].textContent).toBe('w');
        expect(itemContainer.childNodes[0].childNodes.length).toBe(3);
        expect(itemContainer.childNodes[0].childNodes[0]).toBe(highlights[0]);
        expect(itemContainer.childNodes[0].childNodes[1].textContent).toBe('umm');
        expect(itemContainer.childNodes[0].childNodes[2]).toBe(highlights[1]);
        expect(itemContainer.childNodes[1].childNodes.length).toBe(2);
        expect(itemContainer.childNodes[1].childNodes[0]).toBe(highlights[2]);
        expect(itemContainer.childNodes[1].childNodes[1].textContent).toBe('inter');
        expect(h.getHighlightsCount()).toEqual({ yellow: 3 });
        expect(selection.isCollapsed).toBe(true);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        range = selectRange();
        range.selectNodeContents(itemContainer);
        h.eraseSelection();

        // <div>summer</div>
        // <div>winter</div>

        discardSelection();

        highlights = getHighlights();
        expect(itemContainer.childNodes[0].childNodes[0].textContent).toBe('summer');
        expect(itemContainer.childNodes[1].childNodes[0].textContent).toBe('winter');
        expect(highlights.length).toBe(0);
        expect(h.getHighlightsCount()).toEqual({});
        expect(selection.isCollapsed).toBe(true);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();
    });

    it('eraseSelection with restoreSelection argument', () => {
        const { h, itemContainer } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';

        let range = selectRange();
        range.setStart(itemContainer.childNodes[0].childNodes[0], 0);
        range.setEnd(itemContainer.childNodes[1].childNodes[0], 1);
        h.highlightSelection();

        // <div><span class="hl-base-yellow">summer</span></div>
        // <div><span class="hl-base-yellow">w</span>inter</div>

        discardSelection();

        let highlights = getHighlights();
        expect(highlights.length).toBe(2);

        range = selectRange();
        range.setStart(itemContainer.childNodes[0].childNodes[0].firstChild, 3);
        range.setEnd(itemContainer.childNodes[0].childNodes[0].firstChild, 6);
        h.eraseSelection(false, true); //part of higlhight

        // <div><span class="hl-base-yellow">sum</span>mer</div>
        // <div><span class="hl-base-yellow">w</span>inter</div>
        highlights = getHighlights();
        expect(highlights.length).toBe(2);
        expect(selection.anchorNode).toBe(itemContainer.childNodes[0].childNodes[1]);
        expect(selection.toString()).toBe('mer');

        discardSelection();

        range = selectRange();
        range.setStart(itemContainer.childNodes[0].childNodes[1], 1);
        range.setEnd(itemContainer.childNodes[1].childNodes[1], 2);
        h.eraseSelection(false, true); //text containing highlight inside

        // <div><span class="hl-base-yellow">sum</span>mer</div>
        // <div>winter</div>
        highlights = getHighlights();
        expect(highlights.length).toBe(1);
        expect(selection.anchorNode).toBe(itemContainer.childNodes[0].childNodes[1]);
        expect(selection.focusNode).toBe(itemContainer.childNodes[1].childNodes[0]);
        expect(selection.toString()).toBe('erwin');
    });

    it('toggleHighlighting: on mouseup, highlight is added based on selection', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        h.attachListeners();

        discardSelection();

        selectAndMouseup(itemContainer, 0);
        expect(getHighlights().length).toBe(0);
        expect(onUpdatedSpy).not.toHaveBeenCalled();

        h.toggleHighlighting(true, 'yellow');
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-yellow')).toBe(true);

        discardSelection();

        selectAndMouseup(itemContainer, 0);
        expect(getHighlights().length).toBe(1);
        expect(getColorHighlights('yellow').length).toBe(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleHighlighting(false);
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-yellow')).toBe(false);

        discardSelection();

        selectAndMouseup(itemContainer, 1);
        expect(getHighlights().length).toBe(1);
        expect(getColorHighlights('yellow').length).toBe(1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();

        h.toggleHighlighting(true, 'pink');
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-pink')).toBe(true);

        discardSelection();

        selectAndMouseup(itemContainer, 1);
        expect(getHighlights().length).toBe(2);
        expect(getColorHighlights('yellow').length).toBe(1);
        expect(getColorHighlights('pink').length).toBe(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleHighlighting(false);
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-pink')).toBe(false);
    });

    it('toggleHighlighting: on keypress, highlight is added based on selection', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        h.attachListeners();

        discardSelection();

        selectAndKeypress(itemContainer, 0);
        expect(getHighlights().length).toBe(0);
        expect(onUpdatedSpy).not.toHaveBeenCalled();

        h.toggleHighlighting(true, 'yellow');
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-yellow')).toBe(true);

        discardSelection();

        selectAndKeypress(itemContainer, 0);
        expect(getHighlights().length).toBe(1);
        expect(getColorHighlights('yellow').length).toBe(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleHighlighting(false);
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-yellow')).toBe(false);

        discardSelection();

        selectAndKeypress(itemContainer, 1);
        expect(getHighlights().length).toBe(1);
        expect(getColorHighlights('yellow').length).toBe(1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();

        h.toggleHighlighting(true, 'pink');
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-pink')).toBe(true);

        discardSelection();

        selectAndKeypress(itemContainer, 1);
        expect(getHighlights().length).toBe(2);
        expect(getColorHighlights('pink').length).toBe(1);
        expect(getColorHighlights('yellow').length).toBe(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleHighlighting(false);
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-pink')).toBe(false);
    });

    it('toggleErasing: on mouseup, highlight is removed based on selection', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        h.attachListeners();

        const range = selectRange();
        range.selectNodeContents(itemContainer);
        h.highlightSelection();
        expectHighlightsCount(2);

        discardSelection();

        selectAndMouseup(itemContainer, 0);
        expectHighlightsCount(2);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleErasing(true);
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-eraser')).toBe(true);

        discardSelection();

        selectAndMouseup(itemContainer, 0);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleErasing(false);
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-eraser')).toBe(false);

        discardSelection();

        selectAndMouseup(itemContainer, 1);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();
    });

    it('toggleErasing: on keypress, highlight is removed based on selection', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        h.attachListeners();

        const range = selectRange();
        range.selectNodeContents(itemContainer);
        h.highlightSelection();
        expectHighlightsCount(2);

        discardSelection();

        selectAndKeypress(itemContainer, 0);
        expectHighlightsCount(2);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleErasing(true);
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-eraser')).toBe(true);

        discardSelection();

        selectAndKeypress(itemContainer, 0);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleErasing(false);
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-eraser')).toBe(false);

        discardSelection();

        selectAndKeypress(itemContainer, 1);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();
    });

    it('toggleErasing: on click, highlight is removed', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        h.attachListeners();
        const clickHighlight = highlightIndex => {
            fireEvent.click(getHighlights()[highlightIndex]);
        };

        const range = selectRange();
        range.selectNodeContents(itemContainer);
        h.highlightSelection();
        expectHighlightsCount(2);

        clickHighlight(0);
        expectHighlightsCount(2);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleErasing(true);

        clickHighlight(0);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleErasing(false);

        clickHighlight(0);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();
    });

    it('toggleErasing: on keypress, highlight is removed', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        h.attachListeners();
        const keypressHighlight = highlightIndex => {
            fireEvent.keyPress(getHighlights()[highlightIndex], { key: 'Enter' });
        };

        const range = selectRange();
        range.selectNodeContents(itemContainer.childNodes[0]);
        h.highlightSelection();
        expectHighlightsCount(1);

        range.selectNodeContents(itemContainer.childNodes[1]);
        h.highlightSelection();
        expectHighlightsCount(2);

        keypressHighlight(0);
        expectHighlightsCount(2);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleErasing(true);
        keypressHighlight(0);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.toggleErasing(false);

        keypressHighlight(0);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();
    });

    it('attachListeners: enables mouseup listeners', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        h.toggleHighlighting(true, 'yellow');

        selectAndMouseup(itemContainer, 0);
        expectHighlightsCount(0);
        expect(onUpdatedSpy).not.toHaveBeenCalled();

        selectAndMouseup(itemContainer, 0);
        expectHighlightsCount(0);
        expect(onUpdatedSpy).not.toHaveBeenCalled();

        h.attachListeners();

        selectAndMouseup(itemContainer, 0);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.detachListeners();

        selectAndMouseup(itemContainer, 1);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();
    });

    it('attachListeners: enables keypress listeners', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        h.toggleHighlighting(true, 'yellow');

        selectAndKeypress(itemContainer, 0);
        expectHighlightsCount(0);
        expect(onUpdatedSpy).not.toHaveBeenCalled();

        selectAndKeypress(itemContainer, 0);
        expectHighlightsCount(0);
        expect(onUpdatedSpy).not.toHaveBeenCalled();

        h.attachListeners();

        selectAndKeypress(itemContainer, 0);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.detachListeners();

        selectAndKeypress(itemContainer, 1);
        expectHighlightsCount(1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();
    });

    it("attachListeners: doesn't react to mouseup when disabled", () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        expect(h.enabled).toBe(true);

        h.toggleHighlighting(true, 'pink');
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-pink')).toBe(true);

        h.attachListeners();

        selectAndMouseup(itemContainer, 0);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.disable();
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-pink')).toBe(false);

        selectAndMouseup(itemContainer, 1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();
    });

    it("attachListeners: doesn't react to keypress when disabled", () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';
        expect(h.enabled).toBe(true);

        h.toggleHighlighting(true, 'pink');
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-pink')).toBe(true);

        h.attachListeners();

        selectAndKeypress(itemContainer, 0);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();

        h.disable();
        expect(document.querySelector('.qti-item').classList.contains('hl-mode-pink')).toBe(false);

        selectAndKeypress(itemContainer, 1);
        expect(onUpdatedSpy).not.toHaveBeenCalled();
    });

    it('clearHighlights: removes all highlights', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';

        expect(h.getHighlightsCount()).toEqual({});

        let range = selectRange();
        range.setStart(itemContainer.childNodes[0].childNodes[0], 0);
        range.setEnd(itemContainer.childNodes[1].childNodes[0], 1);
        h.highlightSelection();

        discardSelection();

        range = selectRange();
        range.setStart(itemContainer.childNodes[1].childNodes[1], 2);
        range.setEnd(itemContainer.childNodes[1].childNodes[1], 4);
        h.highlightSelection();

        expect(getHighlights().length).toBe(3);
        expect(h.getHighlightsCount()).toEqual({ yellow: 3 });
        onUpdatedSpy.mockClear();

        h.clearHighlights();

        expect(getHighlights().length).toBe(0);
        expect(h.getHighlightsCount()).toEqual({});
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();
    });

    it('clearHighlights with color argument', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';

        expect(h.getHighlightsCount()).toEqual({});

        let range = selectRange();
        range.setStart(itemContainer.childNodes[0].childNodes[0], 0);
        range.setEnd(itemContainer.childNodes[1].childNodes[0], 1);
        h.highlightSelection();

        discardSelection();

        range = selectRange();
        range.setStart(itemContainer.childNodes[1].childNodes[1], 1);
        range.setEnd(itemContainer.childNodes[1].childNodes[1], 2);
        h.highlightSelection('blue');

        discardSelection();

        range = selectRange();
        range.setStart(itemContainer.childNodes[1].childNodes[3], 1);
        range.setEnd(itemContainer.childNodes[1].childNodes[3], 2);
        h.highlightSelection('yellow');

        expect(getHighlights().length).toBe(4);
        expect(h.getHighlightsCount()).toEqual({ yellow: 3, blue: 1 });
        onUpdatedSpy.mockClear();

        h.clearHighlights('yellow');

        expect(getHighlights().length).toBe(1);
        expect(h.getHighlightsCount()).toEqual({ blue: 1 });
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();
    });

    it('getDataModel/restoreFromDataModel: restores highlights', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        const innerHtml = '<div>summer</div><div>winter</div>';
        itemContainer.innerHTML = innerHtml;

        const models = [];

        //not set [2]
        models.push(h.getDataModel());

        //highlight once [3]
        let range = selectRange();
        range.selectNodeContents(itemContainer.firstChild); //[summer]
        h.highlightSelection('pink');
        models.push(h.getDataModel());

        discardSelection();

        //highlight in another color [1]
        range = selectRange();
        range.selectNodeContents(itemContainer.lastChild); //[summer][winter]
        h.highlightSelection('yellow');
        models.push(h.getDataModel());

        discardSelection();

        //erase [0]
        range = selectRange();
        range.setStart(itemContainer.firstChild.firstChild.firstChild, 2); //[su]mm[er][winter]
        range.setEnd(itemContainer.firstChild.firstChild.firstChild, 4);
        h.eraseSelection();
        models.push(h.getDataModel());

        discardSelection();

        //clear all [4]
        h.clearHighlights();
        models.push(h.getDataModel());

        //restore

        itemContainer.innerHTML = innerHtml;
        h.restoreFromDataModel(models[3]); //erase [0]

        discardSelection();

        let highlights = getHighlights();
        expect(highlights.length).toBe(3);
        expect(highlights[0].textContent).toBe('su');
        expect(highlights[1].textContent).toBe('er');
        expect(highlights[2].textContent).toBe('winter');
        expect(h.getHighlightsCount()).toEqual({ yellow: 1, pink: 2 });
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();
        expect(h.getDataModel()).toEqual(models[3]);

        itemContainer.innerHTML = innerHtml;
        h.restoreFromDataModel(models[2]); //highlight in another color [1]

        highlights = getHighlights();
        expect(highlights.length).toBe(2);
        expect(highlights[0].textContent).toBe('summer');
        expect(highlights[1].textContent).toBe('winter');
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();
        expect(h.getHighlightsCount()).toEqual({ yellow: 1, pink: 1 });
        expect(h.getDataModel()).toEqual(models[2]);

        itemContainer.innerHTML = innerHtml;
        h.restoreFromDataModel(models[0]); //not set [2]

        expect(getHighlights().length).toBe(0);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();
        expect(h.getHighlightsCount()).toEqual({});
        expect(h.getDataModel()).toEqual(models[0]);

        itemContainer.innerHTML = innerHtml;
        h.restoreFromDataModel(models[1]); //highlight once [3]

        highlights = getHighlights();
        expect(highlights.length).toBe(1);
        expect(highlights[0].textContent).toBe('summer');
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();
        expect(h.getHighlightsCount()).toEqual({ pink: 1 });
        expect(h.getDataModel()).toEqual(models[1]);

        itemContainer.innerHTML = innerHtml;
        h.restoreFromDataModel(models[4]); //clear all [4]

        expect(getHighlights().length).toBe(0);
        expect(onUpdatedSpy).toHaveBeenCalled();
        onUpdatedSpy.mockClear();
        expect(h.getHighlightsCount()).toEqual({});
        expect(h.getDataModel()).toEqual(models[4]);
    });

    it('core highlighter options: does not remove empty text nodes', () => {
        const { h, itemContainer } = createHighlighterWithDomFixture();

        itemContainer.appendChild(document.createTextNode(''));
        itemContainer.appendChild(document.createTextNode('hello'));
        itemContainer.appendChild(document.createTextNode(''));
        expect(itemContainer.childNodes.length).toBe(3);

        const range = selectRange();
        range.setStart(itemContainer.childNodes[1], 1);
        range.setEnd(itemContainer.childNodes[1], 3);
        h.highlightSelection();

        expect(itemContainer.childNodes.length).toBe(5);
        expect(itemContainer.childNodes[0].textContent).toBe('');
        expect(itemContainer.childNodes[1].textContent).toBe('h');
        expect(itemContainer.childNodes[2].textContent).toBe('el');
        expect(itemContainer.childNodes[3].textContent).toBe('lo');
        expect(itemContainer.childNodes[4].textContent).toBe('');

        h.toggleErasing(true);
        itemContainer.childNodes[2].click();

        expect(itemContainer.childNodes.length).toBe(3);
        expect(itemContainer.childNodes[0].textContent).toBe('');
        expect(itemContainer.childNodes[1].textContent).toBe('hello');
        expect(itemContainer.childNodes[2].textContent).toBe('');
    });

    it('core highlighter options: respects blacklist', () => {
        const { h, itemContainer } = createHighlighterWithDomFixture();

        itemContainer.innerHTML = `
            <div>winter</div>
            <div class='qti-interaction'>spring</div>
            <div class='qti-interaction'><div class='qti-prompt'>summer</div></div>
            <div class='qti-interaction'><div class='other'>autumn</div></div>
        `;

        const range = selectRange();
        range.selectNodeContents(itemContainer);
        h.highlightSelection();

        const highlights = getHighlights();
        expect(highlights[0].textContent).toBe('winter');
        expect(highlights[1].textContent).toBe('summer');
    });

    it('getColorKeyForHighlight', () => {
        const { h, itemContainer } = createHighlighterWithDomFixture();
        itemContainer.innerHTML = '<div>summer</div><div>winter</div>';

        let range = selectRange();
        range.setStart(itemContainer.childNodes[0].childNodes[0], 0);
        range.setEnd(itemContainer.childNodes[0].childNodes[0], 1);
        h.highlightSelection('pink');

        discardSelection();

        range = selectRange();
        range.setStart(itemContainer.childNodes[1].childNodes[0], 0);
        range.setEnd(itemContainer.childNodes[1].childNodes[0], 1);
        h.highlightSelection('blue');

        const highlights = itemContainer.querySelectorAll('.hl-base');
        expect(h.getColorKeyForHighlight(highlights[0])).toBe('pink');
        expect(h.getColorKeyForHighlight(highlights[1])).toBe('blue');
    });

    it('rebuildDataModel', () => {
        const { h, itemContainer, onUpdatedSpy } = createHighlighterWithDomFixture();
        itemContainer.innerHTML =
            '<div>s<span class="hl-base" data-color="pink" data-hl-group="1">um</span>mer</div><div>winter</div>';

        expect(onUpdatedSpy).not.toHaveBeenCalled();
        h.rebuildDataModel();
        expect(onUpdatedSpy).toHaveBeenCalled();
        expect(onUpdatedSpy.mock.calls[0][1]).toHaveLength(1);
    });
});
