// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { writable, get } from 'svelte/store';
import { generateElementId } from '@oat-sa-private/ui-core';
import { checkItemSubmission } from '../session/attempt.js';
import { DeferredPromise } from '@oat-sa-private/tao-item-runner-qtinui/src/runner/interactions/util/promise.js'; //TODO: move to `ui-core` or `common`
import {
    confirmSkipConfig,
    confirmSubmitConfig,
    confirmUnsavedAttemptConfig,
    alertProctorTerminateTestConfig,
    alertProctorResetConfig,
    alertProctorPauseConfig,
    alertInvalidConfig,
    alertRequiredConfig,
    confirmTimerTimeoutConfig,
    actions,
    securityConfig
} from './navigationFeedbackConfigs.js';
import { isLeavingTestPart } from '../util/movement.js';
import { getConfigStore } from '../config/configStore.js';

const feedbackStores = new Map();

/**
 * Set of conditions defining which dialog it is
 * @typedef {Object} ShowNavigationFeedbackArgs
 * @property {Boolean?} isRequiredAndNotAnswered
 * @property {Boolean?} isAnsweredAndInvalid
 * @property {Boolean?} isSubmitTestPart
 * @property {Boolean?} isSkipOnLinearTest
 * @property {Boolean?} isSkipOnNonLinearTestWithChanges
 * @property {Boolean?} isTerminatedByProctor
 * @property {Boolean?} isResetByProctor
 * @property {Boolean?} isPausedByProctor
 * @property {Boolean?} isSecurity
 * @property {String?} pluginName
 */
/**
 * Check if will need to show a dialog to block the navigation
 * @param {Object} args
 * @param {Boolean} args.submitResponse
 * @param {Object} args.itemState - e.g. { RESPONSE: { response: {}, validity: false, ...<otherKeys> } }
 * @param {Object} args.itemResponses - e.g. { RESPONSE: { response: {}, validity: false } }
 * @param {Boolean} args.allowSkipping
 * @param {Boolean} args.validateResponses
 * @param {Number} args.submissionMode
 * @param {Boolean} args.isLinear
 * @param {Boolean} args.isAnswerChanged
 * @param {Boolean} args.isTimerTimeout
 * @param {Object} args.moveParams {direction, scope, ref}
 * @param {Object} args.testContext
 * @param {Object} args.testMap
 * @returns {ShowNavigationFeedbackArgs?} - null if no feedback; otherwise set of conditions defining which dialog it is
 */
export function checkNavigationFeedback({
    submitResponse,
    itemState,
    itemResponses,
    allowSkipping,
    validateResponses,
    submissionMode,
    isLinear,
    isAnswerChanged,
    isTimerTimeout,
    moveParams,
    testContext,
    testMap
}) {
    let isRequiredAndNotAnswered = false;
    let isAnsweredAndInvalid = false;
    let isSubmitTestPart = false;
    let isSkipOnLinearTest = false;
    let isSkipOnNonLinearTestWithChanges = false;

    if (submitResponse) {
        const { canSkip, canSubmit } = checkItemSubmission(
            itemState,
            itemResponses,
            allowSkipping,
            validateResponses,
            submissionMode
        );
        isRequiredAndNotAnswered = !canSkip;
        isAnsweredAndInvalid = !canSubmit;
    } else {
        isSkipOnLinearTest = isLinear;
        isSkipOnNonLinearTestWithChanges = !isLinear && isAnswerChanged;
    }

    const isLeavingPart = isLeavingTestPart(
        testMap,
        testContext.itemPosition,
        moveParams.direction,
        moveParams.scope,
        moveParams.ref
    );
    isSubmitTestPart = isLeavingPart;
    const needFeedback =
        isRequiredAndNotAnswered ||
        isAnsweredAndInvalid ||
        isSubmitTestPart ||
        isSkipOnLinearTest ||
        isSkipOnNonLinearTestWithChanges;

    if (needFeedback && !isTimerTimeout) {
        return {
            isRequiredAndNotAnswered,
            isAnsweredAndInvalid,
            isSubmitTestPart,
            isSkipOnLinearTest,
            isSkipOnNonLinearTestWithChanges
        };
    }
    return null;
}

