// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2021-2025 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import { __ } from '@oat-sa-private/ui-core';
import { isItemWaitingForExternalScore } from '../../../util/testMap.js';

/**
 * Step progress helper factory
 * @param {Object} [options]
 * @param {Boolean} [options.showScore] Show score state on step or not
 * @returns {Function}
 */
export default function stepProgressHelperFactory(options) {
    const showScore = options && options.showScore;

    /**
     * Maps store data to StepProgress component's step
     * @param {Object} item - Item object from store
     * @param {Boolean} showBookmarkState
     * @param {Number} viewPosition - item position which is shown to the user
     * @returns {Object}  step data in the format of StepProgress component
     */
    return function getStep(item, showBookmarkState, viewPosition) {
        return {
            key: item.position,
            state: getStepState(item),
            icon: getStepIcon(item),
            label: viewPosition,
            ariaLabel: getStepAriaLabel(item, viewPosition)
        };
    };

    /**
     * Maps store data to step icon
     * @param {Object} item - Item object from store
     * @returns {String} icon for StepProgress step
     */
    function getStepIcon(item) {
        return item.informational ? 'info-bare-16' : null;
    }

    /**
     * Maps store data to step aria-label
     * @param {Object} item - Item object from store
     * @param {Number} position
     * @returns {String} aria-label for StepProgress step
     */
    function getStepAriaLabel(item, position) {
        if (item.informational) {
            return __('Informational Item.');
        }

        let ariaLabel = `${__('Question %d.', position)} `;

        switch (getStepState(item)) {
            case 'correct':
                ariaLabel += __('Correct.');
                break;
            case 'incorrect':
                ariaLabel += __('Incorrect.');
                break;
            case 'partial':
                ariaLabel += __('Partial.');
                break;
            case 'completedWaiting':
            case 'visitedWaiting':
                ariaLabel += __('Awaiting manual scoring.');
                break;
            case 'completed':
                ariaLabel += __('Completed.');
                break;
            default:
                ariaLabel += __('Not completed.');
                break;
        }

        return ariaLabel;
    }

    /**
     * Return review state
     * @param {Object} item - Item object from testMap
     * @returns {String|undefined} state name | default state
     */
    function getStepState(item) {
        const { maxScore, score, answered, viewed } = item;

        if (!viewed && !answered) {
            return;
        } else if (!answered) {
            if (isItemWaitingForExternalScore(item)) {
                return 'visitedWaiting';
            }
            return 'visited';
        }

        if (!showScore || !maxScore) {
            return 'completed';
        }

        if (maxScore) {
            if (isItemWaitingForExternalScore(item)) {
                return 'completedWaiting';
            } else if (score === 0) {
                return 'incorrect';
            } else if (maxScore !== score) {
                return 'partial';
            } else {
                return 'correct';
            }
        }
    }
}
