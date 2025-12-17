// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2024 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { getDefaultRemSizePx } from '@oat-sa-private/ui-core';

/**
 * Stylesheets loader
 */

/**
 * @typedef {string} ScopedStyles - styles which was wrapped in scopeSelector
 */

/**
 * Replace 'px' units with 'rem' units,
 * to support page-zoom feature of `a11y` plugin (zoom works by changing `rem` definition).
 * Mutates rules in original CSSRuleList
 * @param {CSSRuleList} cssRules
 * @param {String[]?} cssProperties - `["font-size"]`, for example. If undefined, all css properties will be converted
 */
export function convertPxToRem(cssRules, cssProperties) {
    if (!cssRules) {
        return;
    }

    const defaultRemInPx = getDefaultRemSizePx();
    const regex = /([^a-zA-Z0-9._])([0-9.]+)(px)/g;
    const convertFontSize = !cssProperties || cssProperties.some(c => c === 'font-size');

    Object.values(cssRules)
        .flatMap(rule => {
            if (rule.media) {
                return Object.values(rule.cssRules || []);
            }
            return rule;
        })
        .forEach(rule => {
            const style = rule.style;
            for (let i = 0; i < style.length; i++) {
                const propertyName = style[i];
                if (!cssProperties || cssProperties.includes(propertyName) || (convertFontSize && propertyName.startsWith('--fontsize-'))) {
                    const value = style.getPropertyValue(propertyName);
                    if (value && value.includes('px')) {
                        const paddedValue = ` ${value} `;
                        const newValue = paddedValue
                            .replaceAll(
                                regex,
                                //eslint-disable-next-line no-unused-vars
                                (match, prevSymbol, pxValueStr, pxUnitStr, index) => {
                                    if (prevSymbol === '-' && paddedValue[index - 1] === '-') {
                                        return match; //edge case: `var(--20px)`
                                    }
                                    const remValue = parseFloat(pxValueStr) / defaultRemInPx;
                                    return `${prevSymbol}${remValue}rem`;
                                }
                            )
                            .trim();
                        const priority = style.getPropertyPriority(propertyName);
                        style.setProperty(propertyName, newValue, priority);
                    }
                }
            }
        });
}

/**
 * Apply selector replacement and scope prefixing to a set of style rules
 * @param {CSSRuleList} cssRules
 * @param {String} scopeSelector - applied as prefix; also used as replacementSelector if none specified
 * @param {String[]} toReplace - list of selectors to be replaced by replacementSelector
 * @param {String} replacementSelector
 * @returns {String} styles, with scopeSelector prefix applied
 */
export function scopeStyles(cssRules, scopeSelector, toReplace, replacementSelector) {
    if (!cssRules) {
        return '';
    }

    if (!replacementSelector) {
        replacementSelector = scopeSelector;
    }

    const scopedStyles = Object.values(cssRules).map(rule => {
        // avoid @import, @keyframes etc
        if (!rule.selectorText && !rule.media) {
            return '';
        }

        const rulesToScope = rule.media ? Object.values(rule.cssRules || []) : [rule];
        const scopedCssTexts = rulesToScope.map(ruleToScope =>
            scopeSingleRule(ruleToScope, scopeSelector, toReplace, replacementSelector)
        );
        const scopedCssText = scopedCssTexts.join(' ');

        if (!scopedCssText) {
            return '';
        } else if (rule.media) {
            return `@media ${rule.media.mediaText} {${scopedCssText}}`;
        } else {
            return scopedCssText;
        }
    });

    return scopedStyles.filter(str => str.length > 0).join('\n');
}

/**
 * @param {CSSRule} ruleToScope
 * @param {String} scopeSelector - applied as prefix; also used as replacementSelector if none specified
 * @param {String[]} toReplace - list of selectors to be replaced by replacementSelector
 * @param {String?} [replacementSelector] - omit, to use scopeSelector as the replacementSelector
 * @returns {String} styles, with scopeSelector prefix applied
 */
export function scopeSingleRule(ruleToScope, scopeSelector, toReplace, replacementSelector) {
    /**
     * Need to split selectorList apart from rules, before splitting it by comma
     * @example CSS:
     *   selector1, selector2 { rules; }
     */
    const rulesInBrackets = ruleToScope.cssText.substring(ruleToScope.selectorText.length).trim();
    const selectors = ruleToScope.selectorText.split(/\s*,\s*/);

    const scopedSelectors = [];

    for (let singleSelectorText of selectors) {
        // avoid the most obvious top level single selectors that won't work even if scoped
        if (['html', 'body', '*'].includes(singleSelectorText)) {
            continue;
        }

        // make the replacements
        if (scopeSelector && toReplace) {
            for (let toReplaceSelector of toReplace) {
                if (singleSelectorText.includes(toReplaceSelector)) {
                    singleSelectorText = singleSelectorText.replace(
                        new RegExp(toReplaceSelector, 'ig'),
                        replacementSelector
                    );
                    break; // break after first round of replacements because of risk of next `toReplaceSelector` partially matching an earlier one
                }
            }
        }

        // has desired scoping been applied to the rule?
        const containsScopeSelector =
            singleSelectorText.includes(`${scopeSelector} `) ||
            singleSelectorText.startsWith(scopeSelector) ||
            singleSelectorText.endsWith(scopeSelector);

        // scope unscoped rule by the scope selector
        if (scopeSelector && !containsScopeSelector) {
            scopedSelectors.push(`${scopeSelector} ${singleSelectorText}`);
        } else {
            scopedSelectors.push(singleSelectorText);
        }
    }

    if (scopedSelectors.length) {
        return `${scopedSelectors.join(',')} ${rulesInBrackets}`;
    }
    return '';
}
