// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2022-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import pluginFactory from 'taoTests/runner/plugin';
import { testSessionStatus } from '../../session/sessionStates.js';
import { getTestSessionStatusStore } from '../../testsStateStore.js';
import { __, humanizeTime } from '@oat-sa-private/ui-core';
import {
    isPausedByProctorExecution,
    updatePausedByProctorExecution,
    isPausedByProctorUiFlow,
    isProctoredSession
} from '../../util/proctoring';
import { showNavigationFeedback, getNavigationFeedbacksStore } from '../../feedback';
import ProctorWait from './ProctorWait.svelte';
import { showNotification } from '@oat-sa-private/ui-components';
import NetworkError from 'core/error/NetworkError';
import { getTimersStore } from '../../timers/timersStore.js';
import { getNavigationFeedbackConfig } from 'testRunnerDynamicModulesIndex';
import { disableNavReasons } from '../navigation/navigator/constants.js';
import { mount, unmount } from 'svelte';

/**
 * the proctoring plugin handles real-time Proctoring ACS actions:
 *  - pause test-runner (temporarily stop execution)
 *  - resume test-runner from paused state
 *  - add extra time for test with timers
 *  - terminate test-runner
 */
export default pluginFactory({
    name: 'proctoring',

    install() {},

    init() {
        const testRunner = this.getTestRunner();
        //socketProxy may be null; then continue to work - events may be triggered by other means (action response errorCode)
        const socketProxy = testRunner.socketProxy;

        if (!isProctoredSession(testRunner.getTestContext())) {
            return;
        }

        const testConfig = testRunner.getConfig();
        const serviceCallId = testConfig.serviceCallId;
        const areaBroker = testRunner.getAreaBroker();
        const testSessionStatusStore = getTestSessionStatusStore(serviceCallId);
        const timersStore = getTimersStore(serviceCallId);
        const navigationFeedbacksStore = getNavigationFeedbacksStore(serviceCallId);

        this.proctorWaitComponent = null;
        this.extraTimeMs = null;
        this.extraTimeStr = null;

        /**
         * Show notification about extra time change
         * @param {String} notificationText
         */
        this.showExtraTimeNotification = notificationText => {
            if (notificationText) {
                showNotification(
                    {
                        title: notificationText,
                        hierarchy: 'neutral',
                        closeable: true
                    },
                    'persistent'
                );
            }
        };

        /**
         * Check browser storage to see if latest extra time change was already shown.
         * If not, show it.
         * @returns {Promise}
         */
        this.showExtraTimeNotificationIfUnshown = async () => {
            const localStore = await testRunner.getPluginStore(this.getName());
            const lastShownExtraTimeMs = await localStore.getItem('extraTimeMs');
            if (lastShownExtraTimeMs !== this.extraTimeMs) {
                this.showExtraTimeNotification(this.extraTimeStr);
            }
            return localStore.setItem('extraTimeMs', this.extraTimeMs);
        };

        /**
         * Subscribe to socket messages from proctoring and fire corresponding test-runner event:
         * @fires proctor-terminate
         * @fires proctor-reset
         * @fires proctor-pause
         * @fires proctor-resume
         * @fires proctor-extratime payload: { extraTimeMs: Number }
         *
         * If messages is received during some transition (item loading etc.),
         *  postpone emitting it until transition finishes with `proctor-socket-subscribe`/`proctor-socket-unsubscribe`.
         * So each test-runner transition (promise like enableItem or showing validation dialog) should implement one of these:
         *   a) Use `proctor-socket-subscribe`/`proctor-socket-unsubscribe` to ensure it won't be interrupted at unexpected time
         *   b) Implement cancellation if test-runner gets into the `pause` state while it executes.
         */
        this.listenToSocketProxy = () => {
            let isSubscribed = true;
            let queuedEvents = [];

            testRunner.on('proctor-socket-subscribe', () => {
                isSubscribed = true;
                if (queuedEvents.length) {
                    queuedEvents.reverse();
                    const terminateEvent = queuedEvents.find(qe => qe[0] === 'proctor-terminate');
                    if (terminateEvent) {
                        queuedEvents = [];
                        testRunner.trigger(...terminateEvent);
                    } else {
                        const resetEvent = queuedEvents.find(qe => qe[0] === 'proctor-reset');
                        if (resetEvent) {
                            queuedEvents = [];
                            testRunner.trigger(...resetEvent);
                        } else {
                            const lastPauseOrResumeEvent = queuedEvents.find(
                                qe => qe[0] === 'proctor-pause' || qe[0] === 'proctor-resume'
                            );
                            if (lastPauseOrResumeEvent) {
                                testRunner.trigger(...lastPauseOrResumeEvent);
                            }
                            const lastExtraTimeEvent = queuedEvents.find(qe => qe[0] === 'proctor-extratime');
                            if (lastExtraTimeEvent) {
                                testRunner.trigger(...lastExtraTimeEvent);
                            }
                            queuedEvents = [];
                        }
                    }
                }
            });
            testRunner.on('proctor-socket-unsubscribe', () => {
                isSubscribed = false;
            });

            socketProxy.on('proctoring-acs-action', msg => {
                const triggerOrQueue = (...args) => {
                    if (isSubscribed) {
                        testRunner.trigger(...args);
                    } else {
                        queuedEvents.push([...args]);
                    }
                };
                switch (msg.action) {
                    case 'pause':
                        triggerOrQueue('proctor-pause');
                        break;
                    case 'resume':
                        triggerOrQueue('proctor-resume');
                        break;
                    case 'terminate':
                        triggerOrQueue('proctor-terminate');
                        break;
                    case 'reset':
                        triggerOrQueue('proctor-reset');
                        break;
                }
                if (typeof msg.extra_time === 'number') {
                    // msg.extra_time is the new absolute value of the test-taker's extra time
                    // i.e. additions and subtractions are made on the backend
                    triggerOrQueue('proctor-extratime', {
                        extraTimeMs: msg.extra_time * 60 * 1000 //minutes to milliseconds; can be 0 or 0.25
                    });
                }
            });
            socketProxy.on('proctoring-acs-action-error', msg => {
                testRunner.trigger('error', new NetworkError(msg));
            });
        };

        /**
         * Mount component for the paused state, set corresponding testSessionStatus,
         * Handle component's "Resume" button click (which is the only way to resume a paused session)
         * @param {Boolean} skipProctorDialog
         */
        this.showProctorWaitScreen = skipProctorDialog => {
            testSessionStatusStore.set(testSessionStatus.proctorwait);

            this.proctorWaitComponent = mount(ProctorWait, {
                target: areaBroker.getMainArea(),
                props: {
                    serviceCallId,
                    extraTimeStr: this.extraTimeStr,
                    hideContent: !skipProctorDialog
                }
            });
            this.proctorWaitComponent.$on('resume', () => {
                testRunner.on('resume.proctorwait', () => {
                    testRunner.off('resume.proctorwait');

                    this.cancelBackupResumePolling();
                    unmount(this.proctorWaitComponent);
                    this.proctorWaitComponent = null;

                    testRunner.trigger('enablenav', { reason: disableNavReasons.proctorWait });

                    const currentItemIdentifier = testRunner.getCurrentItemIdentifier();
                    if (testRunner.getItemState(currentItemIdentifier, 'disabled')) {
                        testSessionStatusStore.set(testSessionStatus.loading);

                        testRunner.on('enableitem.proctorwait', () => {
                            testRunner.off('enableitem.proctorwait');
                            this.showExtraTimeNotificationIfUnshown();
                        });
                        testRunner.enableItem(currentItemIdentifier);
                    } else if (!testRunner.getItemState(currentItemIdentifier, 'loaded')) {
                        testSessionStatusStore.set(testSessionStatus.loading);

                        testRunner.on('renderitem.proctorwait', () => {
                            testRunner.off('renderitem.proctorwait');
                            this.showExtraTimeNotificationIfUnshown();
                        });
                        //= `qti.startItemSession()` - from where `computeNextAction` on `init`->`render` left off
                        testRunner.jump(testRunner.getTestContext().itemPosition);
                    }
                });
                testRunner.resume();
            });
        };

        /**
         * After test-runner was paused with api `testRunner.pause()` method,
         *  set up corresponding ui state: disable item, mount waiting screen component and show feedback dialog
         * @param {Boolean} skipProctorDialog - do not show feedback dialog (if initial paused after page refresh)
         */
        this.startProctorPauseUiFlow = skipProctorDialog => {
            this.extraTimeStr = null;

            testRunner.trigger('timersservice-stop');
            testRunner.trigger('disablenav', { reason: disableNavReasons.proctorWait });
            navigationFeedbacksStore.cancel();

            new Promise(resolve => {
                const currentItemIdentifier = testRunner.getCurrentItemIdentifier();
                if (
                    testRunner.getItemState(currentItemIdentifier, 'loaded') &&
                    !testRunner.getItemState(currentItemIdentifier, 'disabled')
                ) {
                    testRunner.on('disableitem.proctorwait', () => {
                        testRunner.off('disableitem.proctorwait');
                        resolve();
                    });
                    testRunner.disableItem(currentItemIdentifier);
                } else {
                    resolve();
                }
            }).then(() => {
                this.showProctorWaitScreen(skipProctorDialog);
                this.startBackupResumePolling();

                if (!skipProctorDialog) {
                    const testContext = testRunner.getTestContext();
                    const timersExistForContext = timersStore.getTimersForContext(testContext).length > 0;

                    const feedbackTypeArgs = { isPausedByProctor: true };
                    const feedbackConfig = getNavigationFeedbackConfig(feedbackTypeArgs, {
                        timersExistForContext
                    });
                    showNavigationFeedback(feedbackTypeArgs, feedbackConfig)
                        .then(feedbackResult => {
                            if (feedbackResult && feedbackResult.cancelled) {
                                return;
                            }
                            if (this.proctorWaitComponent) {
                                this.proctorWaitComponent.$set({ hideContent: false });
                            }
                        })
                        .catch(err => {
                            testRunner.trigger('error', err);
                        });
                }
            });
        };

        /**
         * If socket is disconnected/disabled, try to receive 'resume/pause' through polling `init` action.
         * If socket is connected, or session is not paused, does nothing.
         */
        this.startBackupResumePolling = () => {
            this.resumePollingInterval = setInterval(() => {
                if (
                    (!socketProxy || !socketProxy.isConnected()) &&
                    isPausedByProctorExecution(testRunner.getTestContext())
                ) {
                    testRunner
                        .getProxy()
                        .callTestAction('init')
                        .then(results => {
                            if (
                                this.resumePollingInterval &&
                                (!socketProxy || !socketProxy.isConnected()) &&
                                isPausedByProctorExecution(testRunner.getTestContext()) &&
                                results &&
                                results.testContext &&
                                !isPausedByProctorExecution(results.testContext)
                            ) {
                                testRunner.trigger('proctor-resume');
                            }
                        })
                        .catch(err => {
                            if (
                                this.resumePollingInterval &&
                                (!socketProxy || !socketProxy.isConnected()) &&
                                isPausedByProctorExecution(testRunner.getTestContext())
                            ) {
                                testRunner.trigger('error', err);
                            }
                        });
                }
            }, 20 * 1000);
        };

        this.cancelBackupResumePolling = () => {
            clearInterval(this.resumePollingInterval);
            this.resumePollingInterval = null;
        };

        testRunner.on('proctor-pause', () => {
            if (!isPausedByProctorExecution(testRunner.getTestContext())) {
                testRunner.setTestContext(updatePausedByProctorExecution(testRunner.getTestContext(), true));
            }
            const currentItemIdentifier = testRunner.getCurrentItemIdentifier();
            if (!isPausedByProctorUiFlow(testRunner)) {
                testRunner.on('pause.proctorwait', () => {
                    testRunner.off('pause.proctorwait');
                    const currentItemIdOnPause = testRunner.getCurrentItemIdentifier();
                    const skipProctorDialog = !testRunner.getItemState(currentItemIdOnPause, 'loaded'); //if from `testRunner.init()`
                    this.startProctorPauseUiFlow(skipProctorDialog);
                });
                testRunner.pause();
            } else if (
                testRunner.getItemState(currentItemIdentifier, 'loaded') &&
                !testRunner.getItemState(currentItemIdentifier, 'disabled')
            ) {
                testRunner.disableItem(currentItemIdentifier);
            }
        });

        testRunner.on('proctor-resume', () => {
            if (!isPausedByProctorExecution(testRunner.getTestContext())) {
                return;
            }
            testRunner.setTestContext(updatePausedByProctorExecution(testRunner.getTestContext(), false));
        });

        testRunner.on('proctor-terminate', () => {
            testRunner.trigger('timersservice-stop'); //testRunner.off('timeout');
            testRunner.off('proctor-pause');
            testRunner.off('proctor-resume');
            testRunner.off('proctor-reset');
            testRunner.off('proctor-terminate');

            navigationFeedbacksStore.cancel();

            // 1. cancel any uploads because these are likely to give errors
            // if they complete and try to update item response after BE resets test session
            testRunner.trigger('itemrunner-cancelAllUploads');

            // 2. unload the item to stop whatever's happening (PCI, media playback, etc.)
            // 3. show termination dialog to user
            // 4. finish
            testRunner.on('unloaditem.proctor-terminate', () => {
                const feedbackTypeArgs = { isTerminatedByProctor: true };
                const feedbackConfig = getNavigationFeedbackConfig(feedbackTypeArgs, {});
                showNavigationFeedback(feedbackTypeArgs, feedbackConfig).finally(() => testRunner.finish());
            });
            testRunner.unloadItem();
        });

        testRunner.on('proctor-reset', () => {
            testRunner.trigger('timersservice-stop'); //testRunner.off('timeout');
            testRunner.off('proctor-pause');
            testRunner.off('proctor-resume');
            testRunner.off('proctor-reset');
            testRunner.off('proctor-terminate'); //terminate has priority, but unsubscribe for simplicity; user'll know after page reloads.

            navigationFeedbacksStore.cancel();

            //to not get cancelled by security plugins; and to not show interacting item while browser is reloading the page
            if (!isPausedByProctorUiFlow(testRunner)) {
                this.showProctorWaitScreen(false);
            }

            // 1. cancel any uploads because these are likely to give errors
            // if they complete and try to update item response after BE resets test session
            testRunner.trigger('itemrunner-cancelAllUploads');

            // 2. unload the item to stop whatever's happening (PCI, media playback, etc.)
            // 3. reset the test runner & item runner states
            // 4. show reset dialog to user
            // 5. proceed with page reload
            testRunner.on('unloaditem.proctor-reset', () => {
                testRunner.trigger('proctor-reset-test');

                const feedbackTypeArgs = { isResetByProctor: true };
                const feedbackConfig = getNavigationFeedbackConfig(feedbackTypeArgs, {});
                showNavigationFeedback(feedbackTypeArgs, feedbackConfig).finally(() =>
                    testRunner.trigger('proctor-reset-test-confirmed')
                );
            });
            testRunner.unloadItem();
        });

        testRunner.on('proctor-extratime', ({ extraTimeMs }) => {
            this.extraTimeMs = extraTimeMs;
            const timeStr = humanizeTime(Math.trunc(extraTimeMs / 1000));
            const extraTimer = timersStore.getTimerFor('extra');
            const extraTimeExisted = extraTimer && extraTimer.timerValue.timeAssigned > 0;
            let extraStr;
            if (extraTimeExisted && extraTimeMs === 0) {
                extraStr = __('Extra time has been removed');
            } else if (extraTimeExisted) {
                extraStr = __('Extra time limit adjusted to %s', timeStr);
            } else if (extraTimeMs > 0) {
                extraStr = __('%s of extra time granted', timeStr);
            }
            this.extraTimeStr = extraStr;

            if (isPausedByProctorUiFlow(testRunner)) {
                //we are in paused flow, show extra on the next resume screen, and notification once that screen is closed
                if (this.proctorWaitComponent) {
                    this.proctorWaitComponent.$set({
                        extraTimeStr: extraStr
                    });
                }
            } else {
                //proctoring event is only used to show notification;
                //actual adding of time is handled in the timers service:
                //  timer messages sent by backend will have 'extra' property filled
                this.showExtraTimeNotificationIfUnshown();
            }
        });

        testRunner.on('security-showed', e => {
            if (!e.autoresume && !isPausedByProctorUiFlow(testRunner)) {
                testRunner.setTestContext(updatePausedByProctorExecution(testRunner.getTestContext(), true));
                testRunner.pause();
                testRunner.trigger('timersservice-stop');

                const currentItemIdentifier = testRunner.getCurrentItemIdentifier();
                if (
                    testRunner.getItemState(currentItemIdentifier, 'loaded') &&
                    !testRunner.getItemState(currentItemIdentifier, 'disabled')
                ) {
                    testRunner.disableItem(currentItemIdentifier);
                }
                // inform backend about pause
                const proxy = testRunner.getProxy();
                proxy.callTestAction('pause', e);
            }
        });
        testRunner.on('security-closed', e => {
            if (!e.autoresume && isPausedByProctorUiFlow(testRunner)) {
                this.showProctorWaitScreen(true);
            }
        });

        if (socketProxy) {
            this.listenToSocketProxy();
        }

        // Process initial extraTime definition so that a Notification will be shown,
        // even if extraTime came not from ACS but from LTI claim
        const extraTimer = timersStore.getTimerFor('extra');
        if (extraTimer?.timerValue?.timeAssigned > 0) {
            testRunner.trigger('proctor-extratime', {
                extraTimeMs: extraTimer.timerValue.timeAssigned
            });
        }
    },

    render() {},

    destroy() {
        this.getTestRunner().off('.proctorwait');

        if (this.proctorWaitComponent) {
            unmount(this.proctorWaitComponent);
        }

        if (this.resumePollingInterval) {
            clearInterval(this.resumePollingInterval);
        }
    }
});
