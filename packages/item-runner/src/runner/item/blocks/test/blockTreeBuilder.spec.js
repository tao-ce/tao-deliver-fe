// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import blockTreeBuilder, { isPlainText } from '../blockTreeBuilder.js';
import samples from '../../../../../samples';

describe('The blockTreeBuilder', () => {
    it('creates an empty tree', () => {
        const tree = blockTreeBuilder('');
        expect(tree).toEqual([]);
    });

    it('creates a single node tree', () => {
        const tree = blockTreeBuilder('<div>foo</div>');
        expect(tree).toMatchSnapshot();
    });

    it('creates a child nodes', () => {
        const tree = blockTreeBuilder('<div><span>foo</span></div>');
        expect(tree).toMatchSnapshot();
    });

    it('creates a block with a placeholder', () => {
        const tree = blockTreeBuilder('<div>{{foo_123_456}}</div>');
        expect(tree).toMatchSnapshot();
    });

    it('creates a block with seamless placeholders', () => {
        const tree = blockTreeBuilder(
            '<p>{{i5f60657dd24f6}}{{i5f60657dd2580}}{{i5f60657dd260c}}{{i5f60657dd2691}}{{i5f60657dd2715}}<br />{{i5f60657dd2797}}</p>'
        );
        expect(tree).toMatchSnapshot();
    });

    it('creates a block from a placeholder with props', () => {
        const tree = blockTreeBuilder(
            '<div id="best-foo" class="container feedback" data-foo="bar" role="foo">{{foo_123_456}}</div>'
        );
        expect(tree).toMatchSnapshot();
    });

    it('creates a block from a placeholder with text siblings', () => {
        const tree = blockTreeBuilder('<div>Lorem <p>Ipsum <span>{{foo_123_456}}</span> dolor sit.</p></div>');
        expect(tree).toMatchSnapshot();
    });

    it('creates blocks with  placeholder and text', () => {
        const tree = blockTreeBuilder('<div><div>foo</div><p>Before text{{foo_123_456}}After text</p></div>');
        expect(tree).toMatchSnapshot();
    });

    it('creates blocks from two roots', () => {
        const tree = blockTreeBuilder(
            `<div>This is a <em>static leaf</em>.</div>
            <div class="container">This is a branch <section>With an {{element_a765}} of <i>unit</i>.</section></div>`
        );
        expect(tree).toMatchSnapshot();
    });

    it('creates a container block from table, if table is root element', () => {
        const tree = blockTreeBuilder('<table><tbody><tr><td>foo</td><td>bar</td></tr></tbody></table>');
        expect(tree[0].type).toEqual('container');
        expect(tree).toMatchSnapshot();
    });

    it('fixes invalid HTML', () => {
        const tree = blockTreeBuilder('<div><b>invalid<p> tags</b></p></div>');
        expect(tree).toEqual([
            {
                type: 'html',
                content: '<div><b>invalid</b><p><b> tags</b></p></div>'
            }
        ]);
    });

    it('adds "target=_blank" to link, if link is inside html block', () => {
        const tree = blockTreeBuilder(
            '<div><p><a href="there.com">there</a></p><div><p><a href="here.com"><b>here</b></a></p></div></div>'
        );
        expect(tree).toMatchSnapshot();
    });

    it('adds "target=_blank" to link, if link is a root html block', () => {
        const tree = blockTreeBuilder('<a href="there.com"><span>here</span>and<b>there</b></a>');
        expect(tree).toMatchSnapshot();
    });

    it('does not need to add "target=_blank" to link, if link is a container block', () => {
        //because link will be rendered by own svelte component, which will add this attribute itself
        const tree = blockTreeBuilder('<div><p><a href="there.com">{{element_123}}</a></p></div>');
        expect(tree).toMatchSnapshot();
    });

    it('does not add "target=_blank" to link, if link points to element on page', () => {
        const tree = blockTreeBuilder(
            '<div><p><a href="#chapter1">chapter 1</a></p><div><p><a href="#"><b>top</b></a></p></div></div>'
        );
        expect(tree).toMatchSnapshot();
    });

    test.each([
        ['choice', samples.shuttle.itemData],
        ['choice and image', samples.zombieland.itemData],
        ['extendedText', samples.dagon.itemData],
        ['inlineText', samples.americaDiscovery.itemData],
        ['math', samples.equation.itemData]
    ])('creates blocks from %s item data', (itemType, compiledItem) => {
        const tree = blockTreeBuilder(compiledItem.itemData.data.body.body);

        expect(tree).toMatchSnapshot();
    });

    describe('isPlainText', () => {
        it('returns true for empty blockTree', () => {
            expect(isPlainText(null)).toEqual(true);
            expect(isPlainText([])).toEqual(true);
        });

        it('returns true for blockTree with text nodes only', () => {
            const tree = [
                { type: 'text', content: 'Abc' },
                { type: 'text', content: 'Def' }
            ];
            expect(isPlainText(tree)).toEqual(true);
        });

        it('returns false for blockTree with non-text nodes', () => {
            const tree = [
                { type: 'text', content: 'Abc' },
                { type: 'html', content: 'Def' }
            ];
            expect(isPlainText(tree)).toEqual(false);

            const tree2 = [{ type: 'element', children: [{ type: 'text', content: 'Abc' }] }];
            expect(isPlainText(tree2)).toEqual(false);
        });
    });
});
