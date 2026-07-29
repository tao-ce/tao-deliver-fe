// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';
import { isLastPartOfTest, countOfIncompleteOrUnseenItems } from '../util/testPart.js';

/**
 * Possible actions for navigation feedback close buttons.
 * 'cancel' is default action which will also be fired on dialog close.
 * 'flowCancelled' is not for buttons, but for when then system needs to cancel dialog flow.
 */
export const actions = Object.freeze({
    cancel: 'cancel',
    proceed: 'proceed',
    flowCancelled: 'flowCancelled'
});

/**
 * Describes dialog button in a format expected by NavigationFeedback component
 * @typedef {Object} ButtonConfig
 * @property {String} key - identifier of action. Must belong to 'actions' enum.
 * @property {String} skin - 'primary'/'secondary'
 * @property {String} label - text
 * @property {String} dataTestId - test hook
 * @property {Boolean?} fullwidth - for long text
 * @property {Boolean?} initialFocus - if this is the default action
 */

/**
 * Describes dialog content
 * @typedef {Object} DialogConfig
 * @property {String} heading - heading text
 * @property {String|String[]} message - message text; array if multiline
 * @property {ButtonConfig[]} buttons - array of button objects
 * @property {String?} type - type of dialog
 */
/**
 * 'Confirm submit test or test part' dialog configuration
 * @param {Object} testMap - testMap object from store
 * @param {Object} testPart - current testPart object from store
 * @returns {DialogConfig}
 */
export function confirmSubmitConfig(testMap, testPart) {
    const isLinear = testPart.isLinear;
    const isLastPart = isLastPartOfTest(testPart, testMap);
    const incompleteCount = countOfIncompleteOrUnseenItems(testPart);

    const heading = isLastPart
        ? __('You have reached the end of the test. Are you sure you want to submit the test for scoring?')
        : __('Are you sure you want to submit this part and proceed to the next one?');

    let message = '';
    if (!isLinear) {
        if (incompleteCount === 0) {
            message = __("You won't be able to go back to review or change your answers after submission.");
        } else {
            message = isLastPart
                ? __(
                    "You still have %d incomplete questions. If you submit the test you won't be able to go back to complete unanswered questions or change your answers.",
                    incompleteCount
                )
                : __(
                    "You still have %d incomplete questions. If you submit this part you won't be able to go back to complete unanswered questions or change your answers.",
                    incompleteCount
                );
        }
    }

    let buttons;
    if (isLinear || incompleteCount === 0) {
        buttons = [
            {
                key: actions.cancel,
                skin: 'secondary',
                label: __('Review my answers'),
                dataTestId: 'cancel'
            },
            {
                key: actions.proceed,
                skin: 'primary',
                label: isLastPart ? __('Submit the Test') : __('Submit and proceed'),
                dataTestId: 'submitpart',
                initialFocus: true
            }
        ];
    } else {
        buttons = [
            {
                key: actions.proceed,
                skin: 'secondary',
                label: isLastPart ? __('Submit the Test') : __('Submit and proceed'),
                dataTestId: 'submitpart'
            },
            {
                key: actions.cancel,
                skin: 'primary',
                label: __('Keep answering'),
                dataTestId: 'cancel',
                initialFocus: true
            }
        ];
    }

    return { heading, message, buttons };
}

/**
 * 'Confirm skip' dialog configuration
 * @param {Object} item - current item object from store
 * @returns {DialogConfig}
 */
export function confirmSkipConfig(item) {
    const countOfRemainingAttempts = item.remainingAttempts;

    const heading = __('Are you sure you want to skip this question?');
    const message = __(
        "You still have %d attempts left. You won't be able to change your answer later if you skip this question.",
        countOfRemainingAttempts
    );
    const buttons = [
        {
            key: actions.cancel,
            skin: 'secondary',
            label: __('Keep attempting'),
            dataTestId: 'keepattempting'
        },
        {
            key: actions.proceed,
            skin: 'primary',
            label: __('Skip the question'),
            dataTestId: 'skipquestion',
            initialFocus: true
        }
    ];

    return { heading, message, buttons };
}

/**
 * 'Confirm navigating away with unsaved attempt' dialog configuration
 * @param {Object} item - current item object from store
 * @returns {DialogConfig}
 */
export function confirmUnsavedAttemptConfig(item) {
    const hasNoAttempts = item.maxAttempts === item.remainingAttempts;

    const heading = hasNoAttempts
        ? __('You have not made any attempt yet with your answer.')
        : __('You have changed your answer since your last attempt.');

    const message = __('If you move away your last answer will be lost when you come back.');

    const buttons = [
        {
            key: actions.cancel,
            skin: 'secondary',
            label: __('Stay'),
            dataTestId: 'cancel'
        },
        {
            key: actions.proceed,
            skin: 'primary',
            label: __('Move away'),
            dataTestId: 'moveaway',
            initialFocus: true
        }
    ];

    return { heading, message, buttons };
}

/**
 * 'Notify about invalid answers' dialog configuration
 * @returns {DialogConfig}
 */
