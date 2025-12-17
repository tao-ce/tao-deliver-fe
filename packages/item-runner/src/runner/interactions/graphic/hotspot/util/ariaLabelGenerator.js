// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import { __ } from '@oat-sa-private/ui-core';

/**
 * Generate instructions for using hotspot choice as a part of full aria-label
 *
 * @param {boolean} disabled
 * @param {boolean} selected
 * @returns {string} instructions for using in aria-label
 */
export default function ariaInstructions(disabled, selected) {
    const aria = {
        buttonUnselected: __('unselected toggle button'),
        buttonSelected: __('selected toggle button'),
        buttonDisabled: __('disabled toggle button'),
        instructionUnselected: __('press enter or space to select'),
        instructionSelected: __('press enter or space to deselect'),
        instructionKeys: __('to move to next available option, use the arrow keys')
    };
    let buttonLabel = '';
    let instructionLabel = '';

    if (disabled) {
        buttonLabel = aria.buttonDisabled;
    } else {
        buttonLabel = selected ? aria.buttonSelected : aria.buttonUnselected;
        instructionLabel = selected ? aria.instructionSelected : aria.instructionUnselected;
    }

    return [buttonLabel, instructionLabel, aria.instructionKeys].join(', ');
}