/**
 * Get config (title, text, buttons) of a dialog that will block the navigation.
 * @param {ShowNavigationFeedbackArgs} feedbackTypeArgs - set of conditions defining which dialog it is
 * @param {Object} args - other data to pass to feedback creator
 * @param {Object} [args.testMap]
 * @param {Object} [args.testPart]
 * @param {Object} [args.currentItem]
 * @param {Boolean} [args.lastPartInTest]
 * @param {Boolean} [args.linearPart]
 * @param {String} [args.timedOutScope]
 * @param {Boolean} [args.timeLeftInPart]
 * @param {Boolean} [args.timeLeftAheadInPart]
 * @param {Boolean} [args.timersExistForContext]
 * @param {Object} [args.testRunnerPlugins]
 * @returns {import('./navigationFeedbackConfigs.js').DialogConfig?} - dialog config; null if no config found
 */
export function getNavigationFeedbackConfig(
    feedbackTypeArgs,
    {
        testMap,
        testPart,
        currentItem,
        lastPartInTest,
        linearPart,
        timedOutScope,
        timeLeftInPart,
        timeLeftAheadInPart,
        timersExistForContext,
        testRunnerPlugins
    } = {}
) {
    let config;

    const {
        isRequiredAndNotAnswered,
        isAnsweredAndInvalid,
        isSubmitTestPart,
        isSkipOnLinearTest,
        isSkipOnNonLinearTestWithChanges,
        isTerminatedByProctor,
        isResetByProctor,
        isPausedByProctor,
        isTimerTimeout,
        isSecurity,
        pluginName
    } = feedbackTypeArgs;

    if (isAnsweredAndInvalid) {
        config = alertInvalidConfig();
    } else if (isRequiredAndNotAnswered) {
        config = alertRequiredConfig();
    } else if (isSubmitTestPart) {
        config = confirmSubmitConfig(testMap, testPart);
    } else if (isSkipOnLinearTest) {
        config = confirmSkipConfig(currentItem);
    } else if (isSkipOnNonLinearTestWithChanges) {
        config = confirmUnsavedAttemptConfig(currentItem);
    } else if (isTerminatedByProctor) {
        config = alertProctorTerminateTestConfig();
    } else if (isResetByProctor) {
        config = alertProctorResetConfig();
    } else if (isPausedByProctor) {
        config = alertProctorPauseConfig(timersExistForContext);
    } else if (isTimerTimeout) {
        config = confirmTimerTimeoutConfig({
            timedOutScope,
            timeLeftInPart,
            timeLeftAheadInPart,
            lastPartInTest,
            linearPart
        });
    } else if (isSecurity) {
        config = securityConfig(pluginName, testRunnerPlugins);
    } else {
        config = null;
    }

    return config;
}

/**
 * Show a dialog to block the navigation.
 * @param {ShowNavigationFeedbackArgs} feedbackTypeArgs - set of conditions defining which dialog it is
 * @param {import('./navigationFeedbackConfigs.js').DialogConfig} feedbackConfig
 * @returns {Promise<Boolean>} proceed - 'true' if should continue navigaton, 'false' if should stay in the same place
 */
export function showNavigationFeedback(feedbackTypeArgs, feedbackConfig) {
    return showFeedback(feedbackTypeArgs, feedbackConfig).then(action => {
        if (action === actions.flowCancelled) {
            return { cancelled: true };
        }
        return { proceed: action === actions.proceed };
    });
}

/**
 * Show feedback dialog according to passed configuration and return result of dialog call.
 * This only mounts/unmounts dialog component; sessionStatus changes should be handled outside.
 * @param {ShowNavigationFeedbackArgs} feedbackTypeArgs
 * @param {import('./navigationFeedbackConfigs.js').DialogConfig} config - dialog config in a format accepted by FeedbackDialog component
 * @returns {Promise<String>} resolves with 'action': key of button that was clicked, or 'cancel' if dialog was closed without clicking button
 */
export function showFeedback(feedbackTypeArgs, config) {
    const serviceCallId = getConfigStore().get().serviceCallId;
    const feedbackStore = getNavigationFeedbacksStore(serviceCallId);
    const key = generateElementId('feedback');
    const deferredPromise = new DeferredPromise();
    const onDone = function (e) {
        feedbackStore.update(stored => {
            stored.feedbacksArray = stored.feedbacksArray.filter(entry => entry.key !== key);
            return stored;
        });
        deferredPromise.resolve(e.detail.action);
    };
    feedbackStore.update(stored => {
        stored.feedbacksArray.push({ key, feedbackTypeArgs, config, onDone, deferredPromise });
        return stored;
    });
    return deferredPromise.promise;
}

/**
 * Get an existing or create a new feedback store
 * @param {String} serviceCallId
 * @returns {SvelteStore}
 */
