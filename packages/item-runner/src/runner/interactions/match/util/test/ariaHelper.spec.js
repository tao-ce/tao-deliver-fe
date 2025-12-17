// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-21 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Tests the functionality of the API of the MatchChoicesManager
 */
import AriaHelperFactory from '../ariaHelper.js';

describe('AriaHelper API', () => {
    it('has expected API', () => {
        const ariaHelper = new AriaHelperFactory([]);

        expect(typeof ariaHelper.setAriaLiveContainer).toEqual('function');
        expect(typeof ariaHelper.announce).toEqual('function');
        expect(typeof ariaHelper.announceAddPair).toEqual('function');
        expect(typeof ariaHelper.announceRemovePair).toEqual('function');
        expect(typeof ariaHelper.announceReturned).toEqual('function');
        expect(typeof ariaHelper.announceCancelled).toEqual('function');
        expect(typeof ariaHelper.announceAnswerAreaFull).toEqual('function');
        expect(typeof ariaHelper.getUnusedChoicesAriaLabel).toEqual('function');
        expect(typeof ariaHelper.getBucketAriaLabel).toEqual('function');
        expect(typeof ariaHelper.getUnusedChoiceAriaLabel).toEqual('function');
        expect(typeof ariaHelper.getPlacedChoiceAriaLabel).toEqual('function');
        expect(typeof ariaHelper.getRemoveChoiceAriaLabel).toEqual('function');
    });
});

describe('AriaHelper', () => {
    let ariaHelper;
    const choiceX = {
        key: 'x1',
        plainText: 'foo',
        position: 1
    };
    const choiceY = {
        key: 'y1',
        plainText: 'bar',
        position: 3
    };

    beforeEach(() => {
        const el = document.createElement('p');
        el.innerHTML = `
            <span aria-live="assertive"></span>
            <span aria-live="polite"></span>`;
        document.body.appendChild(el);
        ariaHelper = AriaHelperFactory([[choiceX], [choiceY]]);
        ariaHelper.setAriaLiveContainer(el);
    });
    afterEach(() => {
        document.body.innerHTML = '';
        ariaHelper = null;
    });

    describe('announce* methods', () => {
        it('announce: assertive', () => {
            const span = document.querySelector('[aria-live="assertive"]');
            expect(span).toBeEmptyDOMElement();
            const str = 'foo bar baz!';
            ariaHelper.announce(str, true);
            expect(span).toHaveTextContent(str);
        });

        it('announce: polite', () => {
            const span = document.querySelector('[aria-live="polite"]');
            expect(span).toBeEmptyDOMElement();
            const str = 'foo bar please';
            ariaHelper.announce(str);
            expect(span).toHaveTextContent(str);
        });

        it('announceAddPair', () => {
            const span = document.querySelector('[aria-live="assertive"]');
            expect(span).toBeEmptyDOMElement();
            ariaHelper.announceAddPair('x1', 'y1');
            expect(span).toHaveTextContent('foo has been placed in bar (group 3).');
        });

        it('announceRemovePair', () => {
            const span = document.querySelector('[aria-live="assertive"]');
            expect(span).toBeEmptyDOMElement();
            ariaHelper.announceRemovePair('x1', 'y1');
            expect(span).toHaveTextContent('foo has been removed from bar.');
        });

        it('announceReturned', () => {
            const span = document.querySelector('[aria-live="assertive"]');
            expect(span).toBeEmptyDOMElement();
            ariaHelper.announceReturned('x1');
            expect(span).toHaveTextContent('foo has been returned to the available options.');
        });

        it('announceCancelled', () => {
            const span = document.querySelector('[aria-live="assertive"]');
            expect(span).toBeEmptyDOMElement();
            ariaHelper.announceCancelled('x1');
            expect(span).toHaveTextContent('foo has not been placed.');
        });

        it('announceAnswerAreaFull', () => {
            const span = document.querySelector('[aria-live="assertive"]');
            expect(span).toBeEmptyDOMElement();
            ariaHelper.announceAnswerAreaFull();
            expect(span).toHaveTextContent('Answer area is full. To move to the answer area press tab.');
        });
    });

    describe('get* methods', () => {
        it('getUnusedChoicesAriaLabel', () => {
            expect(ariaHelper.getUnusedChoicesAriaLabel()).toBe('List available options.');
        });

        it('getBucketAriaLabel', () => {
            expect(ariaHelper.getBucketAriaLabel(choiceY)).toBe(
                'bar. group 3. Press enter or space to place down. To browse other groups use the arrow keys. Press escape to cancel.'
            );
        });

        it('getUnusedChoiceAriaLabel', () => {
            const listPos = 2;
            const listSize = 3;
            const stackSize = 4;
            expect(ariaHelper.getUnusedChoiceAriaLabel(listPos, listSize, stackSize)).toBe(
                'option 2 of 3. Button draggable. available 4 times. List available options. Press enter or space to grab and browse the answer area. To move to next available option, use the arrow keys.'
            );

            const stackSizeInfinite = -1;
            expect(ariaHelper.getUnusedChoiceAriaLabel(listPos, listSize, stackSizeInfinite)).toBe(
                'option 2 of 3. Button draggable.  List available options. Press enter or space to grab and browse the answer area. To move to next available option, use the arrow keys.'
            );
        });

        it('getPlacedChoiceAriaLabel', () => {
            expect(ariaHelper.getPlacedChoiceAriaLabel(choiceY)).toBe(
                'grouped in bar. Button draggable. Press enter or space to grab. To move to next available option, use the arrow keys.'
            );
        });

        it('getRemoveChoiceAriaLabel', () => {
            expect(ariaHelper.getRemoveChoiceAriaLabel(choiceX)).toBe('Return foo to the available options.');
        });
    });
});
