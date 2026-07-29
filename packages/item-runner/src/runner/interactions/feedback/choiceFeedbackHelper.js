// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { __ } from '@oat-sa-private/ui-core';

/**
 * Possible feedback types. Controls wording of feedback message.
 * @enum
 */
export const feedbackTypes = Object.freeze({
    selectChoices: 'selectChoices',
    placeAnswers: 'placeAnswers',
    choices: 'choices',
    associations: 'associations'
});

/**
 * @typedef FeedbackFactoryOptions
 * @property {String} [type] - 'selectChoices' or 'placeAnswers' or 'choices' or 'associations', reflected in returned messages
 * @property {Number} [maxChoices]
 * @property {Number} [minChoices]
 * @property {String} [qtiMaxChoicesMessage] - defined by item author
 * @property {String} [qtiMinChoicesMessage] - defined by item author
 */
/**
 * Function to manage length constraints feedback
 * @callback FeedbackFactoryResult
 * @param {Number} selectedLength
 * @param {boolean} [allowStatusChanging] - allow calculating status
 * @param {string} [statusOverride] - is used instead of calculated status
 * @returns {Object} - { message: string, status: string }
 */
/**
 * Factory for computing feedback messages & statuses.
 * Passed `maxChoices` & `minChoices` should be valid, they won't be adjusted inside this function.
 * If for your use case `maxChoices=total-number-of-choices` is logically equal to `maxChoices=0`, you should pass `0` to this function.
 * @param {FeedbackFactoryOptions} options
 * @returns {FeedbackFactoryResult}
 */
export default function choiceFeedbackFactory(options = {}) {
    if (options.type === feedbackTypes.selectChoices || options.type === feedbackTypes.placeAnswers) {
        return selectPlaceFactory(options);
    }
    return choicesAssociationsFactory(options);
}

/**
 * Factory implementation for 'selectChoices' and 'placeAnswers' types
 * @param {FeedbackFactoryOptions} options
 * @returns {FeedbackFactoryResult}
 */
function selectPlaceFactory({
    type = feedbackTypes.selectChoices,
    maxChoices = -1,
    minChoices = -1,
    qtiMaxChoicesMessage,
    qtiMinChoicesMessage
}) {
    let message = '';
    if (qtiMinChoicesMessage || qtiMaxChoicesMessage) {
        if (minChoices > 0 && maxChoices > 0 && qtiMinChoicesMessage && qtiMaxChoicesMessage) {
            message = `${qtiMinChoicesMessage} ${qtiMaxChoicesMessage}`;
        } else if (minChoices > 0 && qtiMinChoicesMessage) {
            message = qtiMinChoicesMessage;
        } else if (maxChoices > 0 && qtiMaxChoicesMessage) {
            message = qtiMaxChoicesMessage;
        }
    } else {
        const messages =
            type === feedbackTypes.placeAnswers
                ? placeAnswersMessagesFactory(minChoices, maxChoices)
                : selectChoicesMessagesFactory(minChoices, maxChoices);

        if (minChoices === 1 && maxChoices === 1) {
            message = messages.single();
        } else if (minChoices === 1 && maxChoices <= 0) {
            message = messages.single();
        } else if (minChoices <= 0 && maxChoices === 1) {
            //empty
        } else if (minChoices <= 0 && maxChoices > 0) {
            message = messages.atMost();
        } else if (minChoices > 0 && maxChoices <= 0) {
            message = messages.atLeast();
        } else if (minChoices > 0 && maxChoices > 0 && minChoices === maxChoices) {
            message = messages.exactly();
        } else if (minChoices > 0 && maxChoices > 0 && minChoices !== maxChoices) {
            message = messages.fromTo();
        }
    }

    return function setConstraintsFeedback(selectedLength, allowStatusChanging = false, statusOverride = null) {
        return {
            message,
            status: getStatus(minChoices, maxChoices, selectedLength, allowStatusChanging, statusOverride)
        };
    };
}

/**
 * @typedef MessagesCreator
 * @property {Function} single
 * @property {Function} atMost
 * @property {Function} atLeast
 * @property {Function} exactly
 * @property {Function} fromTo
 */
/**
 * Messages for 'selectChoices' type
 * @param {Number} min
 * @param {Number} max
 * @returns {MessagesCreator}
 */
function selectChoicesMessagesFactory(min, max) {
    return {
        single: () => __('An answer is required'),
        atMost: () => __('You can select up to %d choices', max),
        atLeast: () => __('You need to select at least %d choices', min),
        exactly: () => __('You need to select %d choices', min),
        fromTo: () => __('You need to select from %d to %d choices', min, max)
    };
}
/**
 * Messages for 'placeAnswers' type
 * @param {Number} min
 * @param {Number} max
 * @returns {MessagesCreator}
 */
