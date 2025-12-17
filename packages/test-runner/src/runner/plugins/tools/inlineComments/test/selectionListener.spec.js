// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { selectionListenerFactory } from '../selectionListener.js';
import { fireEvent } from '@testing-library/svelte';

describe('selectionListenerFactory', () => {
    const selection = window.getSelection();

    function selectRange(setRangeContent = () => {}) {
        const range = document.createRange();
        setRangeContent(range);
        selection.addRange(range);
        fireEvent(
            document,
            new Event('selectionchange', {
                bubbles: false,
                cancelable: false
            })
        );
        return range;
    }
    function discardSelection() {
        selection.removeAllRanges();
        fireEvent(
            document,
            new Event('selectionchange', {
                bubbles: false,
                cancelable: false
            })
        );
    }

    beforeAll(() => {
        //jsdom doesn't implement this?
        vi.spyOn(selection, 'containsNode').mockImplementation((node, partial) => {
            for (let i = 0; i < selection.rangeCount; i++) {
                const range = selection.getRangeAt(i);
                //'partial' must be set to 'true'. Check it here to validate that
                if (partial && range.isPointInRange(node, 0)) {
                    return true;
                }
            }
            return false;
        });
    });

    beforeEach(() => {
        document.body.innerHTML = `
        <div class="container">
            <div class="qti-item">
                <div class="qti-extendedTextInteraction" data-response-id="respA">
                    <div class="text-container txt-A">
                        <p>first essay</p>
                        <p>
                            <span class="good-span">first sentence</span>
                            <span class="tao-comment-txt">blacklisted</span>
                            first postscriptum
                        </p>
                    </div>
                    <div class="not-content">
                        this is not interaction content
                    </div>
                </div>
                <div class="not-interaction">
                    this is not interaction
                </div>
                <div class="qti-extendedTextInteraction" data-response-id="respB">
                    <div class="text-container txt-B">
                        <p>second composition</p>
                    </div>
                </div>
            </div>
        </div>`;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('exposes API', () => {
        const f = selectionListenerFactory({
            responseIds: [],
            onSelectedCallback: () => {},
            onClearedCallback: () => {}
        });
        expect(f).toBeTypeOf('object');
        expect(f.attach).toBeTypeOf('function');
        expect(f.detach).toBeTypeOf('function');
    });

    it('when text in container is selected, invokes callbacks', () => {
        const onSelectedCallback = vi.fn();
        const onClearedCallback = vi.fn();
        const f = selectionListenerFactory({
            responseIds: ['respA', 'respB'],
            onSelectedCallback,
            onClearedCallback
        });
        f.attach();

        const txtAEl = document.querySelector('.txt-A');
        const pEl = txtAEl.querySelector('p');

        selectRange(r => r.selectNodeContents(pEl));
        expect(onSelectedCallback).not.toHaveBeenCalled();

        fireEvent.mouseUp(pEl);
        expect(onSelectedCallback).toHaveBeenCalled();
        expect(onSelectedCallback.mock.calls[0][1]).toBe(txtAEl);
        expect(onSelectedCallback.mock.calls[0][0]).toHaveLength(1);
        expect(onSelectedCallback.mock.calls[0][0][0]).toEqual(expect.any(Range));
        expect(onSelectedCallback.mock.calls[0][0][0].toString()).toBe('first essay');
        onSelectedCallback.mockClear();
        expect(onClearedCallback).not.toHaveBeenCalled();

        discardSelection();
        expect(onClearedCallback).toHaveBeenCalled();
        expect(onSelectedCallback).not.toHaveBeenCalled();
        f.detach();
    });

    it('attach/detach listeners', () => {
        const onSelectedCallback = vi.fn();
        const onClearedCallback = vi.fn();
        const f = selectionListenerFactory({
            responseIds: ['respA', 'respB'],
            onSelectedCallback,
            onClearedCallback
        });

        const txtAEl = document.querySelector('.txt-A');
        const pEl = txtAEl.querySelector('p');

        //doesn't listen before attach
        selectRange(r => r.selectNodeContents(pEl));
        fireEvent.mouseUp(pEl);
        expect(onSelectedCallback).not.toHaveBeenCalled();
        discardSelection();
        expect(onClearedCallback).not.toHaveBeenCalled();

        f.attach();

        selectRange(r => r.selectNodeContents(pEl));
        fireEvent.mouseUp(pEl);
        expect(onSelectedCallback).toHaveBeenCalled();
        discardSelection();
        expect(onClearedCallback).toHaveBeenCalled();
        onSelectedCallback.mockClear();
        onClearedCallback.mockClear();

        f.detach();

        //doesn't listen after detach
        selectRange(r => r.selectNodeContents(pEl));
        fireEvent.mouseUp(pEl);
        expect(onSelectedCallback).not.toHaveBeenCalled();
        expect(onClearedCallback).not.toHaveBeenCalled();
        discardSelection();
    });

    it('ignores selection if outside, or blacklisted, or whitespace', () => {
        const onSelectedCallback = vi.fn();
        const onClearedCallback = vi.fn();
        const f = selectionListenerFactory({
            responseIds: ['respA', 'respB'],
            onSelectedCallback,
            onClearedCallback
        });
        f.attach();

        const txtAEl = document.querySelector('.txt-A');
        const pEl = txtAEl.querySelector('p');

        //outside container (mouseup outside)
        selectRange(r => {
            r.setStart(document.querySelector('.txt-A p').firstChild, 'first'.length);
            r.setEnd(document.querySelector('.not-content').firstChild, 'this'.length);
        });
        fireEvent.mouseUp(document.querySelector('.not-content'));
        expect(onSelectedCallback).not.toHaveBeenCalled();
        discardSelection();

        //outside container (mouseup inside)
        selectRange(r => {
            r.setStart(document.querySelector('.txt-A p').firstChild, 'first'.length);
            r.setEnd(document.querySelector('.not-content').firstChild, 'this'.length);
        });
        fireEvent.mouseUp(pEl);
        expect(onSelectedCallback).not.toHaveBeenCalled();
        discardSelection();

        //blacklist
        selectRange(r => {
            r.setStart(document.querySelector('.txt-A p').firstChild, 'first'.length);
            r.setEnd(document.querySelector('.tao-comment-txt').firstChild, 'black'.length);
        });
        fireEvent.mouseUp(pEl);
        expect(onSelectedCallback).not.toHaveBeenCalled();
        discardSelection();

        //whitespace only
        selectRange(r => {
            r.setStart(document.querySelector('.txt-A p').firstChild, 'first'.length);
            r.setEnd(document.querySelector('.txt-A p').firstChild, 1);
        });
        fireEvent.mouseUp(pEl);
        expect(onSelectedCallback).not.toHaveBeenCalled();
        discardSelection();

        //normal (commonRangeAncestor is container itself)
        selectRange(r => {
            r.setStart(document.querySelector('.txt-A p').firstChild, 'first'.length);
            r.setEnd(document.querySelector('.txt-A .good-span').firstChild, 'first'.length);
        });
        fireEvent.mouseUp(pEl);
        expect(onSelectedCallback).toHaveBeenCalled();
        onSelectedCallback.mockClear();
        discardSelection();

        //normal (second container)
        selectRange(r => {
            r.selectNodeContents(document.querySelector('.txt-B p'));
        });
        fireEvent.mouseUp(document.querySelector('.txt-B p'));
        expect(onSelectedCallback).toHaveBeenCalled();
        onClearedCallback.mockClear();
        discardSelection();
        expect(onClearedCallback).toHaveBeenCalled();

        f.detach();
    });
});
