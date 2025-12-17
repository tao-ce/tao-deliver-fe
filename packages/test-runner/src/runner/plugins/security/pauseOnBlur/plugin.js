// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2024 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { debounce, defaults } from 'lodash';
import lifecycle from 'page-lifecycle';
import { getNavigationFeedbackConfig } from 'testRunnerDynamicModulesIndex';
import { showNavigationFeedback, getNavigationFeedbacksStore } from '../../../feedback';
import { isPausedByProctorUiFlow } from '../../../util/proctoring.js';
import { securityLog } from '../common/securityLog.js';
import { runActionInIframesRecursively } from '../common/iframeUtil.js';
import fullscreenApiFactory from '../forceFullscreen/fullscreenApi.js';
import { addHideOnPrintStyle } from '../../tools/print/util.js';
import fullScreenKeyboardInputObserver from '../common/fullscreenInputObserver.js';
import fullscreenFileObserver from '../common/fullscreenFileObserver.js';
import { disableNavReasons } from '../../navigation/navigator/constants.js';

const defaultConfig = {
    autoresume: true,
    threshold: 200 // threshold in ms, while blur is not triggered
};

export default pluginFactory({
    name: 'pauseOnBlur',
    install() {
        const testRunner = this.getTestRunner();
        const testConfig = testRunner.getConfig();
        const serviceCallId = testConfig.serviceCallId;
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = defaults({}, providedConfig, defaultConfig);
        const { autoresume, threshold } = pluginConfig;

        this.navigationFeedbacksStore = getNavigationFeedbacksStore(serviceCallId);

        /**
         * Helper to work with browser fullscreen mode.
         */
        this.browserApi = fullscreenApiFactory();

        this.onBlur = debounce(e => {
            const isSecurityMessage = this.navigationFeedbacksStore.isSecurityShown();
            const isFileOrInputSelection =
                this.fullscreenFileObserver?.isFileSelection() ||
                (this.fullscreenInputObserver && !this.fullscreenInputObserver.isFullScreenAllowed());
            // isSecurityMessage used in order to prevent another modal when it is already opened
            if (
                this.isShowed ||
                this.isInFrame ||
                isSecurityMessage ||
                (e.newState !== 'hidden' && isFileOrInputSelection)
            ) {
                return;
            }
            // onBlur states are 'passive' and 'hidden'
            if (e.newState !== 'active' && !isPausedByProctorUiFlow(testRunner)) {
                const feedbackTypeArgs = { isSecurity: true, pluginName: this.getName() };
                const feedbackConfig = getNavigationFeedbackConfig(feedbackTypeArgs, {
                    testRunnerPlugins: testRunner.getPlugins()
                });
                securityLog(testRunner, 'blur-attempt');

                testRunner.trigger('disablenav', { reason: disableNavReasons.securityOverlay });

                showNavigationFeedback(feedbackTypeArgs, feedbackConfig)
                    .then(feedbackResult => {
                        this.isShowed = false;
                        const isFullscreen = this.browserApi.isFullscreen();
                        testRunner.trigger('security-closed', {
                            plugin: this.getName(),
                            autoresume
                        });
                        testRunner.trigger('enablenav', { reason: disableNavReasons.securityOverlay });

                        if (!feedbackResult.cancelled) {
                            if (!isFullscreen) {
                                this.browserApi.enterFullscreen();
                            }
                        }
                    })
                    .catch(err => {
                        this.isShowed = false;
                        testRunner.trigger('error', err);
                    });

                testRunner.trigger('security-showed', {
                    plugin: this.getName(),
                    autoresume,
                    action: 'pause',
                    category: 'examinee',
                    subcategory: 'navigation',
                    message: 'Test taker left test screen.'
                });
                this.isShowed = true;
            }
        }, threshold);

        this.onIframeFocus = () => {
            this.isInFrame = true;
        };

        this.onIframeBlur = () => {
            this.isInFrame = false;
            // force onBlur state to focus on parent in case iframe blur
            this.onBlur({ newState: 'active' });
        };

        this.addEventListeners = win => {
            const contentDocument = win.contentDocument || win.document;

            if (contentDocument) {
                contentDocument.addEventListener('focus', this.onIframeFocus);
                contentDocument.addEventListener('blur', this.onIframeBlur);
            }
        };
    },
    /**
     * Initialize plugin (called during runner's initialization)
     */
    init() {
        this.isShowed = false;
        this.fullscreenInputObserver = fullScreenKeyboardInputObserver();
        this.fullscreenFileObserver = fullscreenFileObserver();
        lifecycle.addEventListener('statechange', this.onBlur);

        this.addEventListeners(window);
        runActionInIframesRecursively(this.addEventListeners);

        /**
         * Ensure content is not printed.
         * For items where print is enabled, `print` plugin should:
         *    override styles of this class with styles of higher priority, and hide security-modal element
         */
        this.printStyleTag = addHideOnPrintStyle();

        const testRunner = this.getTestRunner();
        testRunner.on(`move.${this.getName()}`, () => {
            testRunner.trigger('enablenav', { reason: disableNavReasons.securityOverlay });
        });
    },
    /**
     * Destroy plugin (called during runner's destruction)
     */
    destroy() {
        lifecycle.removeEventListener('statechange', this.onBlur);
        document.removeEventListener('focus', this.onIframeFocus);
        document.removeEventListener('blur', this.onIframeBlur);
        window.contentDocument?.removeEventListener('focus', this.onIframeFocus);
        window.contentDocument?.removeEventListener('blur', this.onIframeBlur);
        this.printStyleTag?.remove();
        this.onBlur?.cancel();
    }
});
