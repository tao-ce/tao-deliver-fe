// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { makeHighlightNodesAccessible, applyAdjacentHighlightNodeStyles } from '../commentStyles.js';

// prettier-ignore (whitespace is significant for test!)
const html = `
<div id="fixture">
    <p>This is
        <span class="tao-comment-txt" data-color="tao--foo123">some</span>
        text.
    </p>
    <p>This is
        <span cclass="tao-comment-txt" data-color="tao--bar456">some</span> <span class="tao-comment-txt" data-color="tao--bar456">more-</span><span class="tao-comment-txt" data-color="tao--bar456">great</span>
        text.
    </p>
</div>
<div id="ignore">
    <span class="tao-comment-txt" data-color="tao--qux789">Ignore this text.</span>
</div>`;

beforeAll(() => {
    document.body.innerHTML = html;
});

describe('makeHighlightNodesAccessible', () => {
    it('adds accessibility attributes to expected nodes', () => {
        const nodes = [...document.querySelector('#fixture').querySelectorAll('.tao-comment-txt')];
        makeHighlightNodesAccessible(nodes, node => node.dataset.color);
        expect(document.body).toMatchSnapshot();
    });
});

describe('applyAdjacentHighlightNodeStyles', () => {
    it('adds sibling class to 1 node', () => {
        const nodes = [...document.querySelector('#fixture').querySelectorAll('.tao-comment-txt')];
        applyAdjacentHighlightNodeStyles(nodes);
        expect(document.querySelectorAll('span.sibling').length).toBe(1);
        expect(document.querySelector('span.sibling').textContent).toBe('great');
    });
});