function placeAnswersMessagesFactory(min, max) {
    return {
        single: () => __('An answer is required'),
        atMost: () => __('You can place up to %d answers', max),
        atLeast: () => __('You need to place at least %d answers', min),
        exactly: () => __('You need to place %d answers', min),
        fromTo: () => __('You need to place from %d to %d answers', min, max)
    };
}

/**
 * @param {Number} minChoices
 * @param {Number} maxChoices
 * @param {Number} selectedLength
 * @param {boolean} allowStatusChanging
 * @param {string} statusOverride
 * @returns {String}
 */
function getStatus(minChoices, maxChoices, selectedLength, allowStatusChanging, statusOverride) {
    let status = statusOverride;
    if (!status) {
        // check validity
        let valid = true;
        const choicesAboveMax = maxChoices > 0 && selectedLength > maxChoices;
        const choicesBelowMin = minChoices > 0 && selectedLength < minChoices;
        if (choicesAboveMax || choicesBelowMin) {
            valid = false;
        }
        status = allowStatusChanging && !valid ? 'warning' : 'info';
    }
    return status;
}

/**
 * Factory implementation for 'choices' and 'associations' types
 * @param {FeedbackFactoryOptions} options
 * @returns {FeedbackFactoryResult}
 */
function choicesAssociationsFactory({
    type = feedbackTypes.choices,
    maxChoices = -1,
    minChoices = -1,
    qtiMaxChoicesMessage,
    qtiMinChoicesMessage
}) {
    return function setConstraintsFeedback(selectedLength, allowStatusChanging = false, statusOverride = null) {
        let message = '';
        let key = type;

        if (maxChoices <= 0 && minChoices > 0) {
            message = qtiMinChoicesMessage;
            if (minChoices === 1) {
                key = `${type}_singular`;
            }
            if (!message) {
                message = {
                    choices: __('You must pick at least %d choices', minChoices),
                    choices_singular: __('You must pick at least 1 choice'),
                    associations: __('You must make at least %d associations', minChoices),
                    associations_singular: __('You must make at least 1 association')
                }[key];
            }
        } else if (minChoices <= 0 && maxChoices > 0) {
            message = qtiMaxChoicesMessage;
            if (maxChoices === 1) {
                key = `${type}_singular`;
            }
            if (!message) {
                message = {
                    choices: __('You must pick a maximum of %d choices', maxChoices),
                    choices_singular: __('You must pick a maximum of 1 choice'),
                    associations: __('You must make a maximum of %d associations', maxChoices),
                    associations_singular: __('You must make a maximum of 1 association')
                }[key];
            }
        } else if (minChoices > 0 && maxChoices > minChoices) {
            if (qtiMinChoicesMessage && qtiMaxChoicesMessage) {
                message = `${qtiMinChoicesMessage} ${qtiMaxChoicesMessage}`;
            } else if (qtiMaxChoicesMessage) {
                message = qtiMaxChoicesMessage;
            } else if (qtiMinChoicesMessage) {
                message = qtiMinChoicesMessage;
            } else {
                if (minChoices === 1) {
                    key = `${type}_singular`;
                }
                message = {
                    choices: __('You must pick at least %d choices and a maximum of %d', minChoices, maxChoices),
                    choices_singular: __('You must pick at least 1 choice and a maximum of %d', maxChoices),
                    associations: __(
                        'You must make at least %d associations and a maximum of %d',
                        minChoices,
                        maxChoices
                    ),
                    associations_singular: __('You must make at least 1 association and a maximum of %d', maxChoices)
                }[key];
            }
        } else if (minChoices > 0 && maxChoices === minChoices) {
            if (minChoices === 1) {
                key = `${type}_singular`;
            }
            message = {
                choices: __('You must pick exactly %d choices', minChoices),
                choices_singular: __('You must pick exactly 1 choice'),
                associations: __('You must make exactly %d associations', minChoices),
                associations_singular: __('You must make exactly 1 association')
            }[key];
        }

        if (message.length && !qtiMinChoicesMessage && !qtiMaxChoicesMessage && selectedLength > 0) {
            message = `${message} - ${__('Currently %d', selectedLength)}`;
        }

        return {
            message,
            status: getStatus(minChoices, maxChoices, selectedLength, allowStatusChanging, statusOverride)
        };
    };
}
