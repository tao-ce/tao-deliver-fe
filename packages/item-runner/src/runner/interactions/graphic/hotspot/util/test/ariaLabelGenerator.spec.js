// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2020 Open Assessment Technologies SA;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License

import ariaInstructions from './../ariaLabelGenerator.js';

describe('check aria label generation', () => {
    test.each([
        [
            null,
            null,
            'unselected toggle button, press enter or space to select, to move to next available option, use the arrow keys'
        ],
        [true, true, 'disabled toggle button, , to move to next available option, use the arrow keys'],
        [
            false,
            false,
            'unselected toggle button, press enter or space to select, to move to next available option, use the arrow keys'
        ],
        [
            false,
            true,
            'selected toggle button, press enter or space to deselect, to move to next available option, use the arrow keys'
        ],
        [true, false, 'disabled toggle button, , to move to next available option, use the arrow keys']
    ])('get lable with default params', (disabled, selected, message) => {
        const ariaLabel = ariaInstructions(disabled, selected);
        expect(ariaLabel).toEqual(message);
    });
});
