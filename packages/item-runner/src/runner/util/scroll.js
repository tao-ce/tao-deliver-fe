// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Add scroll-shadow when there's content to which user can scroll to.
 * @param {Array<node?, Function?>} nodesWithCallbacks - nodes and callbacks:
 *  callback `scrollShadowClasses: String => void` - if not specified, classes will be toggled by this util.
 * @returns {Function} destroy function
 */
export let addScrollShadows = nodesWithCallbacks => {
    if (!nodesWithCallbacks.some(([el]) => el)) {
        return () => {};
    }

    const detectShadows = (el, callback) => {
        let hasRight = el.scrollLeft < -2;
        let hasLeft = el.scrollLeft > 2 + el.clientWidth - el.scrollWidth;
        // let hasBottom = el.scrollTop < el.scrollHeight - el.clientHeight - 2;
        // let hasTop = el.scrollTop > 2;

        if (callback) {
            callback(hasLeft, hasRight, el.scrollLeft);
        }
    };

    const nodeEntries = new Map();
    for (const [el, callback] of nodesWithCallbacks) {
        if (el) {
            nodeEntries.set(el, {
                detectShadows: () => detectShadows(el, callback)
            });
        }
    }

    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            nodeEntries.get(entry.target)?.detectShadows();
        }
    });

    for (const el of nodeEntries.keys()) {
        resizeObserver.observe(el);

        el.addEventListener('scroll', () => {
            nodeEntries.get(el)?.detectShadows();
        });
    }

    //destroy
    return () => {
        resizeObserver.disconnect();
    };
};
