// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import fullscreenApiFactory from './fullscreenApi.js';
import { isPausedByProctorUiFlow } from '../../../util/proctoring';
import { debounce, defaults } from 'lodash';
import { showNavigationFeedback, getNavigationFeedbacksStore } from '../../../feedback';
import { getNavigationFeedbackConfig } from 'testRunnerDynamicModulesIndex';
import { securityLog } from '../common/securityLog.js';
import { addHideOnPrintStyle } from '../../tools/print/util.js';
import fullScreenKeyboardInputObserver from '../common/fullscreenInputObserver.js';
import fullscreenFileObserver from '../common/fullscreenFileObserver.js';
import { disableNavReasons } from '../../navigation/navigator/constants.js';

const defaultConfig = {
    autoresume: true,
    exitOnFinish: true,
    listenerTimeout: 200, //technical: debounce fullscreen change events by a small value (ms)
    threshold: 0 //allow to exit fullscreen for some time, for example for 3 sec ({threshold: 3000})
};
/**
 * This plugin forces the test runner to be only used in full screen mode.
 */
export default pluginFactory({
    name: 'forceFullscreen',

    install() {
        const testRunner = this.getTestRunner();
        const providedConfig = testRunner.getPluginConfig(this.getName()) || {};
        const pluginConfig = defaults({}, providedConfig, defaultConfig);
        const testConfig = testRunner.getConfig();
        const serviceCallId = testConfig.serviceCallId;

        this.navigationFeedbacksStore = getNavigationFeedbacksStore(serviceCallId);

        /**
         * Helper to work with browser fullscreen mode.
         */
        this.browserApi = fullscreenApiFactory();

        /**
         * Reset feedbacks store
         * Necessary because its state can be wrong if user manipulated DOM
         */
        this.setModalClosed = () => {
            this.navigationFeedbacksStore.cancel(feedback => feedback?.feedbackTypeArgs?.isSecurity);
        };

        /**
         * Listen browser API to detect when fullscreen is off
         * Listen testRunner resume event
         */
        this.eventListener = debounce(() => {
            if (
                !pluginConfig.threshold ||
                pluginConfig.threshold <= pluginConfig.listenerTimeout ||
                this.browserApi.isFullscreen()
            ) {
                this.checkAndForceFullscreen(false);
            } else {
                this.eventListenerDelayed();
            }
        }, pluginConfig.listenerTimeout);

        this.eventListenerDelayed = debounce(
            () => {
                this.checkAndForceFullscreen(false);
            },
            Math.max(pluginConfig.threshold - pluginConfig.listenerTimeout, 0)
        );

        /**
         * When browser print dialog is opened, fullscreen is exited.
         *  - if by Ctrl+P, fullscreen exit is detected before print. (simultaneously? In Safari, security-modal seems to take space and cut item content)
         *  - if by clicking printPlugin's button, fullscreen exit is not detected.
         * Ensure fullscreen after print dialog is closed.
         */
        this.handleAfterPrint = () => {
            //If 'print' plugin toolbar button click (not Ctrl+P, behavior is different for Ctrl+P, use `disableCommands` plugin):
            //  - Firefox: is still in fullscreen
            //  - Chrome/Edge: not in fullscreen, re-enters programmatically
            //      - note: fullscreen is actually exited in `beforeprint`,
            //        so while Print dialog is open, user can switch to other program window and nothing will be detected or logged.
            //  - Safari: not in fullscreen, will not re-enter programmatically, will not log exit-fullscreen-attempt
            //       - note: will log blur-attempt on `beforeprint` if `pauseOnBlur` plugin (but that's the same for FileUpload...)
            const isFullscreen = this.browserApi.isFullscreen();
            if (!isFullscreen) {
                const enterFullscreenPromise = this.browserApi.enterFullscreen() || Promise.resolve();
                enterFullscreenPromise
                    .catch(() => {})
                    .finally(() => {
                        this.checkAndForceFullscreen(false);
                    });
            }
        };

        /**
         * Check if fullscreen is off and force fullscreen after message is shown
         * @param {Boolean} doNotRaiseSecurityEvents
         */
        this.checkAndForceFullscreen = (doNotRaiseSecurityEvents = false) => {
            if (
                this.fullscreenFileObserver?.isFileSelection() ||
                (this.fullscreenInputObserver && !this.fullscreenInputObserver.isFullScreenAllowed())
            ) {
                return;
            }

            const isFullscreen = this.browserApi.isFullscreen();
            const isSecurityMessage = this.navigationFeedbacksStore.isSecurityShown();

            if (isFullscreen && isSecurityMessage) {
                this.navigationFeedbacksStore.cancel();
            } else if (!isFullscreen && !isPausedByProctorUiFlow(testRunner) && !isSecurityMessage) {
                this.navigationFeedbacksStore.cancel();
                this.showMessage(doNotRaiseSecurityEvents);
                if (!doNotRaiseSecurityEvents) {
                    securityLog(testRunner, 'exit-fullscreen-attempt');
                }
            }
        };

        /**
         * Show message
         * @param {Boolean} doNotRaiseSecurityEvents
         */
        this.showMessage = doNotRaiseSecurityEvents => {
            testRunner.trigger('disablenav', { reason: disableNavReasons.securityOverlay });
            const feedbackTypeArgs = { isSecurity: true, pluginName: this.getName() };
            const feedbackConfig = getNavigationFeedbackConfig(feedbackTypeArgs, {
                testRunnerPlugins: testRunner.getPlugins()
            });
            showNavigationFeedback(feedbackTypeArgs, feedbackConfig)
                .then(feedbackResult => {
                    if (!doNotRaiseSecurityEvents) {
                        testRunner.trigger('security-closed', {
                            plugin: this.getName(),
                            autoresume: pluginConfig.autoresume
                        });
                    }
                    testRunner.trigger('enablenav', { reason: disableNavReasons.securityOverlay });

                    if (!feedbackResult.cancelled) {
                        //if cancelled by going to fullscreen by F11
                        // or proctor-pause or proctor-terminate or proctor-reset, do not do anything
                        this.browserApi.enterFullscreen();
                    }
                })
                .catch(err => {
                    testRunner.trigger('error', err);
                });
            if (!doNotRaiseSecurityEvents) {
                testRunner.trigger('security-showed', {
                    plugin: this.getName(),
                    autoresume: pluginConfig.autoresume,
                    action: 'pause',
                    category: 'examinee',
                    subcategory: 'navigation',
                    message: 'Test taker tried to go out from full screen mode.'
                });
            }
        };

        if (pluginConfig.exitOnFinish) {
            let canExitFullscreen = true;
            testRunner
                .on('testfinished.leaveFullscreen', context => {
                    if (context && context.nextDeliveryExecutionUrl) {
                        // in the middle of a test battery, we must keep the fullscreen
                        canExitFullscreen = false;
                    }
                })
                .on('finish.leaveFullscreen', () => {
                    testRunner.off('.leaveFullscreen');
                    if (canExitFullscreen) {
                        this.browserApi.exitFullscreen();
                    }
                });
        }
    },
    /**
     * Initialize plugin (called during runner's initialization)
     */
    init() {
        this.enable();
    },

    /**
     * Destroy plugin (called during runner's destruction)
     */
    destroy() {
        this.disable();
    },

    /**
     * Enable plugin
     */
    enable() {
        const testRunner = this.getTestRunner();

        this.checkAndForceFullscreen(true);
        //as because enable() is called on plugin init, before item being rendered, navigation doesn't get disabled
        //and if fullscreen modal gets removed or hidden, the navigation is enabled under it
        //for this specific case disable navigation once the item has been rendered
        testRunner.on(`renderitem.${this.getName()}.initial`, () => {
            //we have to disable the navigation only under the security modal
            //otherwise it can break the navigation in batteries
            if (this.navigationFeedbacksStore.isSecurityShown()) {
                testRunner.trigger('disablenav', { reason: disableNavReasons.securityOverlay });
            }
            this.getTestRunner().off(`renderitem.${this.getName()}.initial`);
        });

        this.browserApi.addChangeListener(this.eventListener);

        window.addEventListener('afterprint', this.handleAfterPrint);
        this.printStyleTag?.remove();
        this.printStyleTag = addHideOnPrintStyle();

        testRunner
            .on(`move.${this.getName()}`, () => {
                this.setModalClosed();
                testRunner.trigger('enablenav', { reason: disableNavReasons.securityOverlay });
            })
            .on(`enableitem.${this.getName()}`, () => {
                this.checkAndForceFullscreen(false);
            })
            .on(`renderitem.${this.getName()}`, () => {
                this.fullscreenInputObserver = fullScreenKeyboardInputObserver();
                this.fullscreenInputObserver.observeFullScreenKeyboardInput(this.browserApi);

                this.fullscreenFileObserver = fullscreenFileObserver();
                this.fullscreenFileObserver.observeFileInputs(this.browserApi, () => {
                    this.checkAndForceFullscreen(true); // on exit from file selection
                });

                this.checkAndForceFullscreen(false);
            })
            .on(`unloaditem.${this.getName()}`, () => {
                //even if html elements don't exist anymore, call this to reset `isInputSelected/isFileSelected`
                this.fullscreenInputObserver?.unsubscribe();
                this.fullscreenFileObserver?.unsubscribe();
            });
    },
    /**
     * Disable plugin
     */
    disable() {
        this.browserApi.removeChangeListener(this.eventListener);
        window.removeEventListener('afterprint', this.handleAfterPrint);
        this.printStyleTag?.remove();
        this.getTestRunner().off(`.${this.getName()}`);
        this.eventListener?.cancel();
        this.eventListenerDelayed?.cancel();
    }
});
