// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { highlighterCollection } from '../collection.js';

describe('Highlighter collection', () => {
    vi.useFakeTimers();

    const selection = window.getSelection();

    function createDomFixture() {
        const div = document.createElement('div');
        div.classList.add('fixture');
        div.innerHTML = `
        <div id="test-main">
            <div class="qti-item">
                <p>This is item content</p>
                <article class="qti-include">Je suis le contenu du passage</article>
            </div>
        </div>`;
        document.body.appendChild(div);
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
        return Array.from(document.querySelectorAll('.highlighter-txt'));
    }

    function getColorHighlights(color) {
        return Array.from(document.querySelectorAll(`.highlighter-txt[data-color="${color}"]`));
    }

    const hlOptions = [
        {
            id: 'one'
        },
        {
            id: 'two'
        },
        {
            id: 'three'
        }
    ];

    describe('API', () => {
        it('has expected API', () => {
            const hc = highlighterCollection();

            expect(typeof hc).toEqual('object');
            expect(typeof hc.addHighlighter).toEqual('function');
            expect(typeof hc.getHighlighterById).toEqual('function');
            expect(typeof hc.getAllHighlighters).toEqual('function');
            expect(typeof hc.getItemHighlighter).toEqual('function');
            expect(typeof hc.getElementHighlighters).toEqual('function');
            expect(typeof hc.getLength).toEqual('function');
            expect(typeof hc.empty).toEqual('function');
            expect(typeof hc.getAggregatedHighlightsCount).toEqual('function');

            expect(typeof hc.all).toEqual('object');
            expect(typeof hc.all.highlightSelection).toEqual('function');
            expect(typeof hc.all.eraseSelection).toEqual('function');
            expect(typeof hc.all.attachListeners).toEqual('function');
            expect(typeof hc.all.detachListeners).toEqual('function');
            expect(typeof hc.all.toggleHighlighting).toEqual('function');
            expect(typeof hc.all.toggleErasing).toEqual('function');
            expect(typeof hc.all.clearHighlights).toEqual('function');
        });
    });

    describe('Collection methods', () => {
        const collection = highlighterCollection();

        it('addHighlighter / getLength / empty', () => {
            const instance = collection.addHighlighter(hlOptions[0]);
            expect(typeof instance).toBe('object');
            expect(collection.getLength()).toBe(1);

            collection.empty();
            expect(collection.getLength()).toBe(0);
        });

        it('get all', () => {
            collection.addHighlighter(hlOptions[0]);
            collection.addHighlighter(hlOptions[1]);
            collection.addHighlighter(hlOptions[2]);
            expect(collection.getLength()).toBe(3);

            const all = collection.getAllHighlighters();
            expect(all instanceof Array).toBeTruthy();
            expect(all.length).toBe(3);

            collection.empty();
        });

        it('get by id', () => {
            collection.addHighlighter(hlOptions[0]);
            collection.addHighlighter(hlOptions[1]);
            collection.addHighlighter(hlOptions[2]);

            const two = collection.getHighlighterById('two');
            expect(typeof two).toBe('object');
            expect(two.id).toBe('two');

            collection.empty();
        });

        it('get item', () => {
            collection.addHighlighter(hlOptions[0]);
            collection.addHighlighter(hlOptions[1]);
            collection.addHighlighter(hlOptions[2]);

            const itemHL = collection.getItemHighlighter();
            expect(typeof itemHL).toBe('object');
            expect(itemHL.id).toBe('one');

            collection.empty();
        });

        it('get non-item', () => {
            collection.addHighlighter(hlOptions[0]);
            collection.addHighlighter(hlOptions[1]);
            collection.addHighlighter(hlOptions[2]);

            const nonItemHL = collection.getElementHighlighters();
            expect(nonItemHL instanceof Array).toBeTruthy();
            expect(nonItemHL.length).toBe(2);
            expect(nonItemHL[0].id).toBe('two');
            expect(nonItemHL[1].id).toBe('three');

            collection.empty();
        });
    });

    describe('All collection members methods', () => {
        const outerSelector = '.qti-item';
        const innerSelector = '.qti-include';
        let itemContainer;
        let passageContainer;
        const outerOnUpdatedSpy = vi.fn();
        const innerOnUpdatedSpy = vi.fn();
        let collection;

        beforeEach(() => {
            createDomFixture(); // new document contents
            itemContainer = document.querySelector(outerSelector);
            passageContainer = document.querySelector(innerSelector);

            collection = highlighterCollection();
            collection.addHighlighter({
                className: 'hl-item',
                containerSelector: outerSelector,
                containersBlackList: [innerSelector],
                id: 'item-highlighter',
                getContainerArea: () => itemContainer,
                onUpdatedCallback: outerOnUpdatedSpy
            });
            collection.addHighlighter({
                className: 'hl-passage',
                containerSelector: innerSelector,
                id: 'passage-highlighter',
                getContainerArea: () => passageContainer,
                onUpdatedCallback: innerOnUpdatedSpy
            });
        });

        afterEach(() => {
            collection.all.clearHighlights();
            collection.empty();
            collection = null;
            outerOnUpdatedSpy.mockClear();
            innerOnUpdatedSpy.mockClear();
            selection.removeAllRanges();
            removeDomFixture();
        });

        it('all.highlightSelection: adds outer-only highlight based on selection', () => {
            let highlights = getHighlights();
            expect(highlights.length).toBe(0);
            expect(collection.getAggregatedHighlightsCount()).toEqual({});
            expect(selection.isCollapsed).toBe(true);

            // Highlight .qti-item > "This"
            let range = selectRange();
            range.setStart(itemContainer.childNodes[1].childNodes[0], 0);
            range.setEnd(itemContainer.childNodes[1].childNodes[0], 4);
            collection.all.highlightSelection('blue');

            vi.advanceTimersByTime(1); // itemHighlighter.discardSelection

            highlights = getHighlights();
            expect(highlights.length).toBe(1);
            expect(getColorHighlights('blue').length).toBe(1);
            expect(highlights[0].textContent).toBe('This');
            expect(collection.getAggregatedHighlightsCount()).toEqual({ blue: 1 });
            expect(selection.isCollapsed).toBe(true);
            expect(outerOnUpdatedSpy).toHaveBeenCalled();
            expect(innerOnUpdatedSpy).not.toHaveBeenCalled();
        });

        it('all.highlightSelection: adds inner-only highlight based on selection', () => {
            let highlights = getHighlights();
            expect(highlights.length).toBe(0);
            expect(collection.getAggregatedHighlightsCount()).toEqual({});
            expect(selection.isCollapsed).toBe(true);

            // Highlight .qti-include > "Je suis"
            let range = selectRange();
            range.setStart(passageContainer.childNodes[0], 0);
            range.setEnd(passageContainer.childNodes[0], 7);
            collection.all.highlightSelection('pink');

            vi.advanceTimersByTime(1); // itemHighlighter.discardSelection

            highlights = getHighlights();
            expect(highlights.length).toBe(1);
            expect(getColorHighlights('pink').length).toBe(1);
            expect(highlights[0].textContent).toBe('Je suis');
            expect(collection.getAggregatedHighlightsCount()).toEqual({ pink: 1 });
            expect(selection.isCollapsed).toBe(true);
            expect(innerOnUpdatedSpy).toHaveBeenCalled();
            expect(outerOnUpdatedSpy).not.toHaveBeenCalled();
        });

        it('all.eraseSelection: removes outer-only highlight based on selection', () => {
            // Highlight .qti-item > "This"
            let range = selectRange();
            range.setStart(itemContainer.childNodes[1].childNodes[0], 0);
            range.setEnd(itemContainer.childNodes[1].childNodes[0], 4);
            collection.all.highlightSelection();

            vi.advanceTimersByTime(1); // itemHighlighter.discardSelection

            let highlights = getHighlights();
            expect(highlights.length).toBe(1);
            expect(collection.getAggregatedHighlightsCount()).toEqual({ yellow: 1 });
            expect(selection.isCollapsed).toBe(true);

            // Erase .qti-item > "hi"
            range = selectRange();
            range.setStart(itemContainer.childNodes[1].childNodes[0].childNodes[0], 1);
            range.setEnd(itemContainer.childNodes[1].childNodes[0].childNodes[0], 3);
            collection.all.eraseSelection();

            vi.advanceTimersByTime(1); // itemHighlighter.discardSelection

            highlights = getHighlights();
            expect(highlights.length).toBe(2);
            expect(highlights[0].textContent).toBe('T');
            expect(highlights[1].textContent).toBe('s');
            expect(collection.getAggregatedHighlightsCount()).toEqual({ yellow: 2 });
            expect(selection.isCollapsed).toBe(true);
            expect(outerOnUpdatedSpy).toHaveBeenCalled();
            expect(innerOnUpdatedSpy).not.toHaveBeenCalled();
        });

        it('all.clearHighlights: removes all highlights', () => {
            expect(collection.getAggregatedHighlightsCount()).toEqual({});

            // Highlight .qti-item > "This is"
            let range = selectRange();
            range.setStart(itemContainer.childNodes[1].childNodes[0], 0);
            range.setEnd(itemContainer.childNodes[1].childNodes[0], 7);
            collection.all.highlightSelection('blue');

            vi.advanceTimersByTime(1); // itemHighlighter.discardSelection

            // Highlight .qti-include > "Je suis le contenu"
            range = selectRange();
            range.setStart(passageContainer.childNodes[0], 0);
            range.setEnd(passageContainer.childNodes[0], 18);
            collection.all.highlightSelection('pink');

            vi.advanceTimersByTime(1); // itemHighlighter.discardSelection

            // Highlight .qti-include > "item content"
            range = selectRange();
            range.setStart(itemContainer.childNodes[1].childNodes[1], 1);
            range.setEnd(itemContainer.childNodes[1].childNodes[1], 13);
            collection.all.highlightSelection('yellow');

            vi.advanceTimersByTime(1); // itemHighlighter.discardSelection

            expect(getHighlights().length).toBe(3);
            expect(collection.getAggregatedHighlightsCount()).toEqual({ yellow: 1, blue: 1, pink: 1 });
            outerOnUpdatedSpy.mockClear();
            innerOnUpdatedSpy.mockClear();

            collection.all.clearHighlights();

            expect(getHighlights().length).toBe(0);
            expect(collection.getAggregatedHighlightsCount()).toEqual({});
            expect(outerOnUpdatedSpy).toHaveBeenCalled();
            expect(innerOnUpdatedSpy).toHaveBeenCalled();
        });
    });
});
