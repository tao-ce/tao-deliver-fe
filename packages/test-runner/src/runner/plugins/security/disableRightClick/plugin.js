// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { disableContextMenuHandler, disableRightClickHandler, clearClipboardHandler } from './handlers';
import { securityLog } from '../common/securityLog.js';
import { runActionInIframesRecursively } from '../common/iframeUtil.js';

export default pluginFactory({
    name: 'disableRightClick',

    /**
     * Install plugin, set up instance methods
     */
    install() {
        const testRunner = this.getTestRunner();

        /**
         * Handle contextmenu event, and log it
         * @param {MouseEvent} evt
         */
        this.disableContextMenuHandlerWithCallback = evt => {
            disableContextMenuHandler(evt, () => {
                securityLog(testRunner, 'context-menu-call-attempt');
            });
        };

        /**
         * Handle right click event, and log it
         * @param {MouseEvent} evt
         */
        this.disableRightClickHandlerWithCallback = evt => {
            disableRightClickHandler(evt, () => {
                securityLog(testRunner, 'context-menu-call-attempt');
            });
        };

        /**
         * Handle clipboard after copy event, and log it
         * @param {Event} evt
         */
        this.clearClipboardHandlerWithCallback = evt => {
            clearClipboardHandler(evt, () => securityLog(testRunner, 'copy-attempt'));
        };

        this.addEventListeners = win => {
            const contentDocument = win.contentDocument || win.document;

            if (contentDocument) {
                contentDocument.addEventListener('contextmenu', this.disableContextMenuHandlerWithCallback);
                contentDocument.addEventListener('mousedown', this.disableRightClickHandlerWithCallback);
                contentDocument.addEventListener('mouseup', this.disableRightClickHandlerWithCallback);
                // clear buffer on copy if user somehow manages to invoke context menu and actually copy text
                contentDocument.addEventListener('copy', this.clearClipboardHandlerWithCallback);
            }
        };
    },

    /**
     * Initialize plugin (called during runner's initialization)
     */
    init() {
        this.addEventListeners(window);
        runActionInIframesRecursively(this.addEventListeners);
    },

    /**
     * Destroy plugin (called during runner's destruction)
     */
    destroy() {
        document.removeEventListener('contextmenu', this.disableContextMenuHandlerWithCallback);
        document.removeEventListener('mousedown', this.disableRightClickHandlerWithCallback);
        document.removeEventListener('mouseup', this.disableRightClickHandlerWithCallback);
        document.removeEventListener('copy', this.clearClipboardHandlerWithCallback);
    }
});