export function alertInvalidConfig() {
    const countOfInteractions = 1;
    const countOfInvalidAnswers = 1;

    const heading =
        countOfInteractions > 1 ? __('Your answer or parts of it are not valid.') : __('Your answer is not valid.');

    const message =
        countOfInteractions > 1
            ? __(
                  'You have %d invalid answers out of %d. Please provide valid answers before proceeding.',
                  countOfInvalidAnswers,
                  countOfInteractions
              )
            : __('Please provide a valid answer.');

    const buttons = [
        {
            key: actions.cancel,
            skin: 'primary',
            label: __('Ok'),
            dataTestId: 'invalidanswer'
        }
    ];

    return { heading, message, buttons };
}

/**
 * 'Notify about required not answered' dialog configuration
 * @returns {DialogConfig}
 */
export function alertRequiredConfig() {
    const heading = __('An answer is required before leaving this question.');

    const message = __('You will be able to navigate away once you answer the question.');

    const buttons = [
        {
            key: actions.cancel,
            skin: 'primary',
            label: __('Ok'),
            dataTestId: 'answerrequired'
        }
    ];

    return { heading, message, buttons };
}

/**
 * Notify about Proctor terminating the test
 * @returns {DialogConfig}
 */
export function alertProctorTerminateTestConfig() {
    const heading = __('Test terminated');
    const message = __('Your test has been terminated by the proctor and your answers have been submitted.');
    const buttons = [
        {
            key: actions.proceed,
            skin: 'primary',
            label: __('I understand'),
            dataTestId: 'proctor-terminated',
            initialFocus: true
        }
    ];

    return { heading, message, buttons };
}

/**
 * Notify about Proctor reset of the test
 * @returns {DialogConfig}
 */
export function alertProctorResetConfig() {
    const heading = __('You need to restart the test');
    const message = __('The administrator reset your test, you need to start again.');
    const buttons = [
        {
            key: actions.proceed,
            skin: 'primary',
            label: __('Restart now'),
            dataTestId: 'proctor-reset',
            initialFocus: true
        }
    ];

    return { heading, message, buttons };
}

/**
 * Notify about Proctor pausing the test
 * @param {Boolean} timersExistForContext
 * @returns {DialogConfig}
 */
export function alertProctorPauseConfig(timersExistForContext) {
    const heading = __('Test paused');
    const message = timersExistForContext
        ? __('Your test and its timer have been paused by proctor.')
        : __('Your test has been paused by the proctor.');
    const buttons = [
        {
            key: actions.proceed,
            skin: 'primary',
            label: __('OK'),
            dataTestId: 'proctor-paused',
            initialFocus: true
        }
    ];

    return { heading, message, buttons };
}

/**
 * Notify about timer timeout
 * @param {Object} options
 * @param {String} options.timedOutScope
 * @param {Boolean} [options.timeLeftInPart=false] if the testPart has an item+section with time remaining
 * @param {Boolean} [options.timeLeftAheadInPart=false] if the testPart has an item+section with time remaining ahead of current item
 * @param {Boolean} [options.lastPartInTest=false] if the testPart is the last one
 * @param {Boolean} [options.linearPart=false] if the testPart is linear
 * @param {Boolean} [options.allowLateSubmission=true] not yet implemented
 * @returns {Object}
 */
