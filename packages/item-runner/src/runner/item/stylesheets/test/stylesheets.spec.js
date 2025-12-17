// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
vi.mock('@oat-sa-private/ui-core', () => ({
    getDefaultRemSizePx: () => 8 // override 16 from global mock
}));

import { scopeStyles, convertPxToRem } from '../stylesheets.js';

function buildStyleSheet(rules) {
    const stylesheet = new CSSStyleSheet();
    for (const rule of rules) {
        stylesheet.insertRule(rule, stylesheet.cssRules.length); // insert at end, not beginning
    }
    return stylesheet;
}

describe('scopeStyles', () => {
    const basicRule = '#blanc {color: white;}';
    const multiRule = '#rouge,#bleu {color: purple;}';
    const htmlSelectorRule = 'html {color: teal;}';
    const bodySelectorRule = 'body {color: teal;}';
    const htmlBodySelectorRule = 'html body div {text-align: center;}';
    const atImportRule = '@import somefile.css;';
    const atKeyframesRule = '@keyframes fadeIn {from{opacity: 0;} to{opacity: 1;}}';
    const atMediaSimpleRule = '@media print { div { color: green; } }';
    const atMediaComplexRule = '@media all and (max-width: 1000px){div{color:green;}p *{background:black;}}';
    const starRule = '* {background: black;}';
    const nestedStarRule = 'p * {background: black;}';
    const colonRule = '::selection {outline-color: yellow;}';

    it('returns empty string for missing cssRules', () => {
        expect(scopeStyles()).toBe('');
    });

    it('omits @ rules except @media', () => {
        const { cssRules } = buildStyleSheet([atImportRule, atKeyframesRule]);
        expect(scopeStyles(cssRules)).toBe('');
    });

    it('omits * selector', () => {
        const { cssRules } = buildStyleSheet([starRule]);
        expect(scopeStyles(cssRules)).toBe('');
    });

    it('omits html & body selectors', () => {
        const { cssRules } = buildStyleSheet([htmlSelectorRule, bodySelectorRule]);
        expect(scopeStyles(cssRules)).toBe('');
    });

    it('returns unchanged html body selector', () => {
        const { cssRules } = buildStyleSheet([htmlBodySelectorRule]);
        expect(scopeStyles(cssRules)).toBe(htmlBodySelectorRule);
    });

    it('returns unchanged basic selector', () => {
        const { cssRules } = buildStyleSheet([basicRule]);
        expect(scopeStyles(cssRules)).toBe(basicRule);
    });

    it('returns unchanged multi selector', () => {
        const { cssRules } = buildStyleSheet([multiRule]);
        expect(scopeStyles(cssRules)).toBe(multiRule);
    });

    it('returns unchanged multiple rules', () => {
        const { cssRules } = buildStyleSheet([basicRule, multiRule]);
        expect(scopeStyles(cssRules)).toBe(`${basicRule}\n${multiRule}`);
    });

    it('returns scoped basic selector', () => {
        const { cssRules } = buildStyleSheet([basicRule]);
        const scopeSelector = '.qti-item';
        expect(scopeStyles(cssRules, scopeSelector)).toBe(`.qti-item ${basicRule}`);
    });

    it('returns scoped multiple rules', () => {
        const { cssRules } = buildStyleSheet([basicRule, multiRule]);
        const scopeSelector = '.qti-item';
        expect(scopeStyles(cssRules, scopeSelector)).toBe(
            '.qti-item #blanc {color: white;}\n.qti-item #rouge,.qti-item #bleu {color: purple;}'
        );
    });

    it('returns scoped nested * rule', () => {
        const { cssRules } = buildStyleSheet([nestedStarRule]);
        const scopeSelector = '.qti-item';
        expect(scopeStyles(cssRules, scopeSelector)).toBe(`.qti-item ${nestedStarRule}`);
    });

    it('returns scoped :: rule', () => {
        const { cssRules } = buildStyleSheet([colonRule]);
        const scopeSelector = '.qti-item';
        expect(scopeStyles(cssRules, scopeSelector)).toBe(`.qti-item ${colonRule}`);
    });

    it('returns @media with scoped basic selector', () => {
        const { cssRules } = buildStyleSheet([atMediaSimpleRule]);
        const scopeSelector = '.qti-item';
        expect(scopeStyles(cssRules, scopeSelector)).toBe(`@media print {.qti-item div {color: green;}}`);
    });

    it('returns @media with scoped multiple rules', () => {
        const { cssRules } = buildStyleSheet([atMediaComplexRule, basicRule]);
        const scopeSelector = '.qti-item';
        expect(scopeStyles(cssRules, scopeSelector)).toBe(
            '@media all and (max-width: 1000px) {.qti-item div {color: green;} .qti-item p * {background: black;}}\n.qti-item #blanc {color: white;}'
        );
    });

    it('replaces the toReplace selectors by the scopeSelector, and also scopes', () => {
        const { cssRules } = buildStyleSheet([
            'ul.replace1 li a {color: green;}',
            'section div.replace2 {color: purple;}',
            '.replace3a > p {color: beige;}',
            'p > b {opacity: 1}'
        ]);
        const scopeSelector = '.qti-item';
        const toReplace = ['.replace1', 'div.replace2', '.replace3a'];
        expect(scopeStyles(cssRules, scopeSelector, toReplace)).toBe(
            'ul.qti-item li a {color: green;}\n' +
                'section .qti-item {color: purple;}\n' +
                '.qti-item > p {color: beige;}\n' +
                '.qti-item p > b {opacity: 1;}'
        );
    });

    it('replaces the toReplace selectors by the replacementSelector, and also scopes', () => {
        const { cssRules } = buildStyleSheet([
            'ul.replace1 li a {color: green;}',
            'section div.replace2 {color: purple;}',
            '.replace3a > p {color: beige;}',
            'p > b {opacity: 1}'
        ]);
        const scopeSelector = '.qti-item';
        const toReplace = ['.replace1', 'div.replace2', '.replace3a'];
        const replacementSelector = '.my-class';
        expect(scopeStyles(cssRules, scopeSelector, toReplace, replacementSelector)).toBe(
            '.qti-item ul.my-class li a {color: green;}\n' +
                '.qti-item section .my-class {color: purple;}\n' +
                '.qti-item .my-class > p {color: beige;}\n' +
                '.qti-item p > b {opacity: 1;}'
        );
    });

    it('replaces the toReplace selectors by the scopeSelector while preserving [data-attr], and also scopes', () => {
        const { cssRules } = buildStyleSheet([
            '.qti-item {color: pink}',
            '.qti-item p > b {opacity: 1}',
            'body div.qti-item aside {border-color: red;}'
        ]);
        const scopeSelector = '.qti-item[data-item-id="item-13"]';
        const toReplace = ['body div.qti-item', '.qti-item'];
        expect(scopeStyles(cssRules, scopeSelector, toReplace, void 0)).toBe(
            '.qti-item[data-item-id="item-13"] {color: pink;}\n' +
                '.qti-item[data-item-id="item-13"] p > b {opacity: 1;}\n' +
                '.qti-item[data-item-id="item-13"] aside {border-color: red;}'
        );
    });
});

