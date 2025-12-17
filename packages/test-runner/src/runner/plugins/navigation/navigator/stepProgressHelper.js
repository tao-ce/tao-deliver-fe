// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020-2022 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';

/**
 * Maps store data to StepProgress component's step
 * @param {Object} item - Item object from store
 * @param {Boolean} showBookmarkState
 * @param {Number} viewPosition - item position which is shown to the user
 * @param {Boolean} isTimedOut
 * @returns {Object}  step data in the format of StepProgress component
 */
export default function getStep(item, showBookmarkState, viewPosition, isTimedOut) {
    return {
        key: item.position,
        state: getStepState(item),
        icon: getStepIcon(item, showBookmarkState, isTimedOut),
        label: viewPosition,
        ariaLabel: getStepAriaLabel(item, viewPosition, isTimedOut)
    };
}

/**
 * Maps store data to step state
 * @param {Object} item - Item object from store
 * @returns {String} state for StepProgress step
 */
function getStepState(item) {
    if (item.informational) {
        if (item.disabled) {
            return 'disabled';
        }
        if (item.viewed) {
            return 'completed';
        } else {
            return null;
        }
    } else {
        if (item.answered) {
            return 'completed';
        }
        if (item.viewed) {
            return 'visited';
        }
        if (item.disabled) {
            return 'disabled';
        } else {
            return null;
        }
    }
}

/**
 * Maps store data to step icon
 * @param {Object} item - Item object from store
 * @param {Boolean} showBookmarkState
 * @param {Boolean} isTimedOut
 * @returns {String} icon for StepProgress step
 */
function getStepIcon(item, showBookmarkState, isTimedOut) {
    if (item.flagged && showBookmarkState) {
        return 'bookmark-12';
    }
    if (isTimedOut) {
        return 'timer-16';
    }
    if (item.informational) {
        return 'info-bare-16';
    }
    return null;
}

/**
 * Maps store data to step aria-label
 * @param {Object} item - Item object from store
 * @param {Number} position
 * @param {Boolean} isTimedOut
 * @returns {String} aria-label for StepProgress step
 */
function getStepAriaLabel(item, position, isTimedOut) {
    let ariaLabels = [];

    if (item.informational) {
        ariaLabels.push(__('Informational Item.'));
        if (item.viewed) {
            ariaLabels.push(__('Seen.'));
        } else {
            ariaLabels.push(__('Not seen.'));
        }
    } else {
        if (item.flagged) {
            ariaLabels.push(__('Bookmarked Question %d.', position));
        } else {
            ariaLabels.push(__('Question %d.', position));
        }
        if (item.answered) {
            ariaLabels.push(__('Completed.'));
        } else if (item.viewed) {
            ariaLabels.push(__('Not completed.'));
        } else {
            ariaLabels.push(__('Not seen.'));
        }
    }

    if (isTimedOut) {
        ariaLabels.push(__('Timed out.'));
    }

    return ariaLabels.join(' ');
}