export function confirmTimerTimeoutConfig(options) {
    const timedOutScope = options.timedOutScope || 'item';
    const timeLeftInPart = options.timeLeftInPart || false;
    const timeLeftAheadInPart = options.timeLeftAheadInPart || false;
    const lastPartInTest = options.lastPartInTest || false;
    const linearPart = options.linearPart || false;

    const buttonDefs = {
        continue: {
            key: actions.proceed,
            skin: 'primary',
            label: __('Continue'),
            dataTestId: 'timeout-continue',
            initialFocus: true
        },
        finishTest: {
            key: actions.proceed,
            skin: 'primary',
            label: __('Finish the test'),
            dataTestId: 'timeout-finish-test',
            initialFocus: true
        },
        submitPart: {
            key: actions.proceed,
            skin: 'primary',
            label: __('Submit this part'),
            dataTestId: 'timeout-submit-part',
            initialFocus: true
        },
        reviewAnswers: {
            key: actions.cancel,
            skin: 'primary',
            label: __('Review my answers'),
            dataTestId: 'timeout-review',
            initialFocus: true
        }
    };

    const makeSecondaryButton = buttonDef => Object.assign({}, buttonDef, { skin: 'secondary', initialFocus: false });

    let heading;
    let message;
    let buttons;

    if (timedOutScope === 'test') {
        heading = __('The time limit for the test has been reached.');

        if (linearPart) {
            buttons = [buttonDefs.finishTest]; // t1
        } else {
            buttons = [makeSecondaryButton(buttonDefs.finishTest), buttonDefs.reviewAnswers]; // t2
        }
    } else if (timedOutScope === 'testPart') {
        if (linearPart) {
            if (lastPartInTest) {
                heading = __('The time limit for the test has been reached.'); // tp1
                buttons = [buttonDefs.finishTest];
            } else {
                heading = __('The time limit for this part has been reached.'); // tp2
                buttons = [buttonDefs.submitPart];
            }
        } else {
            if (lastPartInTest) {
                heading = __('The time limit for the test has been reached.'); // tp3
                message = __(
                    'You are at the end of the test. You can either finish the test or keep reviewing your answers.'
                );
                buttons = [makeSecondaryButton(buttonDefs.finishTest), buttonDefs.reviewAnswers];
            } else {
                heading = __('The time limit for this part has been reached.'); // tp4
                message = __(
                    'You are at the end of this part. You can either submit this part or keep reviewing your answers.'
                );
                buttons = [makeSecondaryButton(buttonDefs.submitPart), buttonDefs.reviewAnswers];
            }
        }
    } else if (timedOutScope === 'section') {
        heading = __('The time limit for this section has been reached.');

        if (linearPart) {
            if (timeLeftAheadInPart) {
                buttons = [buttonDefs.continue]; // s1
            } else {
                // linear no time ahead: as if the whole part timed out
                if (lastPartInTest) {
                    heading = __('The time limit for the test has been reached.'); // s2
                    buttons = [buttonDefs.finishTest];
                } else {
                    heading = __('The time limit for this section has been reached.'); // s3
                    buttons = [buttonDefs.submitPart];
                }
            }
        } else {
            if (timeLeftInPart) {
                if (timeLeftAheadInPart) {
                    buttons = [buttonDefs.continue]; // s4
                } else {
                    if (lastPartInTest) {
                        message = __(
                            'You are at the end of the test. You can either finish the test or keep reviewing your answers.'
                        ); // s5
                        buttons = [makeSecondaryButton(buttonDefs.finishTest), buttonDefs.reviewAnswers];
                    } else {
                        message = __(
                            'You are at the end of this part. You can either submit this part or keep reviewing your answers.'
                        ); // s6
                        buttons = [makeSecondaryButton(buttonDefs.submitPart), buttonDefs.reviewAnswers];
                    }
                }
            } else {
                // last available section in part: as if the whole part timed out
                if (lastPartInTest) {
                    heading = __('The time limit for the test has been reached.'); // s7
                    buttons = [buttonDefs.finishTest];
                } else {
                    heading = __('The time limit for this section has been reached.'); // s8
                    buttons = [buttonDefs.submitPart];
                }
            }
        }
    } else if (timedOutScope === 'item') {
        heading = __('The time limit for this item has been reached.');

        if (linearPart) {
            if (timeLeftAheadInPart) {
                buttons = [buttonDefs.continue]; // i1
            } else {
                // linear no time ahead: as if the whole part timed out
                if (lastPartInTest) {
                    heading = __('The time limit for the test has been reached.'); // i2
                    buttons = [buttonDefs.finishTest];
                } else {
                    heading = __('The time limit for this item has been reached.'); // i3
                    buttons = [buttonDefs.submitPart];
                }
            }
        } else {
            if (timeLeftInPart) {
                if (timeLeftAheadInPart) {
                    buttons = [buttonDefs.continue]; // i4
                } else {
                    if (lastPartInTest) {
                        message = __(
                            'You are at the end of the test. You can either finish the test or keep reviewing your answers.'
                        ); // i5
                        buttons = [makeSecondaryButton(buttonDefs.finishTest), buttonDefs.reviewAnswers];
                    } else {
                        message = __(
                            'You are at the end of this part. You can either submit this part or keep reviewing your answers.'
                        ); // i6
                        buttons = [makeSecondaryButton(buttonDefs.submitPart), buttonDefs.reviewAnswers];
                    }
                }
            } else {
                // last available item in part: as if the whole part timed out
                if (lastPartInTest) {
                    heading = __('The time limit for the test has been reached.'); // i7
                    buttons = [buttonDefs.finishTest];
                } else {
                    heading = __('The time limit for this item has been reached.'); // i8
                    buttons = [buttonDefs.submitPart];
                }
            }
        }
    }

    return {
        heading,
        message,
        buttons,
        type: 'timeout'
    };
}
/**
 * Security message configuration
 * @param {String} pluginName
 * @param {Object} testRunnerPlugins
 * @returns {DialogConfig}
 */
export function securityConfig(pluginName = null, testRunnerPlugins = []) {
    const heading = '';
    // array of security plugins with messages
    const messagesByPlugins = {
        forceFullscreen: __('This test needs to be taken in full screen mode'),
        pauseOnBlur: __('Leaving the test window is not allowed')
    };

    let message = '';
    const plugins = Object.keys(testRunnerPlugins);
    // The test taker is informed via a full overlay modal dialog about the fullscreen and pauseOnBlur:
    // if forceFullscreen:true : “This test needs to be taken in full-screen mode“
    // if forceFullscreen:false and pauseOnBlur: true : “Leaving the test window is not allowed“
    // disableCommands:true and preventScreenshot:true will not show any message
    if (pluginName in messagesByPlugins) {
        message = messagesByPlugins[pluginName];
    } else if (plugins.includes('forceFullscreen')) {
        message = messagesByPlugins.forceFullscreen;
    } else if (plugins.includes('pauseOnBlur')) {
        message = messagesByPlugins.pauseOnBlur;
    }
    return { heading, message, type: 'security' };
}