describe('convertPxToRem', () => {
    const cssRulesToString = cssRules => cssRules.map(rule => rule.cssText).join('\n');

    //media too!!!

    const sampleRules = [
        `body div.qti-item .grid-row p:first-child {
            font-size: 12px !important;
            --hello-world300px: 300px;
            width: var(--hello-world300px);
            height: calc(10.5px + 3rem + var(--hello-world300px));
            border: calc(-250 * -0.52px) solid #aabbcc !important;
            background-color: orange;
        }`,
        `body div.qti-item * {
            font-family: 'Tahoma', sans-serif !important;
            font-size: 24px;
            border: 1px solid #aabbcc !important;
            top: -1.5rem !important;
            bottom: -1rem;
            left: -1.5px !important;
            right: -1px;
        }`,
        `.elem-1 {
            font-size: var(--8pxvariable);
            border: calc(2 * 30.85rem) solid var(--20px) !important;
            margin: 2em 4px 345rem 320px !important;
        }`,
        `.elem-2 {
            font-size: calc(1em - 8px);
        }`,
        `
        @media screen and (max-width: 1000px) {
            p * {
                font-size: calc(2*10px);
                box-shadow: -16px 11px 8px 9px green;
            }
            .elem-2 {
                box-shadow: -16px -11px 8px 9px green;
            }
        }
        `
    ];

    it('does nothing if empty cssRules', () => {
        expect(() => convertPxToRem()).not.toThrow();
    });

    it('updates specified properties', () => {
        const { cssRules } = buildStyleSheet(sampleRules);
        convertPxToRem(cssRules, ['font-size']);
        expect(cssRulesToString(cssRules)).toMatchSnapshot();
    });

    it('updates all properties, if no specified', () => {
        const { cssRules } = buildStyleSheet(sampleRules);
        convertPxToRem(cssRules);
        expect(cssRulesToString(cssRules)).toMatchSnapshot();
    });
});
