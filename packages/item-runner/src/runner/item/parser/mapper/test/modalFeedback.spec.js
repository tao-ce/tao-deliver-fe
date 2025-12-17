// SPDX-FileCopyrightText: 2012-2026 Open Assessment Technologies S.A.
// Copyright (C) 2023 (original work) Open Assessment Technologies SA ;
//
// SPDX-License-Identifier: AGPL-3.0-only OR LicenseRef-TAO-Commercial-License
import modalFeedbackMapper from '../modalFeedback.js';

describe('modalFeedback properties mapper', () => {
    test.each([
        ['positive', 'x-tao-modalFeedback-positive'],
        ['negative', 'x-tao-modalFeedback-negative'],
        ['neutral', void 0]
    ])('extends properties with feedback style: %s', (styleName, cssClass) => {
        const properties = {
            foo: 'bar'
        };
        const element = {
            body: {
                body: `<div class="x-tao-wrapper ${cssClass || ''} x-tao-relatedOutcome-RESPONSE_2">something</div>`
            }
        };
        expect(modalFeedbackMapper.mapProperties(properties, element)).toMatchObject(
            Object.assign({}, properties, { styleClass: cssClass })
        );
    });
});
