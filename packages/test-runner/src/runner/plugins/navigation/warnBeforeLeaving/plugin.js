// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

/**
 * Warn the test taker before closing the browser window or leaving the page
 */
import { __ } from '@oat-sa-private/ui-core';
import pluginFactory from 'taoTests/runner/plugin';

/**
 * There's only a few chance to have this message displayed.
 * Most browsers doesn't support custom message anymore.
 * See https://www.chromestatus.com/feature/5349061406228480
 */
const warnMessage = __('Please confirm you want to leave the test.');

/**
 * Plugin factory
 * @returns {Object}
 */
export default pluginFactory({
    /**
     * Plugin name
     * @type {String}
     */
    name: 'warnBeforeLeaving',

    install() {
        /**
         * The `beforeunload` handler
         * @see https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload
         * @param {Event} e
         * @returns {String} the custom message (for some browsers only, just need to be a string)
         */
        this.warnBeforeUnloadListener = e => {
            e.returnValue = warnMessage;
            return warnMessage;
        };
    },

    /**
     * Initialize plugin (called during runner's initialization)
     */
    init() {
        this.getTestRunner()
            .on('renderitem', this.enable)
            // if runner is going into an error state, we don't want our alert to cancel a possible redirection
            .before('error', this.disable)
            // if proctor is resetting the test, we don't want our alert to cancel the page reload
            .on('proctor-reset', this.disable);

        this.enable();
    },

    /**
     * Destroy plugin (called during runner's destruction)
     */
    destroy() {
        this.disable();
    },

    /**
     * Enables the warning
     */
    enable() {
        if (!this.enabled) {
            window.addEventListener('beforeunload', this.warnBeforeUnloadListener);
        }
        this.enabled = true;
    },

    /**
     * Disables the warning
     */
    disable() {
        window.removeEventListener('beforeunload', this.warnBeforeUnloadListener);
        this.enabled = false;
    }
});