export function getNavigationFeedbacksStore(serviceCallId) {
    if (!serviceCallId) {
        throw new TypeError('serviceCallId must be provided');
    }
    let feedbackStore;
    if (feedbackStores.has(serviceCallId)) {
        feedbackStore = feedbackStores.get(serviceCallId);
    } else {
        feedbackStore = createNavigationFeedbacksStore();
        feedbackStores.set(serviceCallId, feedbackStore);
    }
    return feedbackStore;
}

/**
 * Clear all feedback stores
 */
export function clearAllNavigationFeedbacksStores() {
    // eslint-disable-next-line no-unused-vars
    for (const [mapkey, feedbackStore] of feedbackStores) {
        feedbackStore.clear();
    }
    feedbackStores.clear();
}

/**
 * Describes single feedback data stored in `navigationFeedbacksStore`
 * @typedef {Object} FeedbacksStoreItem
 * @property {String} key
 * @property {ShowNavigationFeedbackArgs} feedbackTypeArgs - what is the purpose of this feedback
 * @property {Object} config - for internal use by feedback component (rendering data)
 * @property {String} config.type - if `security`, then this us a feedback with another 'blocking' design used by security plugin
 * @property {Function} onDone - for internal use by feedback component (button callback)
 * @property {Object} deferredPromise - `{promise, resolve, reject}` object to subsribe to feedback flow or to control it from outside
 */
/**
 * Describes data stored in `navigationFeedbacksStore`
 * @typedef {Object} FeedbacksStoreObject
 * @property {Array<FeedbacksStoreItem>} feedbacksArray
 */
/**
 * Create a feedback store instance.
 * When an element is added to the store, corresponding feedback component will be rendered.
 *
 * @returns {Observable<*>} the store
 */
function createNavigationFeedbacksStore() {
    const { subscribe, set, update } = writable({ feedbacksArray: [] });
    return {
        subscribe,
        update,
        set,
        /**
         * @returns {FeedbacksStoreObject}
         */
        get() {
            return get(this);
        },

        /**
         * Simply clears the store.
         * Does not resolve feedback promises (`feedbacksArray[i].deferredPromise`)
         */
        clear() {
            set({ feedbacksArray: [] });
        },

        /**
         * Force close of currently rendered feedbacks.
         * By default, all feedbacks are closed.
         * @param {Function?} filterCallback - specifiy which feedbacks to close: `(feedbacksArrayItem: object) => boolean`
         */
        cancel(filterCallback = null) {
            this.update(stored => {
                const toCancel = this.get().feedbacksArray.filter(i => !filterCallback || filterCallback(i));
                for (const { deferredPromise } of toCancel) {
                    deferredPromise.resolve(actions.flowCancelled);
                }
                stored.feedbacksArray = stored.feedbacksArray.filter(i => !toCancel.includes(i));
                return stored;
            });
        },

        /**
         * Disable all buttons in one or more feedback dialogs
         * @param {Function?} filterCallback - specifiy which feedbacks to affect: `(feedbacksArrayItem: object) => boolean`
         */
        disableButtons(filterCallback = null) {
            this.update(stored => {
                const toUpdate = stored.feedbacksArray.filter(i => !filterCallback || filterCallback(i));
                toUpdate.forEach(fb => {
                    fb?.config?.buttons?.forEach(btn => (btn.disabled = true));
                });
                return stored;
            });
        },

        /**
         * Enable all buttons in one or more feedback dialogs
         * @param {Function?} filterCallback - specifiy which feedbacks to affect: `(feedbacksArrayItem: object) => boolean`
         */
        enableButtons(filterCallback = null) {
            this.update(stored => {
                const toUpdate = stored.feedbacksArray.filter(i => !filterCallback || filterCallback(i));
                toUpdate.forEach(fb => {
                    fb?.config?.buttons?.forEach(btn => (btn.disabled = false));
                });
                return stored;
            });
        },

        /**
         * If any feedbacks are currently rendered
         * @returns {Boolean}
         */
        isAnyShown() {
            return this.get().feedbacksArray.length > 0;
        },

        /**
         * If any security message are currently rendered
         * @returns {Boolean}
         */
        isSecurityShown() {
            return this.isAnyShown() && !!this.get().feedbacksArray.find(f => f.config && f.config.type === 'security');
        },

        /**
         * If any timeout messages are currently rendered
         * @returns {Boolean}
         */
        isTimeoutShown() {
            return this.isAnyShown() && !!this.get().feedbacksArray.find(f => f.config && f.config.type === 'timeout');
        }
    };
}
