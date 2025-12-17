// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { ResizeObserver } from '@oat-sa-private/ui-core';

/**
 * Svelte Action to use ResizeObserver on node
 * (svelte's 'bind:clientWidth' doesn't work reliably when browser tab is blurred, and also attaches nested iframe)
 * @example
 * <div use:resizeObserve on:resized />
 * @param {HTMLElement} node - bind ResizeObserver to it
 * @param {Function} callback - 'resize' event handler function
 * @fires 'resized' - with {DOMRect} node's boundingClientRect in detail
 * @returns {Object} - node's lifecycle hooks
 */
export default function resizeObserve(node, callback = () => {}) {
    let resizedEventHandlerCb = callback;

    // workaround for an issue with resize loop because of scrollbar, see TR-3833
    function resizedEventHandler (evt) {
        node.removeEventListener('resized', resizedEventHandler);
        resizedEventHandlerCb(evt);
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                node.addEventListener('resized', resizedEventHandler);
            });
        });
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
        window.requestAnimationFrame(() => {
            const rect = entry.target.getBoundingClientRect();
            node.dispatchEvent(
                new CustomEvent('resized', {
                    detail: rect,
                    bubbles: false
                })
            );
        });
    });

    resizeObserver.observe(node);
    node.addEventListener('resized', resizedEventHandler);

    return {
        update (newCallback) {
            if (typeof newCallback !== 'function') {
                resizedEventHandlerCb = () => {};
                return;
            }
            resizedEventHandlerCb = newCallback;
        },
        destroy() {
            resizeObserver.disconnect();
            node.removeEventListener('resized', resizedEventHandler);
        }
    };
}
