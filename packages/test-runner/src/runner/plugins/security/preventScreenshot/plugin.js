// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { securityLog } from '../common/securityLog.js';
import { runActionInIframesRecursively } from '../common/iframeUtil.js';

export default pluginFactory({
    name: 'preventScreenshot',

    /**
     * Called when the host is installing the plugins
     */
    install() {
        const testRunner = this.getTestRunner();

        this.isKeyAction = e => (e.metaKey || e.key === 'OS' || e.ctrlKey) && e.shiftKey;
        this.isNotKeyAction = e => (!e.metaKey && e.key !== 'OS' && !e.ctrlKey) || !e.shiftKey;
        this.isPrtScnAction = e => e.key === 'PrintScreen';

        this.unBlur = e => {
            document.body.style = 'filter: none';
            const win = e.currentTarget;
            win.removeEventListener('keyup', this.managePrintScreenShortcut);
            win.removeEventListener('focus', this.unBlur);
            win.removeEventListener('click', this.unBlur);
        };

        this.managePrintScreenButton = e => {
            // Windows - pause on PrtScn
            if (this.isPrtScnAction(e)) {
                navigator.clipboard.writeText('');
                testRunner.trigger('prohibited-key', 'PrintScreen');
                securityLog(testRunner, 'screenshot-attempt');
            }
            // Win Key + PrtScn not covered
        };

        this.managePrintScreenShortcut = e => {
            // For MacOS - blur on Cmd+Shift
            // For Windows - blur on Win+Shift (Win+Shift+S)
            // Firefox on Windows gets (e.key === 'OS') instead of MetaKey for Win key
            // Firefox add Ctrl+Shift+S shotcut

            // keydown event
            if (this.isKeyAction(e)) {
                e.preventDefault();
                testRunner.trigger('prohibited-key', 'Cmd+Shift');
                document.body.style = 'filter: blur(20px)';
                const win = e.currentTarget.defaultView;
                win?.addEventListener('keyup', this.managePrintScreenShortcut);
                win?.addEventListener('focus', this.unBlur);
                win?.addEventListener('click', this.unBlur);
                securityLog(testRunner, 'screenshot-attempt');
            }

            // keyup event
            // Note - When user hits Cmd+Shift+4, they must press any key
            // to remove blur (that is not Cmd+Shift)
            if (this.isNotKeyAction(e)) {
                this.unBlur(e);
            }
        };

        this.addEventListeners = win => {
            const contentDocument = win.contentDocument || win.document;
            if (contentDocument) {
                contentDocument.addEventListener('keyup', this.managePrintScreenButton);
                contentDocument.addEventListener('keydown', this.managePrintScreenShortcut);
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
        this.unBlur({ currentTarget: window.document });
        document.removeEventListener('keydown', this.managePrintScreenShortcut);
        document.removeEventListener('keyup', this.managePrintScreenButton);
    }
});
