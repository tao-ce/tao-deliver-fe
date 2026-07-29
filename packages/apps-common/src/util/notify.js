// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2026 (original work) Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Creates a postMessage notifier to a specific origin
 * @param {string} targetOrigin
 * @returns {function}
 */
export function notifyFactory(targetOrigin) {
    if (!targetOrigin) {
        throw new Error('notifyFactory: targetOrigin is required');
    }

    /**
     * If in an iframe, notify our iframe parent about specified event.
     *
     * @see taoQtiNuiTest/runner/plugins/integration/notify/plugin
     * Originally created there, but also needed at controller level.
     *
     * @param {string} event - name of the event
     * @param {?Object} parameters
     */
    return function notify(event, parameters = {}) {
        window.parent?.postMessage({ event, parameters }, targetOrigin);
    };
}
