// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

vi.mock('../stylesheets.js', async () => {
    const originalModule = await vi.importActual('../stylesheets.js');
    const scopeStyles = vi.fn().mockImplementation(css => {
        if (css && css[0] && css[0].cssText) {
            return Array.from(css)
                .map(r => r.cssText)
                .join('\n');
        } else {
            return css;
        }
    });
    scopeStyles._orignal_scopeStyles = originalModule.scopeStyles;
    return Object.assign({ __esModule: true }, originalModule, {
        scopeStyles
    });
});

vi.mock('@oat-sa-private/ui-core', () => ({
    getDefaultRemSizePx: () => 8 // override 16 from global mock
}));

import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import StylesheetsLoader from '../StylesheetsLoader.svelte';
import { cloneDeep } from 'lodash';
import { scopeStyles } from '../stylesheets.js';

const mockAssetManager = {
    resolve: url => url
};

function buildStyleSheet(rules) {
    const stylesheet = new CSSStyleSheet();
    for (const rule of rules) {
        stylesheet.insertRule(rule, stylesheet.cssRules.length); // insert at end, not beginning
    }
    return stylesheet;
}

describe('StylesheetsLoader', () => {
    afterEach(() => {
        scopeStyles.mockClear();
    });

    // For now, content of external resources such as these (accessed via <link href=""> tags) can't be mocked
    const hrefStylesheets = [{ href: 'style1.css', scope: '.scope-me' }, { href: 'style2.css' }];
    // These values are also not true CSSRuleLists, but will pass through the local `scopeStyles` mock unchanged
    const noHrefStylesheets = [
        { cssRules: ['p { color: red; font-size: 8px; }', 'div { color: blue; padding: 16px; }'] },
        { cssRules: 'span { background: green; }' }
    ];

    it('renders nothing when no stylesheets', () => {
        const { container } = render(StylesheetsLoader, {
            props: {}
        });
        expect(document.head).toMatchSnapshot();
        expect(container).toMatchSnapshot();
    });

    it('renders link tags into head, and removes them after loading', () => {
        render(StylesheetsLoader, {
            props: {
                stylesheets: cloneDeep(hrefStylesheets),
                assetManager: mockAssetManager
            }
        });
        const links = Array.from(document.querySelectorAll('head > link'));
        expect(links.length).toBe(2);
        expect(document.head).toMatchSnapshot();

        fireEvent.load(links[0]);

        return tick().then(() => {
            expect(document.querySelectorAll('head > link').length).toBe(1);
            expect(document.head).toMatchSnapshot();
        });
    });

    it('renders style tags in component after loading', () => {
        const { container } = render(StylesheetsLoader, {
            props: {
                stylesheets: cloneDeep(hrefStylesheets),
                assetManager: mockAssetManager
            }
        });
        const links = Array.from(document.querySelectorAll('head > link'));
        expect(links.length).toBe(2);

        fireEvent.load(links[0]);
        fireEvent.load(links[1]);

        return tick().then(() => {
            // Rendered style tags will be empty; did not find a way to mock the content through fireEvent or file mocks
            expect(container.querySelectorAll('style').length).toBe(2);
            expect(container).toMatchSnapshot();
        });
    });

    test.each([
        ['load', 'load'],
        ['load', 'error'],
        ['error', 'error']
    ])('fires complete when resource requests done (%s %s)', (ev1, ev2) => {
        const { component } = render(StylesheetsLoader, {
            props: {
                stylesheets: cloneDeep(hrefStylesheets),
                assetManager: mockAssetManager
            }
        });
        const onComplete = vi.fn();
        component.$on('complete', onComplete);

        const links = Array.from(document.querySelectorAll('head > link'));
        fireEvent[ev1](links[0]);
        fireEvent[ev2](links[1]);

        return tick().then(() => {
            expect(onComplete).toBeCalledTimes(1);
        });
    });

    it('renders style tags for stylesheets without hrefs', () => {
        const { container } = render(StylesheetsLoader, {
            props: {
                stylesheets: cloneDeep(noHrefStylesheets),
                assetManager: mockAssetManager
            }
        });
        expect(document.querySelectorAll('head > link').length).toBe(0);

        return tick().then(() => {
            expect(container.querySelectorAll('style').length).toBe(2);
            expect(container).toMatchSnapshot();
        });
    });

    it('applies convertPxToRem options (all cssProperties)', () => {
        const { container } = render(StylesheetsLoader, {
            props: {
                stylesheets: [buildStyleSheet(noHrefStylesheets[0].cssRules)],
                convertPxToRemOptions: { enabled: true },
                assetManager: mockAssetManager
            }
        });
        return tick().then(() => {
            const rule1 = container.querySelector('style');
            expect(rule1.sheet.cssRules[0].cssText).toBe('p {color: red; font-size: 1rem;}');
            expect(rule1.sheet.cssRules[1].cssText).toBe('div {color: blue; padding: 2rem;}');
        });
    });

    it('applies convertPxToRem options (specified cssProperties)', () => {
        const { container } = render(StylesheetsLoader, {
            props: {
                stylesheets: [buildStyleSheet(noHrefStylesheets[0].cssRules)],
                convertPxToRemOptions: { enabled: true, cssProperties: ['font-size'] },
                assetManager: mockAssetManager
            }
        });
        return tick().then(() => {
            const rule1 = container.querySelector('style');
            expect(rule1.sheet.cssRules[0].cssText).toBe('p {color: red; font-size: 1rem;}');
            expect(rule1.sheet.cssRules[1].cssText).toBe('div {color: blue; padding: 16px;}');
        });
    });

    it('applies style-editor theme if defined, and applies covertPxToRem to it', () => {
        const itemScopeSelector = '.qti-item[data-item-id="item13"]';
        scopeStyles.mockImplementationOnce(scopeStyles._orignal_scopeStyles);
        const { container } = render(StylesheetsLoader, {
            props: {
                stylesheets: [
                    buildStyleSheet(['.qti-item {--styleeditor-font-size: 24px;} body div.qti-item {font-size: 24px;}'])
                ],
                convertPxToRemOptions: { enabled: true, cssProperties: ['font-size'] },
                assetManager: mockAssetManager,
                itemScopeSelector
            }
        });
        return tick().then(() => {
            const rule1 = container.querySelector('style');
            const cssText = [...rule1.sheet.cssRules].map(i => i.cssText).join('\n');
            expect(cssText).toMatchSnapshot();
        });
    });

    it('passes itemScopeSelector prop through to scopeStyles', () => {
        const itemScopeSelector = '.qti-item[data-item-id="item13"]';

        const { container } = render(StylesheetsLoader, {
            props: {
                stylesheets: cloneDeep(noHrefStylesheets),
                assetManager: mockAssetManager,
                itemScopeSelector
            }
        });
        expect(document.querySelectorAll('head > link').length).toBe(0);

        return tick().then(() => {
            expect(container.querySelectorAll('style').length).toBe(2);
            expect(scopeStyles).toBeCalledTimes(2);
            expect(scopeStyles.mock.calls[0][1]).toBe(itemScopeSelector);
            expect(scopeStyles.mock.calls[1][1]).toBe(itemScopeSelector);
        });
    });
});
