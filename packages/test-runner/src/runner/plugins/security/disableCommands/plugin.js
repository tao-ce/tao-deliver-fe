// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import shortcutHelper from 'util/shortcut';
import { getPlatformShortcuts } from './platformShortcuts.js';
import { allowedInInputs } from './shortcuts.js';
import { hasValidTarget, getCopiedText, getPastedText } from './helpers.js';
import { securityLog } from '../common/securityLog.js';

export default pluginFactory({
    name: 'disableCommands',

    install() {
        const testRunner = this.getTestRunner();

        //configuration can include the following flags:
        //canCopy: boolean
        //canPaste: boolean
        //canDragAndDrop: boolean
        //shortcutWhitelist: the array of shortcut descriptors in format
        //{shortcut, platform}
        //if platform is not specified, shortcut will be enabled for all platforms
        const { canCopy, canPaste, canDragAndDrop } = testRunner.getPluginConfig(this.getName()) || {};

        let lastValidCopiedText = '';
        let allowedToDrop = false;

        /**
         * Handles copy and cut functionality
         * @param {ClipboardEvent} e
         */
        this.onCopyCut = e => {
            const preventCopyCut = evt => {
                evt.preventDefault();
                lastValidCopiedText = '';
                testRunner.trigger('prohibited-action', evt.type);
                securityLog(testRunner, `${evt.type}-attempt`);
            };

            //if the canCopy config is provided act based on it
            if (typeof canCopy !== 'undefined') {
                if (canCopy) {
                    const text = getCopiedText(e);
                    lastValidCopiedText = text;
                } else {
                    preventCopyCut(e);
                }
            } else {
                if (hasValidTarget(e)) {
                    const text = getCopiedText(e);
                    lastValidCopiedText = text;
                } else {
                    preventCopyCut(e);
                }
            }
        };

        /**
         * Handles paste functionality
         * @param {ClipboardEvent} e
         */
        this.onPaste = e => {
            const preventPaste = evt => {
                evt.preventDefault();
                testRunner.trigger('prohibited-action', 'paste');
                securityLog(testRunner, 'paste-attempt');
            };

            const text = getPastedText(e);

            //if the canPaste config is provided act based on it
            if (typeof canPaste !== 'undefined') {
                if (!canPaste) {
                    preventPaste(e);
                }
            } else {
                if (
                    text !== lastValidCopiedText &&
                    text !== `$$${lastValidCopiedText}$$` // mathlive format
                ) {
                    preventPaste(e);
                }
            }
        };

        /**
         * Set allowedToDrop flag to true for valid source
         * @param {DragEvent} e
         */
        this.onDragStart = e => {
            if (hasValidTarget(e)) {
                allowedToDrop = true;
            }
        };

        /**
         * Prevent not allowed drops
         * @param {DragEvent} e
         */
        this.onDrop = e => {
            //if the canDragAndDrop config is provided act based on it
            if (typeof canDragAndDrop !== 'undefined') {
                allowedToDrop = canDragAndDrop;
            }
            if (!allowedToDrop) {
                e.preventDefault();
                testRunner.trigger('prohibited-action', 'drop');
            }
            allowedToDrop = false;
        };

        /**
         * Unset allowedToDrop flag
         */
        this.onDragEnd = () => {
            allowedToDrop = false;
        };
    },

    init() {
        const testRunner = this.getTestRunner();
        const { shortcutWhitelist } = testRunner.getPluginConfig(this.getName()) || {};

        // prevent copy paste
        window.addEventListener('copy', this.onCopyCut);
        window.addEventListener('cut', this.onCopyCut);
        window.addEventListener('paste', this.onPaste);

        // prevent drag and drop
        window.addEventListener('dragstart', this.onDragStart);
        window.addEventListener('dragend', this.onDragEnd);
        window.addEventListener('drop', this.onDrop);

        // prevent shortcuts
        this.shortcuts = getPlatformShortcuts(shortcutWhitelist);
        this.shortcuts.forEach(({ shortcut, action }) => {
            shortcutHelper.add(
                shortcut,
                e => {
                    if (!hasValidTarget(e) || !allowedInInputs.includes(shortcut)) {
                        e.preventDefault();
                        testRunner.trigger('prohibited-action', `shortcut: ${shortcut}`);
                        if (action) {
                            securityLog(testRunner, `${action}-attempt`);
                        }
                    }
                },
                { prevent: false }
            );
        });
    },

    destroy() {
        window.removeEventListener('copy', this.onCopyCut);
        window.removeEventListener('cut', this.onCopyCut);
        window.removeEventListener('paste', this.onPaste);

        window.removeEventListener('dragstart', this.onDragStart);
        window.removeEventListener('dragend', this.onDragEnd);
        window.removeEventListener('drop', this.onDrop);

        this.shortcuts.forEach(({ shortcut }) => {
            shortcutHelper.remove(shortcut);
        });
    }
});
