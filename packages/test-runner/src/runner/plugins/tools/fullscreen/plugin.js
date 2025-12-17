// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import toolsStoreHandler from '../util/toolsStoreHandler.js';
import fullscreenApiFactory from './fullscreenApi.js';

/**
 * This plugin allows to toggle fullscreen mode on/off.
 */
export default pluginFactory({
    name: 'fullscreen',

    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        this.toolsStoreHandler = toolsStoreHandler(testConfig.serviceCallId, this.getName());

        /**
         * Helper to work with browser fullscreen mode.
         */
        this.browserApi = fullscreenApiFactory();

        /**
         * Toolbar button state (icon and label) depends on whether we are in fullscreen mode or not.
         * So after fullscreen mode was successfully switched on/off, update button.
         */
        this.syncWithBrowser = () => {
            const isBrowserFullscreen = this.browserApi.isFullscreen();
            const isStateFullscreen = this.toolsStoreHandler.get('open') || false;
            if (isBrowserFullscreen !== isStateFullscreen) {
                this.toolsStoreHandler.set('open', isBrowserFullscreen);
            }
        };
    },

    init() {
        if (!this.browserApi.isSupported()) {
            this.hide();
        } else {
            this.getTestRunner().on('toolbaraction.fullscreen', key => {
                if (key === 'fullscreen') {
                    if (!this.browserApi.isFullscreen()) {
                        this.browserApi.enterFullscreen();
                    } else {
                        this.browserApi.exitFullscreen();
                    }
                }
            });
            this.browserApi.addChangeListener(this.syncWithBrowser);
            this.syncWithBrowser();
        }
    },

    /**
     * Show the toolbar button
     */
    show() {
        this.toolsStoreHandler.set('visible', true);
    },

    /**
     * Hide the toolbar button
     */
    hide() {
        if (this.browserApi.isFullscreen()) {
            this.browserApi.exitFullscreen();
        }
        this.toolsStoreHandler.set('visible', false);
    },

    destroy() {
        this.getTestRunner().off('toolbaraction.fullscreen');
        this.browserApi.removeChangeListener(this.syncWithBrowser);
    }
});
