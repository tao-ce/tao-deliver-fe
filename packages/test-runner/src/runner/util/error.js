// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * @typedef {Object} AdditionalErrorInfo
 * @property {Boolean} unhandledPromiseRejection - error was caught by window 'unhandledrejection' listener
 * @property {Boolean} edgeReadAloud - try to check if "Read aloud" tool of Edge browser was used on the page.
 * @property {Boolean} fromSvelte - can't be detected for certain! Just some DOM modification errors which were noticed to come from svelte in existing error logs
 */
/**
 * Add `additionalInfo: AdditionalErrorInfo` property to the error, about environment it happened in.
 * @param {Error|*} err
 * @param {Object?} options
 */
export function setAdditionalErrorInfo(err, options) {
    if (err instanceof Error) {
        const additionalInfo = {};

        if (options?.unhandledPromiseRejection) {
            additionalInfo.unhandledPromiseRejection = true;
        }

        const msg = (typeof err.message === 'string' ? err.message : '').toLowerCase();
        //cases seen so far, thrown by `node_modules/svelte/internal/index.mjs`:
        //  - DOMException/Error: Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.
        //  - TypeError: Cannot read properties of null (reading 'insertBefore')
        //  - TypeError: Cannot read properties of undefined (reading 'forEach')
        const maybeSvelteException =
            msg.includes('insertbefore') && (msg.includes('cannot read properties of') || msg.includes('node'));
        //a) <msreadout> elements are added while reading, but they are removed after reading finishes.
        //b) <style> tag containing 'msreadout-line-highlight/msreadout-word-highlight' styles
        //   are added to the page once user toggles the tool, and are not removed after reading finishes
        const maybeEdgeReadAloud =
            !!document.querySelector('msreadoutspan') ||
            [...document.querySelectorAll('style')].some(i => i.innerHTML.includes('msreadout'));

        if (maybeEdgeReadAloud) {
            additionalInfo.edgeReadAloud = true;
        }
        if (maybeSvelteException) {
            additionalInfo.fromSvelte = true;
        }
        if (maybeEdgeReadAloud && maybeSvelteException) {
            err.recoverable = true;
        }

        if (Object.keys(additionalInfo).length) {
            err.additionalInfo = additionalInfo;
        }
    }
}
