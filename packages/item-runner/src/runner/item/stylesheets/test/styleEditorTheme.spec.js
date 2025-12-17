// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { applyStyleEditorTheme } from '../styleEditorTheme.js';
import styleEditorCss from './styleEditorCss.js';

function buildStyleSheet(rules) {
    const stylesheet = new CSSStyleSheet();
    for (const rule of rules) {
        stylesheet.insertRule(rule, stylesheet.cssRules.length); // insert at end, not beginning
    }
    return stylesheet;
}

function buildStyleSheetFromString(str) {
    const rules = str
        .split('}')
        .filter(i => !!i.replaceAll('\n', '').replaceAll(' ', ''))
        .map(i => `${i}}`);
    return buildStyleSheet(rules);
}

function cssRulesToString(cssRules) {
    return cssRules.map(rule => rule.cssText).join('\n');
}

it('sets css vars derived from style-editor theme, keeps other styles', () => {
    const { cssRules } = buildStyleSheetFromString(styleEditorCss);
    const newRules = applyStyleEditorTheme(cssRules);
    expect(cssRulesToString(newRules)).toMatchSnapshot();
});

it('sets css vars if only some theme properties are defined', () => {
    let cssRules = buildStyleSheetFromString('.qti-item {--styleeditor-table-heading-bg-color: #98fb9e;}').cssRules;
    let newRules = applyStyleEditorTheme(cssRules);
    expect(cssRulesToString(newRules)).toMatchSnapshot();

    cssRules = buildStyleSheetFromString(
        '.qti-item {--styleeditor-font-size: 24px;} body div.qti-item {font-size: 24px;}'
    ).cssRules;
    newRules = applyStyleEditorTheme(cssRules);
    expect(cssRulesToString(newRules)).toMatchSnapshot();
});

it('returns nothing if it is not the style-editor css', () => {
    let { cssRules } = buildStyleSheetFromString('.qti-item {--othereditor-table-heading-bg-color: #98fb9e;}').cssRules;
    let newRules = applyStyleEditorTheme(cssRules);
    expect(newRules).toBeFalsy();

    cssRules = buildStyleSheetFromString('body div.qti-item {font-size: 24px;}').cssRules;
    newRules = applyStyleEditorTheme(cssRules);
    expect(newRules).toBeFalsy();
});
