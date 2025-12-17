// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Find the list of data-hrefs of text-containing passages (qti-includes) in the current rendered item
 * Depends on the DOM already being loaded
 * @param {Object} itemRunnerData
 * @returns {String[]}
 */
export function getTextItemPassagesHrefs(itemRunnerData = {}) {
    const passageHrefs = Object.keys(
        (itemRunnerData &&
            itemRunnerData.itemData &&
            itemRunnerData.itemData.assets &&
            itemRunnerData.itemData.assets.xinclude) ||
            {}
    );

    // We only want to know about passages which are: 1. currently rendered; 2. not textless
    return passageHrefs.filter(href => {
        const domNode = document.querySelector(`.qti-include[data-href="${href}"]`);
        return domNode && Array.from(domNode.childNodes).some(child => child.nodeType === child.TEXT_NODE);
    });
}
