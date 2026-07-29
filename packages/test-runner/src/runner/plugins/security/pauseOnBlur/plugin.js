// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { debounce, defaults } from 'lodash';
import lifecycle from 'page-lifecycle';
import { getNavigationFeedbackConfig } from 'testRunnerDynamicModulesIndex';
import { showNavigationFeedback, getNavigationFeedbacksStore } from '../../../feedback';
import { isPausedByProctorUiFlow } from '../../../util/proctoring.js';
import { securityLog } from '../common/securityLog.js';
import { getIframesRecursively } from '../common/iframeUtil.js';
import fullscreenApiFactory from '../forceFullscreen/fullscreenApi.js';
import { addHideOnPrintStyle } from '../../tools/print/util.js';
import fullScreenKeyboardInputObserver from '../common/fullscreenInputObserver.js';
import fullscreenFileObserver from '../common/fullscreenFileObserver.js';
import { disableNavReasons } from '../../navigation/navigator/constants.js';
import FocusSentinel from './FocusSentinel.svelte';
import { mount, unmount } from 'svelte';

const defaultConfig = {
    autoresume: true,
    threshold: 200 // threshold in ms, while blur is not triggered
};
const fullscreenTransitionRecheckTimeout = 500;

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

        this.resetFullscreenTransitionState = ({ cancelFeedback = false } = {}) => {
            clearTimeout(this.fullscreenTransitionTimeout);
            this.fullscreenTransitionTimeout = null;
            this.isShowed = false;

            if (cancelFeedback) {
                this.navigationFeedbacksStore.cancel(feedback => feedback?.feedbackTypeArgs?.pluginName === this.getName());
            }
        };

        this.handleBlurStateChange = (allowFullscreenTransitionRecheck = true) => {
            const newState = this.getCurrentPageState();
            const isFileSelection = this.fullscreenFileObserver?.isFileSelection();
            const isFullscreenBlockedByKeyboardInput =
                this.fullscreenInputObserver && !this.fullscreenInputObserver.isFullScreenAllowed();
            const isRecentKeyboardInputSelection = this.fullscreenInputObserver?.isInputSelectionRecentlyStarted();
            const isSecurityMessage = this.navigationFeedbacksStore.isSecurityShown();
            const isPausedByProctor = isPausedByProctorUiFlow(testRunner);
            const isFullscreen = this.browserApi.isFullscreen();
            const shouldDelayFullscreenTransitionCheck =
                allowFullscreenTransitionRecheck &&
                newState !== 'active' &&
                !isPausedByProctor &&
                this.shouldEnterFullscreen() &&
                document.webkitFullScreenKeyboardInputAllowed === false &&
                !isFullscreen &&
                !this.isShowed &&
                !isSecurityMessage &&
                !isFileSelection &&
                !isFullscreenBlockedByKeyboardInput &&
                !isRecentKeyboardInputSelection;

            if (shouldDelayFullscreenTransitionCheck) {
                // iPad Safari can report a brief blur/hidden state while reopening fullscreen for text input.
                clearTimeout(this.fullscreenTransitionTimeout);
                this.fullscreenTransitionTimeout = setTimeout(() => {
                    this.fullscreenTransitionTimeout = null;
                    this.handleBlurStateChange(false);
                }, fullscreenTransitionRecheckTimeout);
                return;
            }

            if (this.shouldEnterFullscreen() && document.webkitFullScreenKeyboardInputAllowed === false && isFullscreen) {
                return;
            }

            // isSecurityMessage used in order to prevent another modal when it is already opened
            if (
                this.isShowed ||
                isSecurityMessage ||
                isFileSelection ||
                isFullscreenBlockedByKeyboardInput ||
                isRecentKeyboardInputSelection
            ) {
                return;
            }
            // onBlur states are 'passive' and 'hidden'
            if (newState !== 'active' && !isPausedByProctor) {
                const feedbackTypeArgs = { isSecurity: true, pluginName: this.getName() };
                const feedbackConfig = getNavigationFeedbackConfig(feedbackTypeArgs, {
                    testRunnerPlugins: testRunner.getPlugins()
                });
                securityLog(testRunner, 'blur-attempt');

                testRunner.trigger('disablenav', { reason: disableNavReasons.securityOverlay });

                showNavigationFeedback(feedbackTypeArgs, feedbackConfig)
                    .then(feedbackResult => {
                        this.isShowed = false;
                        const isFullscreenAfterFeedback = this.browserApi.isFullscreen();
                        testRunner.trigger('security-closed', {
                            plugin: this.getName(),
                            autoresume
                        });
                        testRunner.trigger('enablenav', { reason: disableNavReasons.securityOverlay });

                        if (!feedbackResult.cancelled) {
                            if (!isFullscreenAfterFeedback && this.shouldEnterFullscreen()) {
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
        };

        this.onBlur = debounce(() => {
            clearTimeout(this.fullscreenTransitionTimeout);
            this.handleBlurStateChange(true);
        }, threshold);

        this.fullscreenEventListener = () => {
            if (this.browserApi.isFullscreen()) {
                clearTimeout(this.fullscreenTransitionTimeout);
                this.fullscreenTransitionTimeout = null;
                this.removeFocusSentinels();
            } else {
                this.addFocusSentinels();
            }
        };

        // Prepare 2 focus sentinel elements to warn about accidental page blurs
        this.addFocusSentinels = () => {
            this.topSentinel =
                this.topSentinel ??
                mount(FocusSentinel, {
                    target: document.body,
                    anchor: document.body.firstChild,
                    props: { isTop: true }
                });
            this.bottomSentinel =
                this.bottomSentinel ??
                mount(FocusSentinel, {
                    target: document.body,
                    props: { isTop: false }
                });
        };

        this.removeFocusSentinels = () => {
            if (this.topSentinel) {
                unmount(this.topSentinel);
                this.topSentinel = null;
            }
            if (this.bottomSentinel) {
                unmount(this.bottomSentinel);
                this.bottomSentinel = null;
            }
        };

        /**
         * Same as 'page-lifecycle\src\Lifecycle.mjs -> getCurrentState()', but checks iframes inside the item content too:
         * In Chrome, when you focus something in iframe, main page keeps focus --> good
         * In Firefox, when you focus something in iframe, main page loses focus --> security dialog gets shown, but it should not.
         * @returns {String} 'hidden/active/passive'
         */
        this.getCurrentPageState = () => {
            if (document.visibilityState === 'hidden') {
                return 'hidden';
            }

            // If iframe is from another origin, it has no 'contentDocument', so we can't understand if it's focused or not,
            //   so check `document.activeElement` in that situation
            // TODO: if focus is inside iframe when user blurs the page, security dialog is not shown, but it should:
            //   - 'statechange' isn't triggered
            //   - `document.activeElement` doesn't change
            let documentHasFocus = document.hasFocus();
            if (!documentHasFocus) {
                const iframes = getIframesRecursively();
                documentHasFocus = iframes.some(i => {
                    if (i.contentDocument) {
                        return i.contentDocument.hasFocus();
                    } else {
                        return i === document.activeElement;
                    }
                });
            }
            if (documentHasFocus) {
                return 'active';
            }

            return 'passive';
        };

        /**
         * @returns {boolean}
         */
        this.shouldEnterFullscreen = () => 'forceFullscreen' in testRunner.getPlugins();
    },

    /**
     * Initialize plugin (called during runner's initialization)
     */
    init() {
        this.isShowed = false;
        this.fullscreenInputObserver = fullScreenKeyboardInputObserver();
        this.fullscreenFileObserver = fullscreenFileObserver();
        lifecycle.addEventListener('statechange', this.onBlur);

        this.browserApi.addChangeListener(this.fullscreenEventListener);

        /**
         * Ensure content is not printed.
         * For items where print is enabled, `print` plugin should:
         *    override styles of this class with styles of higher priority, and hide security-modal element
         */
        this.printStyleTag = addHideOnPrintStyle();

        const testRunner = this.getTestRunner();
        testRunner.on(`move.${this.getName()}`, () => {
            this.resetFullscreenTransitionState({ cancelFeedback: true });
            testRunner.trigger('enablenav', { reason: disableNavReasons.securityOverlay });
        });

        testRunner
            .on(`renderitem.${this.getName()}`, () => {
                this.fullscreenInputObserver.observeFullScreenKeyboardInput(this.browserApi);
            })
            .on(`unloaditem.${this.getName()}`, () => {
                this.resetFullscreenTransitionState();
                this.fullscreenInputObserver?.unsubscribe();
            });

        // Keyboard tabbing works safely in fullscreen (focus cycles from end of page to start),
        // but whenever we are out of fullscreen we'll observe document focus to be able to warn user.
        if (!this.browserApi.isFullscreen()) {
            this.addFocusSentinels();
        }
    },

    /**
     * Destroy plugin (called during runner's destruction)
     */
    destroy() {
        const testRunner = this.getTestRunner();
        testRunner.off(`.${this.getName()}`);

        lifecycle.removeEventListener('statechange', this.onBlur);
        this.printStyleTag?.remove();
        this.onBlur?.cancel();
        this.resetFullscreenTransitionState();
        this.fullscreenInputObserver?.unsubscribe();
        this.removeFocusSentinels();
        this.browserApi.removeChangeListener(this.fullscreenEventListener);
    }
});
