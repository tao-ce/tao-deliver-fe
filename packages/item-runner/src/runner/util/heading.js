// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Re rank headings based inside the given element
 * @param {HTMLElement} element - the container
 * @param {number} [reRankBelow=2] - re-rank only if there are headings level below
 */
export function reRankHeadings(element, reRankBelow = 2) {
    const maxLevel = 6;
    if (element instanceof HTMLElement) {
        for (let level = 1; level <= maxLevel; level++) {
            const headings = element.querySelectorAll(`h${level}`);
            const reRank = headings.length;
            if (reRank) {
                for (let heading of headings) {
                    heading.setAttribute('aria-level', level + 1);
                }
            }
            if (!reRank && level >= reRankBelow) {
                break;
            }
        }
    }
}
