// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Strips all comments from an HTML string (naïve)
 * @param {String} html
 * @returns {String}
 */
export function decommentify(html = '') {
    return html.replaceAll(/<!--[\s\S]*?-->/g, '');
}
