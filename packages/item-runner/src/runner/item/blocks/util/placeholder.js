// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

const placeholderRegExp = /(\{\{[\w\-_.]+\}\})+?/;

/**
 * Check if there is an element placeholder in the input string
 * A placeholder is identified by {{element_id}}
 *
 * @param {String} inputString
 * @returns {Boolean} true if the input contains one or more placeholders
 */
export function hasPlaceholder(inputString) {
    return placeholderRegExp.test(inputString);
}

/**
 * Extracts element placeholder from a string,
 * along with the surrounding content.
 *
 * @example extractPlaceholderContent('Before content {{foo_1}} middle content {{bar_12}} after content');
 * returns ['Before content ', '{{foo_1}}', ' middle content ', '{{bar_12}}', ' after content']
 *
 * @param {String} inputString
 * @returns {Boolean} true if the input contains one or more placeholders
 */
export function extractPlaceholderContent(inputString) {
    return inputString.split(placeholderRegExp).filter(Boolean);
}
